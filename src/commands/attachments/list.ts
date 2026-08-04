import { Command } from 'commander';
import type { AttachmentListOptions } from '../../types/index.js';
import { createCommandContext, withErrorHandling } from '../context.js';

export function registerAttachmentListCommand(parent: Command): void {
  parent
    .command('list <task-id>')
    .description('List attachments for a task')
    .action(
      withErrorHandling(async (taskId: string, _options: AttachmentListOptions, cmd: Command) => {
        const { sdk, print } = await createCommandContext(cmd);
        const attachments = await sdk.services.attachment.listAttachments(taskId);
        print(attachments);
      })
    );
}
