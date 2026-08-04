import { Command } from 'commander';
import type { GlobalOptions } from '../../types/index.js';
import { createCommandContext, withErrorHandling } from '../context.js';

export function registerLabelsListCommand(parent: Command): void {
  parent
    .command('list')
    .description('List all labels available on the board')
    .action(
      withErrorHandling(async (_options: GlobalOptions, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);
        const labels = await sdk.services.label.getBoardLabels();
        print(labels);
      })
    );
}
