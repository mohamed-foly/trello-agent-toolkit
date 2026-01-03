import { resolve, join } from 'path';
import { writeFile } from 'fs/promises';
import type { TrelloAttachment, DownloadResult, BoardConfig } from '../types/index.js';
import type { TrelloClient } from '../core/client.js';
import type { CacheManager } from '../core/cache.js';
import { DEFAULT_ATTACHMENTS_DIR } from '../constants/index.js';
import { ensureDir } from '../utils/file.js';
import { debug } from '../utils/logger.js';

export class AttachmentService {
  private attachmentsDir: string;

  constructor(
    private client: TrelloClient,
    private cache: CacheManager,
    config?: BoardConfig
  ) {
    this.attachmentsDir = config?.attachmentsDir || DEFAULT_ATTACHMENTS_DIR;
  }

  async listAttachments(cardId: string): Promise<TrelloAttachment[]> {
    debug('Listing attachments for card:', cardId);
    return this.client.get<TrelloAttachment[]>(`/cards/${cardId}/attachments`);
  }

  async downloadAttachments(cardId: string, targetDir?: string): Promise<DownloadResult[]> {
    const attachments = await this.listAttachments(cardId);

    if (attachments.length === 0) {
      debug('No attachments found for card:', cardId);
      return [];
    }

    const baseDir = targetDir || this.attachmentsDir;
    const cardDir = resolve(join(baseDir, cardId));
    await ensureDir(cardDir);

    debug('Downloading', attachments.length, 'attachments to:', cardDir);

    const results: DownloadResult[] = [];
    const pathMapping: Record<string, string> = {};

    for (const attachment of attachments) {
      try {
        const filePath = join(cardDir, attachment.fileName || attachment.name);
        const relativePath = join(baseDir, cardId, attachment.fileName || attachment.name);

        if (attachment.isUpload && attachment.url) {
          const buffer = await this.client.downloadFile(attachment.url);
          await writeFile(filePath, buffer);

          results.push({
            id: attachment.id,
            name: attachment.name,
            path: relativePath,
            bytes: buffer.length,
          });

          pathMapping[attachment.id] = relativePath;
          debug('Downloaded:', attachment.name);
        } else {
          results.push({
            id: attachment.id,
            name: attachment.name,
            path: attachment.url,
            bytes: attachment.bytes,
          });

          pathMapping[attachment.id] = attachment.url;
          debug('External attachment (not downloaded):', attachment.name);
        }
      } catch (err) {
        debug('Failed to download attachment:', attachment.name, err);
        results.push({
          id: attachment.id,
          name: attachment.name,
          path: '',
          bytes: null,
        });
      }
    }

    await this.cache.setAttachmentPaths(cardId, pathMapping);
    return results;
  }

  async getAttachment(cardId: string, attachmentId: string): Promise<TrelloAttachment> {
    debug('Fetching attachment:', attachmentId, 'for card:', cardId);
    return this.client.get<TrelloAttachment>(`/cards/${cardId}/attachments/${attachmentId}`);
  }
}
