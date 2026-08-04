import type { TrelloLabel } from '../types/index.js';
import type { TrelloClient } from '../core/client.js';
import type { CacheManager } from '../core/cache.js';
import { debug } from '../utils/logger.js';

export class LabelService {
  constructor(
    private client: TrelloClient,
    private cache: CacheManager
  ) {}

  async getBoardLabels(): Promise<TrelloLabel[]> {
    const boardId = this.client.getConfig().boardId;
    debug('Fetching labels for board:', boardId);
    return this.client.get<TrelloLabel[]>(`/boards/${boardId}/labels`);
  }

  async addLabelToCard(cardId: string, labelId: string): Promise<void> {
    debug('Adding label:', labelId, 'to card:', cardId);
    await this.client.post<void>(`/cards/${cardId}/idLabels`, undefined, {
      value: labelId,
    });
    // Cards embed full label objects, so a label change makes any cached card stale.
    this.cache.invalidateCards();
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<void> {
    debug('Removing label:', labelId, 'from card:', cardId);
    await this.client.delete<void>(`/cards/${cardId}/idLabels/${labelId}`);
    this.cache.invalidateCards();
  }

  async getLabelByName(name: string): Promise<TrelloLabel | null> {
    const labels = await this.getBoardLabels();
    const lowerName = name.toLowerCase();
    return labels.find((l) => l.name.toLowerCase() === lowerName) || null;
  }

  async resolveLabelId(nameOrId: string): Promise<string | null> {
    const labels = await this.getBoardLabels();

    // Check if it's a direct ID match
    const idMatch = labels.find((l) => l.id === nameOrId);
    if (idMatch) return idMatch.id;

    // Check by name (case-insensitive)
    const lowerName = nameOrId.toLowerCase();
    const nameMatch = labels.find((l) => l.name.toLowerCase() === lowerName);
    if (nameMatch) return nameMatch.id;

    // Check by color
    const colorMatch = labels.find((l) => l.color === nameOrId);
    if (colorMatch) return colorMatch.id;

    return null;
  }

  async createLabel(name: string, color: string): Promise<TrelloLabel> {
    const boardId = this.client.getConfig().boardId;
    debug('Creating label:', name, 'with color:', color);
    return this.client.post<TrelloLabel>(`/boards/${boardId}/labels`, undefined, {
      name,
      color,
    });
  }
}
