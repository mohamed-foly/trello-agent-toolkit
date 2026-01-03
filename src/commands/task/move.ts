import { Command } from 'commander';
import type { TaskMoveOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CacheManager } from '../../core/cache.js';
import { CardService } from '../../services/card.service.js';
import { ListService } from '../../services/list.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

export function registerMoveCommand(parent: Command): void {
  parent
    .command('move <id> <list>')
    .description('Move a task to another list (by list ID, name, or workflow stage)')
    .action(async (id: string, list: string, _options: TaskMoveOptions) => {
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

        const updatedCard = await cardService.moveCard(id, list);

        const outputFormat = globalOptions.format || 'json';
        console.log(format(updatedCard, outputFormat));
      } catch (error) {
        handleError(error);
      }
    });
}
