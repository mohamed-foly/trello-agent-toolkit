import { Command } from 'commander';
import type { TaskGetOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CacheManager } from '../../core/cache.js';
import { CardService } from '../../services/card.service.js';
import { ListService } from '../../services/list.service.js';
import { format, formatBriefTaskContext } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

interface ExtendedTaskGetOptions extends TaskGetOptions {
  brief?: boolean;
}

export function registerGetCommand(parent: Command): void {
  parent
    .command('get <id>')
    .description('Get full task context including comments, attachments, and checklists')
    .option('--no-comments', 'Exclude comments from output')
    .option('--no-attachments', 'Exclude attachments from output')
    .option('--no-checklists', 'Exclude checklists from output')
    .option('--brief', 'Output concise format (id, name, desc, list, labels, comments text only)')
    .action(async (id: string, options: ExtendedTaskGetOptions) => {
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

        const context = await cardService.getFullContext(id, {
          includeComments: options.comments !== false,
          includeAttachments: options.attachments !== false,
          includeChecklists: options.checklists !== false,
        });

        const outputFormat = globalOptions.format || 'json';

        if (options.brief) {
          const briefContext = formatBriefTaskContext(context);
          console.log(format(briefContext, outputFormat));
        } else {
          console.log(format(context, outputFormat));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
