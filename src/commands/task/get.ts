import { Command } from 'commander';
import type { TaskGetOptions } from '../../types/index.js';
import { createCommandContext, withErrorHandling } from '../context.js';
import { formatBriefTaskContext } from '../../utils/formatter.js';

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
    .action(
      withErrorHandling(async (id: string, options: ExtendedTaskGetOptions, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);

        const context = await sdk.services.card.getFullContext(id, {
          includeComments: options.comments !== false,
          includeAttachments: options.attachments !== false,
          includeChecklists: options.checklists !== false,
        });

        print(options.brief ? formatBriefTaskContext(context) : context);
      })
    );
}
