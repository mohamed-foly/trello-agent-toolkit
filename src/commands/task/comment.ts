import { Command } from 'commander';
import type { TaskCommentOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CommentService } from '../../services/comment.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

export function registerCommentCommand(parent: Command): void {
  parent
    .command('comment <id> <message>')
    .description('Add a comment to a task')
    .action(async (id: string, message: string, _options: TaskCommentOptions) => {
      try {
        const globalOptions = parent.parent?.opts() || {};
        if (globalOptions.debug) {
          setDebugEnabled(true);
        }

        const config = await loadConfig(globalOptions);
        const client = new TrelloClient(config);
        const commentService = new CommentService(client);

        const action = await commentService.addComment(id, message);

        const outputFormat = globalOptions.format || 'json';
        console.log(format(action, outputFormat));
      } catch (error) {
        handleError(error);
      }
    });
}
