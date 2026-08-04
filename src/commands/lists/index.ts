import { Command } from 'commander';
import type { GlobalOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CacheManager } from '../../core/cache.js';
import { ListService } from '../../services/list.service.js';
import { CardService } from '../../services/card.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

interface ListWithCount {
  id: string;
  name: string;
  cardCount: number;
}

export function registerListsCommands(program: Command): void {
  program
    .command('lists')
    .description('List all columns/lists on the board with card counts')
    .action(async () => {
      try {
        const globalOptions = program.opts() as GlobalOptions;
        if (globalOptions.debug) {
          setDebugEnabled(true);
        }

        const config = await loadConfig(globalOptions);
        const client = new TrelloClient(config);
        const cache = new CacheManager(config);
        const listService = new ListService(client, cache);
        const cardService = new CardService(client, cache);

        const [lists, cards] = await Promise.all([
          listService.getAllLists(),
          cardService.getAllCards(),
        ]);

        const listsWithCounts: ListWithCount[] = lists.map((list) => ({
          id: list.id,
          name: list.name,
          cardCount: cards.filter((card) => card.idList === list.id).length,
        }));

        const outputFormat = globalOptions.format || 'json';
        console.log(format(listsWithCounts, outputFormat));
      } catch (error) {
        handleError(error);
      }
    });
}
