import { Command } from 'commander';
import type { GlobalOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { LabelService } from '../../services/label.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

interface LabelOptions extends GlobalOptions {
  remove?: boolean;
}

export function registerLabelCommand(parent: Command): void {
  parent
    .command('label <id> <label>')
    .description('Add or remove a label from a task (by label ID, name, or color)')
    .option('--remove', 'Remove the label instead of adding it')
    .action(async (id: string, label: string, options: LabelOptions) => {
      try {
        const globalOptions = parent.parent?.opts() || {};
        if (globalOptions.debug) {
          setDebugEnabled(true);
        }

        const config = await loadConfig(globalOptions);
        const client = new TrelloClient(config);
        const labelService = new LabelService(client);

        const labelId = await labelService.resolveLabelId(label);
        if (!labelId) {
          console.log(format({
            error: true,
            message: `Label not found: ${label}`,
            availableLabels: await labelService.getBoardLabels()
          }, globalOptions.format || 'json'));
          process.exit(1);
        }

        if (options.remove) {
          await labelService.removeLabelFromCard(id, labelId);
          console.log(format({ success: true, action: 'removed', cardId: id, labelId }, globalOptions.format || 'json'));
        } else {
          await labelService.addLabelToCard(id, labelId);
          console.log(format({ success: true, action: 'added', cardId: id, labelId }, globalOptions.format || 'json'));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
