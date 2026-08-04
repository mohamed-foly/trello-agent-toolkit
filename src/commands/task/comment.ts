import { Command } from 'commander';
import { readFileSync } from 'fs';
import type { TaskCommentOptions } from '../../types/index.js';
import { createCommandContext, withErrorHandling } from '../context.js';

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
    .action(
      withErrorHandling(async (id: string, message: string | undefined, options: ExtendedCommentOptions, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);

        let commentText: string;

        // Priority: --file > --stdin > message argument
        if (options.file) {
          try {
            commentText = readFileSync(options.file, 'utf-8').trim();
          } catch (err) {
            print({ error: true, message: `Failed to read file: ${options.file}` });
            process.exit(1);
          }
        } else if (options.stdin) {
          commentText = await readStdin();
          if (!commentText) {
            print({ error: true, message: 'No input received from stdin' });
            process.exit(1);
          }
        } else if (message) {
          commentText = message;
        } else {
          print({ error: true, message: 'No comment text provided. Use message argument, --file, or --stdin' });
          process.exit(1);
        }

        const action = await sdk.services.comment.addComment(id, commentText);
        print({ success: true, commentId: action.id });
      })
    );
}
