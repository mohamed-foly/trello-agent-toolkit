import type { TrelloAction } from '../types/index.js';
import type { TrelloClient } from '../core/client.js';
import { debug } from '../utils/logger.js';

export class CommentService {
  constructor(private client: TrelloClient) {}

  async addComment(cardId: string, text: string): Promise<TrelloAction> {
    debug('Adding comment to card:', cardId);

    return this.client.post<TrelloAction>(`/cards/${cardId}/actions/comments`, undefined, {
      text,
    });
  }

  async getComments(cardId: string): Promise<TrelloAction[]> {
    debug('Fetching comments for card:', cardId);

    return this.client.get<TrelloAction[]>(`/cards/${cardId}/actions`, {
      filter: 'commentCard',
    });
  }
}
