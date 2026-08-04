import { Command } from 'commander';
import type { TrelloCard } from '../../types/index.js';
import { createCommandContext, withErrorHandling, type Sdk } from '../context.js';

interface MoveOptions {
  from?: string;
  to?: string;
}

interface MoveResult {
  moved: number;
  failed: number;
  cards: { id: string; name: string; success: boolean; error?: string }[];
}

/** Resolves a list by workflow stage, name, or ID — shared with the single-task `task move` command and the MCP server. */
async function resolveListId(
  sdk: Sdk,
  nameOrId: string,
  availableLists: string[]
): Promise<string> {
  const listId = await sdk.services.list.getListIdByNameOrId(nameOrId);
  if (!listId) {
    throw Object.assign(new Error(`List not found: ${nameOrId}`), { availableLists });
  }
  return listId;
}

export function registerMoveCommand(parent: Command): void {
  parent
    .command('move [cardIds...]')
    .description('Move multiple tasks to another list')
    .option('--from <list>', 'Source list name or ID (moves all cards from this list)')
    .option('--to <list>', 'Destination list name or ID (required)')
    .action(
      withErrorHandling(async (cardIds: string[], options: MoveOptions, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);

        if (!options.to) {
          print({ error: true, message: '--to <list> is required' });
          process.exit(1);
        }

        const lists = await sdk.services.list.getAllLists();
        const availableLists = lists.map((l) => l.name);

        let destListId: string;
        try {
          destListId = await resolveListId(sdk, options.to, availableLists);
        } catch (err) {
          print({ error: true, message: (err as Error).message, availableLists });
          process.exit(1);
        }

        let cardsToMove: TrelloCard[];

        if (options.from) {
          let sourceListId: string;
          try {
            sourceListId = await resolveListId(sdk, options.from, availableLists);
          } catch (err) {
            print({ error: true, message: (err as Error).message, availableLists });
            process.exit(1);
          }

          const allCards = await sdk.services.card.getAllCards();
          cardsToMove = allCards.filter((card) => card.idList === sourceListId);
        } else if (cardIds.length > 0) {
          const allCards = await sdk.services.card.getAllCards();
          cardsToMove = allCards.filter((card) => cardIds.includes(card.id));

          if (cardsToMove.length !== cardIds.length) {
            const foundIds = cardsToMove.map((c) => c.id);
            const notFound = cardIds.filter((id) => !foundIds.includes(id));
            print({ error: true, message: `Some cards not found: ${notFound.join(', ')}` });
            process.exit(1);
          }
        } else {
          print({ error: true, message: 'Either provide card IDs or use --from <list>' });
          process.exit(1);
        }

        if (cardsToMove.length === 0) {
          print({ moved: 0, failed: 0, cards: [], message: 'No cards to move' });
          return;
        }

        const result: MoveResult = { moved: 0, failed: 0, cards: [] };

        for (const card of cardsToMove) {
          try {
            await sdk.services.card.moveCard(card.id, destListId);
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

        print(result);
      })
    );
}
