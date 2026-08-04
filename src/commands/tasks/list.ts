import { Command } from 'commander';
import type { TaskListOptions, TrelloCard } from '../../types/index.js';
import { createCommandContext, withErrorHandling } from '../context.js';
import { formatBriefCards } from '../../utils/formatter.js';

interface ExtendedTaskListOptions extends TaskListOptions {
  list?: string;
  listId?: string;
  brief?: boolean;
}

export function registerListCommand(parent: Command): void {
  parent
    .command('list')
    .description('List all tasks from the board')
    .option('--stage <stage>', 'Filter by workflow stage (todo, inProgress, testing, done)')
    .option('--list <name>', 'Filter by list name (e.g., "BackEnd")')
    .option('--list-id <id>', 'Filter by list ID')
    .option('--brief', 'Output concise format (id, name, list, labels only)')
    .option('--limit <number>', 'Limit number of results', parseInt)
    .action(
      withErrorHandling(async (options: ExtendedTaskListOptions, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);

        const lists = await sdk.services.list.getAllLists();

        let cards: TrelloCard[];

        if (options.listId) {
          const allCards = await sdk.services.card.getAllCards();
          cards = allCards.filter((card) => card.idList === options.listId);
        } else if (options.list) {
          const targetList = lists.find((l) => l.name.toLowerCase() === options.list!.toLowerCase());
          if (!targetList) {
            print({
              error: true,
              message: `List not found: ${options.list}`,
              availableLists: lists.map((l) => l.name),
            });
            process.exit(1);
          }
          const allCards = await sdk.services.card.getAllCards();
          cards = allCards.filter((card) => card.idList === targetList.id);
        } else if (options.stage) {
          cards = await sdk.services.card.getCardsByStage(options.stage);
        } else {
          cards = await sdk.services.card.getAllCards();
        }

        if (options.limit && options.limit > 0) {
          cards = cards.slice(0, options.limit);
        }

        print(options.brief ? formatBriefCards(cards, lists) : cards);
      })
    );
}
