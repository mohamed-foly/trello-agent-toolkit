import { Command } from 'commander';
import type { GlobalOptions, TrelloCard } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CacheManager } from '../../core/cache.js';
import { CardService } from '../../services/card.service.js';
import { ListService } from '../../services/list.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled, debug } from '../../utils/logger.js';

interface MoveOptions extends GlobalOptions {
  from?: string;
  to?: string;
}

interface MoveResult {
  moved: number;
  failed: number;
  cards: { id: string; name: string; success: boolean; error?: string }[];
}

export function registerMoveCommand(parent: Command): void {
  parent
    .command('move [cardIds...]')
    .description('Move multiple tasks to another list')
    .option('--from <list>', 'Source list name or ID (moves all cards from this list)')
    .option('--to <list>', 'Destination list name or ID (required)')
    .action(async (cardIds: string[], options: MoveOptions) => {
      try {
        const globalOptions = parent.parent?.opts() || {};
        if (globalOptions.debug) {
          setDebugEnabled(true);
        }

        if (!options.to) {
          console.log(format({
            error: true,
            message: '--to <list> is required',
          }, globalOptions.format || 'json'));
          process.exit(1);
        }

        const config = await loadConfig(globalOptions);
        const client = new TrelloClient(config);
        const cache = new CacheManager(config);
        const cardService = new CardService(client, cache);
        const listService = new ListService(client, cache);

        const lists = await listService.getAllLists();

        // Resolve destination list
        const destList = lists.find(
          (l) => l.name.toLowerCase() === options.to!.toLowerCase() || l.id === options.to
        );
        if (!destList) {
          console.log(format({
            error: true,
            message: `Destination list not found: ${options.to}`,
            availableLists: lists.map((l) => l.name),
          }, globalOptions.format || 'json'));
          process.exit(1);
        }

        let cardsToMove: TrelloCard[];

        if (options.from) {
          // Move all cards from source list
          const sourceList = lists.find(
            (l) => l.name.toLowerCase() === options.from!.toLowerCase() || l.id === options.from
          );
          if (!sourceList) {
            console.log(format({
              error: true,
              message: `Source list not found: ${options.from}`,
              availableLists: lists.map((l) => l.name),
            }, globalOptions.format || 'json'));
            process.exit(1);
          }

          const allCards = await cardService.getAllCards();
          cardsToMove = allCards.filter((card) => card.idList === sourceList.id);
        } else if (cardIds.length > 0) {
          // Move specific cards by ID
          const allCards = await cardService.getAllCards();
          cardsToMove = allCards.filter((card) => cardIds.includes(card.id));

          if (cardsToMove.length !== cardIds.length) {
            const foundIds = cardsToMove.map((c) => c.id);
            const notFound = cardIds.filter((id) => !foundIds.includes(id));
            console.log(format({
              error: true,
              message: `Some cards not found: ${notFound.join(', ')}`,
            }, globalOptions.format || 'json'));
            process.exit(1);
          }
        } else {
          console.log(format({
            error: true,
            message: 'Either provide card IDs or use --from <list>',
          }, globalOptions.format || 'json'));
          process.exit(1);
        }

        if (cardsToMove.length === 0) {
          console.log(format({
            moved: 0,
            failed: 0,
            cards: [],
            message: 'No cards to move',
          }, globalOptions.format || 'json'));
          return;
        }

        debug(`Moving ${cardsToMove.length} cards to ${destList.name}`);

        const result: MoveResult = {
          moved: 0,
          failed: 0,
          cards: [],
        };

        for (const card of cardsToMove) {
          try {
            await cardService.moveCard(card.id, destList.id);
            result.moved++;
            result.cards.push({ id: card.id, name: card.name, success: true });
          } catch (err) {
            result.failed++;
            result.cards.push({
              id: card.id,
              name: card.name,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const outputFormat = globalOptions.format || 'json';
        console.log(format(result, outputFormat));
      } catch (error) {
        handleError(error);
      }
    });
}
