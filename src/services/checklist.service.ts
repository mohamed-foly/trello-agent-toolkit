import type { TrelloChecklist, TrelloCheckItem } from '../types/index.js';
import type { TrelloClient } from '../core/client.js';
import { debug } from '../utils/logger.js';

export class ChecklistService {
  constructor(private client: TrelloClient) {}

  async getChecklists(cardId: string): Promise<TrelloChecklist[]> {
    debug('Fetching checklists for card:', cardId);
    return this.client.get<TrelloChecklist[]>(`/cards/${cardId}/checklists`);
  }

  async getChecklist(checklistId: string): Promise<TrelloChecklist> {
    debug('Fetching checklist:', checklistId);
    return this.client.get<TrelloChecklist>(`/checklists/${checklistId}`, {
      checkItems: 'all',
    });
  }

  async updateCheckItem(
    cardId: string,
    checkItemId: string,
    state: 'complete' | 'incomplete'
  ): Promise<TrelloCheckItem> {
    debug('Updating check item:', checkItemId, 'to state:', state);
    return this.client.put<TrelloCheckItem>(`/cards/${cardId}/checkItem/${checkItemId}`, {
      state,
    });
  }
}
