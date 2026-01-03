import { Command } from 'commander';
import type { TaskListOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CacheManager } from '../../core/cache.js';
import { CardService } from '../../services/card.service.js';
import { ListService } from '../../services/list.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

export function registerListCommand(parent: Command): void {
  parent
    .command('list')
    .description('List all tasks from the board')
    .option('--stage <stage>', 'Filter by workflow stage (todo, inProgress, review, done)')
    .option('--limit <number>', 'Limit number of results', parseInt)
    .action(async (options: TaskListOptions) => {
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

        await listService.getAllLists();

        let cards;
        if (options.stage) {
          cards = await cardService.getCardsByStage(options.stage);
        } else {
          cards = await cardService.getAllCards();
        }

        if (options.limit && options.limit > 0) {
          cards = cards.slice(0, options.limit);
        }

        const outputFormat = globalOptions.format || 'json';
        console.log(format(cards, outputFormat));
      } catch (error) {
        handleError(error);
      }
    });
}
