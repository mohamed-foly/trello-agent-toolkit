import type { TrelloList, BoardConfig } from '../types/index.js';
import type { TrelloClient } from '../core/client.js';
import type { CacheManager } from '../core/cache.js';
import { debug } from '../utils/logger.js';

export class ListService {
  private config: BoardConfig;

  constructor(
    private client: TrelloClient,
    private cache: CacheManager
  ) {
    this.config = client.getConfig();
  }

  getWorkflowStage(listId: string): string | null {
    for (const [stage, listIds] of Object.entries(this.config.workflow)) {
      if (listIds.includes(listId)) {
        return stage;
      }
    }
    return null;
  }

  getListIdForStage(stage: string): string | null {
    const listIds = this.config.workflow[stage];
    return listIds?.[0] || null;
  }

  async getListIdByNameOrId(nameOrId: string): Promise<string | null> {
    const stageListId = this.getListIdForStage(nameOrId);
    if (stageListId) {
      debug('Resolved stage name to list ID:', nameOrId, '->', stageListId);
      return stageListId;
    }

    const lists = await this.cache.getLists();

    const exactMatch = lists.find((l) => l.id === nameOrId);
    if (exactMatch) {
      return exactMatch.id;
    }

    const nameMatch = lists.find((l) => l.name.toLowerCase() === nameOrId.toLowerCase());
    if (nameMatch) {
      debug('Resolved list name to ID:', nameOrId, '->', nameMatch.id);
      return nameMatch.id;
    }

    return null;
  }

  async getAllLists(): Promise<TrelloList[]> {
    const boardId = this.config.boardId;
    debug('Fetching all lists for board:', boardId);

    const lists = await this.client.get<TrelloList[]>(`/boards/${boardId}/lists`, {
      filter: 'open',
    });

    await this.cache.setLists(lists);
    return lists;
  }

  getWorkflowStages(): string[] {
    return Object.keys(this.config.workflow);
  }

  getListIdsForStage(stage: string): string[] {
    return this.config.workflow[stage] || [];
  }
}
