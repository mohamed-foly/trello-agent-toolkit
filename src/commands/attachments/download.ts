import { Command } from 'commander';
import type { AttachmentDownloadOptions } from '../../types/index.js';
import { loadConfig } from '../../core/config.js';
import { TrelloClient } from '../../core/client.js';
import { CacheManager } from '../../core/cache.js';
import { AttachmentService } from '../../services/attachment.service.js';
import { format } from '../../utils/formatter.js';
import { handleError } from '../../utils/error.js';
import { setDebugEnabled } from '../../utils/logger.js';

export function registerAttachmentDownloadCommand(parent: Command): void {
  parent
    .command('download <task-id>')
    .description('Download attachments for a task')
    .option('-o, --output <directory>', 'Output directory for attachments')
    .action(async (taskId: string, options: AttachmentDownloadOptions) => {
      try {
        const globalOptions = parent.parent?.opts() || {};
        if (globalOptions.debug) {
          setDebugEnabled(true);
        }

        const config = await loadConfig(globalOptions);
        const client = new TrelloClient(config);
        const cache = new CacheManager(config);
        const attachmentService = new AttachmentService(client, cache, config);

        const results = await attachmentService.downloadAttachments(taskId, options.output);

        const outputFormat = globalOptions.format || 'json';
        console.log(format(results, outputFormat));
      } catch (error) {
        handleError(error);
      }
    });
}
