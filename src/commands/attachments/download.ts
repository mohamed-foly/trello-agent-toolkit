import { Command } from 'commander';
import type { AttachmentDownloadOptions } from '../../types/index.js';
import { createCommandContext, withErrorHandling } from '../context.js';

export function registerAttachmentDownloadCommand(parent: Command): void {
  parent
    .command('download <task-id>')
    .description('Download attachments for a task')
    .option('-o, --output <directory>', 'Output directory for attachments')
    .action(
      withErrorHandling(async (taskId: string, options: AttachmentDownloadOptions, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);
        const results = await sdk.services.attachment.downloadAttachments(taskId, options.output);
        print(results);
      })
    );
}
