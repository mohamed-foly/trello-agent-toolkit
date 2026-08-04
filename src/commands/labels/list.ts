import { Command } from 'commander';
import type { GlobalOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { LabelService } from '../../services/label.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

export function registerLabelsListCommand(parent: Command): void {
  parent
    .command('list')
    .description('List all labels available on the board')
    .action(async (_options: GlobalOptions) => {
      try {
        const globalOptions = parent.parent?.opts() || {};
        if (globalOptions.debug) {
          setDebugEnabled(true);
        }

        const config = await loadConfig(globalOptions);
        const client = new TrelloClient(config);
        const labelService = new LabelService(client);

        const labels = await labelService.getBoardLabels();

        const outputFormat = globalOptions.format || 'json';
        console.log(format(labels, outputFormat));
      } catch (error) {
        handleError(error);
      }
    });
}
