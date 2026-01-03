import type { TrelloBoard, TrelloList } from '../types/index.js';
import type { TrelloClient } from '../core/client.js';
import type { CacheManager } from '../core/cache.js';
import { debug } from '../utils/logger.js';

export class BoardService {
  constructor(
    private client: TrelloClient,
    private cache: CacheManager
  ) {}

  async getBoard(): Promise<TrelloBoard> {
    const boardId = this.client.getConfig().boardId;
    debug('Fetching board:', boardId);

    return this.client.get<TrelloBoard>(`/boards/${boardId}`);
  }

  async getLists(): Promise<TrelloList[]> {
    const boardId = this.client.getConfig().boardId;
    debug('Fetching lists for board:', boardId);

    const lists = await this.client.get<TrelloList[]>(`/boards/${boardId}/lists`, {
      filter: 'open',
    });

    await this.cache.setLists(lists);
    return lists;
  }

  async getListById(listId: string): Promise<TrelloList> {
    debug('Fetching list:', listId);
    return this.client.get<TrelloList>(`/lists/${listId}`);
  }
}
