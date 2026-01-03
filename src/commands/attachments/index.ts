import { Command } from 'commander';
import { registerAttachmentListCommand } from './list.js';
import { registerAttachmentDownloadCommand } from './download.js';

export function registerAttachmentsCommands(program: Command): void {
  const attachments = program
    .command('attachments')
    .description('Commands for working with task attachments');

  registerAttachmentListCommand(attachments);
  registerAttachmentDownloadCommand(attachments);
}
