import { Command } from 'commander';
import { readFileSync } from 'fs';
import type { TaskCommentOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CommentService } from '../../services/comment.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

interface ExtendedCommentOptions extends TaskCommentOptions {
  file?: string;
  stdin?: boolean;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    // Check if stdin is a TTY (no piped input)
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on('end', () => {
      resolve(data.trim());
    });

    process.stdin.on('error', reject);

    // Timeout after 100ms if no data (for non-piped scenarios)
    setTimeout(() => {
      if (data === '') {
        resolve('');
      }
    }, 100);
  });
}

export function registerCommentCommand(parent: Command): void {
  parent
    .command('comment <id> [message]')
    .description('Add a comment to a task')
    .option('--file <path>', 'Read comment text from file')
    .option('--stdin', 'Read comment text from stdin')
    .action(async (id: string, message: string | undefined, options: ExtendedCommentOptions) => {
      try {
        const globalOptions = parent.parent?.opts() || {};
        if (globalOptions.debug) {
          setDebugEnabled(true);
        }

        let commentText: string;

        // Priority: --file > --stdin > message argument
        if (options.file) {
          try {
            commentText = readFileSync(options.file, 'utf-8').trim();
          } catch (err) {
            console.log(format({
              error: true,
              message: `Failed to read file: ${options.file}`,
            }, globalOptions.format || 'json'));
            process.exit(1);
          }
        } else if (options.stdin) {
          commentText = await readStdin();
          if (!commentText) {
            console.log(format({
              error: true,
              message: 'No input received from stdin',
            }, globalOptions.format || 'json'));
            process.exit(1);
          }
        } else if (message) {
          commentText = message;
        } else {
          console.log(format({
            error: true,
            message: 'No comment text provided. Use message argument, --file, or --stdin',
          }, globalOptions.format || 'json'));
          process.exit(1);
        }

        const config = await loadConfig(globalOptions);
        const client = new TrelloClient(config);
        const commentService = new CommentService(client);

        const action = await commentService.addComment(id, commentText);

        const outputFormat = globalOptions.format || 'json';
        console.log(format({ success: true, commentId: action.id }, outputFormat));
      } catch (error) {
        handleError(error);
      }
    });
}
