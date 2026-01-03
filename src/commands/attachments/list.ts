import { Command } from 'commander';
import type { AttachmentListOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CacheManager } from '../../core/cache.js';
import { AttachmentService } from '../../services/attachment.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

export function registerAttachmentListCommand(parent: Command): void {
  parent
    .command('list <task-id>')
    .description('List attachments for a task')
    .action(async (taskId: string, _options: AttachmentListOptions) => {
      try {
        const globalOptions = parent.parent?.opts() || {};
        if (globalOptions.debug) {
          setDebugEnabled(true);
        }

        const config = await loadConfig(globalOptions);
        const client = new TrelloClient(config);
        const cache = new CacheManager(config);
        const attachmentService = new AttachmentService(client, cache, config);

        const attachments = await attachmentService.listAttachments(taskId);

        const outputFormat = globalOptions.format || 'json';
        console.log(format(attachments, outputFormat));
      } catch (error) {
        handleError(error);
      }
    });
}
