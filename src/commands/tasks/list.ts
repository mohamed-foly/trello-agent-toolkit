import { Command } from 'commander';
import type { TaskListOptions, TrelloCard } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CacheManager } from '../../core/cache.js';
import { CardService } from '../../services/card.service.js';
import { ListService } from '../../services/list.service.js';
import { format, formatBriefCards } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

interface ExtendedTaskListOptions extends TaskListOptions {
  list?: string;
  listId?: string;
  brief?: boolean;
}

export function registerListCommand(parent: Command): void {
  parent
    .command('list')
    .description('List all tasks from the board')
    .option('--stage <stage>', 'Filter by workflow stage (todo, inProgress, testing, done)')
    .option('--list <name>', 'Filter by list name (e.g., "BackEnd")')
    .option('--list-id <id>', 'Filter by list ID')
    .option('--brief', 'Output concise format (id, name, list, labels only)')
    .option('--limit <number>', 'Limit number of results', parseInt)
    .action(async (options: ExtendedTaskListOptions) => {
      try {
        const globalOptions = parent.parent?.opts() || {};
        if (globalOptions.debug) {
          setDebugEnabled(true);
        }

        const config = await loadConfig(globalOptions);
        const client = new TrelloClient(config);
        const cache = new CacheManager(config);
        const cardService = new CardService(client, cache);
        const listService = new ListService(client, cache);

        const lists = await listService.getAllLists();

        let cards: TrelloCard[];

        if (options.listId) {
          // Filter by list ID directly
          const allCards = await cardService.getAllCards();
          cards = allCards.filter((card) => card.idList === options.listId);
        } else if (options.list) {
          // Filter by list name
          const targetList = lists.find(
            (l) => l.name.toLowerCase() === options.list!.toLowerCase()
          );
          if (!targetList) {
            console.log(format({
              error: true,
              message: `List not found: ${options.list}`,
              availableLists: lists.map((l) => l.name),
            }, globalOptions.format || 'json'));
            process.exit(1);
          }
          const allCards = await cardService.getAllCards();
          cards = allCards.filter((card) => card.idList === targetList.id);
        } else if (options.stage) {
          cards = await cardService.getCardsByStage(options.stage);
        } else {
          cards = await cardService.getAllCards();
        }

        if (options.limit && options.limit > 0) {
          cards = cards.slice(0, options.limit);
        }

        const outputFormat = globalOptions.format || 'json';

        if (options.brief) {
          const briefCards = formatBriefCards(cards, lists);
          console.log(format(briefCards, outputFormat));
        } else {
          console.log(format(cards, outputFormat));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
