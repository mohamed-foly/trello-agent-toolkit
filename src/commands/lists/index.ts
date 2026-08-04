import { Command } from 'commander';
import { createCommandContext, withErrorHandling } from '../context.js';

interface ListWithCount {
  id: string;
  name: string;
  cardCount: number;
}

export function registerListsCommands(program: Command): void {
  program
    .command('lists')
    .description('List all columns/lists on the board with card counts')
    .action(
      withErrorHandling(async (_options: Record<string, never>, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);

        const [lists, cards] = await Promise.all([
          sdk.services.list.getAllLists(),
          sdk.services.card.getAllCards(),
        ]);

        const listsWithCounts: ListWithCount[] = lists.map((list) => ({
          id: list.id,
          name: list.name,
          cardCount: cards.filter((card) => card.idList === list.id).length,
        }));

        print(listsWithCounts);
      })
    );
}
