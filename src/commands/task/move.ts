import { Command } from 'commander';
import type { TaskMoveOptions } from '../../types/index.js';
import { createCommandContext, withErrorHandling } from '../context.js';

export function registerMoveCommand(parent: Command): void {
  parent
    .command('move <id> <list>')
    .description('Move a task to another list (by list ID, name, or workflow stage)')
    .action(
      withErrorHandling(async (id: string, list: string, _options: TaskMoveOptions, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);

        const updatedCard = await sdk.services.card.moveCard(id, list);

        print(updatedCard);
      })
    );
}
