import { Command } from 'commander';
import type { GlobalOptions } from '../../types/index.js';
import { createCommandContext, withErrorHandling } from '../context.js';

interface LabelOptions extends GlobalOptions {
  remove?: boolean;
}

export function registerLabelCommand(parent: Command): void {
  parent
    .command('label <id> <label>')
    .description('Add or remove a label from a task (by label ID, name, or color)')
    .option('--remove', 'Remove the label instead of adding it')
    .action(
      withErrorHandling(async (id: string, label: string, options: LabelOptions, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);

        const labelId = await sdk.services.label.resolveLabelId(label);
        if (!labelId) {
          print({
            error: true,
            message: `Label not found: ${label}`,
            availableLabels: await sdk.services.label.getBoardLabels(),
          });
          process.exit(1);
        }

        if (options.remove) {
          await sdk.services.label.removeLabelFromCard(id, labelId);
          print({ success: true, action: 'removed', cardId: id, labelId });
        } else {
          await sdk.services.label.addLabelToCard(id, labelId);
          print({ success: true, action: 'added', cardId: id, labelId });
        }
      })
    );
}
