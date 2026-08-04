import type {
  TrelloCard,
  TrelloList,
  TaskContext,
  TrelloComment,
  TrelloAttachment,
  TrelloChecklist,
  TrelloAction,
} from '../types/index.js';
import type { TrelloClient } from '../core/client.js';
import type { CacheManager } from '../core/cache.js';
import { ListService } from './list.service.js';
import { CACHE_TTL_MS } from '../constants/index.js';
import { debug } from '../utils/logger.js';

export interface GetContextOptions {
  includeComments?: boolean;
  includeAttachments?: boolean;
  includeChecklists?: boolean;
}

export class CardService {
  private listService: ListService;

  constructor(
    private client: TrelloClient,
    private cache: CacheManager
  ) {
    this.listService = new ListService(client, cache);
  }

  async getAllCards(): Promise<TrelloCard[]> {
    if (this.cache.isCardsCacheFresh(CACHE_TTL_MS)) {
      debug('Using cached cards (fresh within TTL)');
      return this.cache.getCards();
    }

    const boardId = this.client.getConfig().boardId;
    debug('Fetching all cards for board:', boardId);

    const cards = await this.client.get<TrelloCard[]>(`/boards/${boardId}/cards`, {
      filter: 'open',
    });

    await this.cache.setCards(cards);
    return cards;
  }

  async getCardsByStage(stage: string): Promise<TrelloCard[]> {
    const listIds = this.listService.getListIdsForStage(stage);
    if (listIds.length === 0) {
      return [];
    }

    const allCards = await this.getAllCards();
    return allCards.filter((card) => listIds.includes(card.idList));
  }

  async getCard(cardId: string): Promise<TrelloCard> {
    debug('Fetching card:', cardId);
    return this.client.get<TrelloCard>(`/cards/${cardId}`);
  }

  async getFullContext(cardId: string, options: GetContextOptions = {}): Promise<TaskContext> {
    const {
      includeComments = true,
      includeAttachments = true,
      includeChecklists = true,
    } = options;

    debug('Fetching full context for card:', cardId);

    const card = await this.getCard(cardId);
    const list = await this.client.get<TrelloList>(`/lists/${card.idList}`);
    const workflowStage = this.listService.getWorkflowStage(card.idList);

    const [comments, attachments, checklists] = await Promise.all([
      includeComments ? this.getComments(cardId) : Promise.resolve([]),
      includeAttachments ? this.getAttachments(cardId) : Promise.resolve([]),
      includeChecklists ? this.getChecklists(cardId) : Promise.resolve([]),
    ]);

    const context: TaskContext = {
      card,
      list,
      workflowStage,
      comments,
      attachments,
      checklists,
    };

    await this.cache.setTaskContext(cardId, context);
    return context;
  }

  async createCard(listId: string, name: string, desc?: string): Promise<TrelloCard> {
    const resolvedListId = await this.listService.getListIdByNameOrId(listId);
    if (!resolvedListId) {
      throw new Error(`Could not resolve list: ${listId}`);
    }
    debug('Creating card in list:', resolvedListId, 'name:', name);
    const card = await this.client.post<TrelloCard>('/cards', { name, desc, idList: resolvedListId });
    this.cache.invalidateCards();
    return card;
  }

  async addAttachmentToCard(cardId: string, filePath: string, name?: string): Promise<TrelloAttachment> {
    debug('Uploading attachment to card:', cardId, 'file:', filePath);
    return this.client.uploadFile<TrelloAttachment>(`/cards/${cardId}/attachments`, filePath, name);
  }

  async moveCard(cardId: string, listId: string): Promise<TrelloCard> {
    debug('Moving card:', cardId, 'to list:', listId);

    const resolvedListId = await this.listService.getListIdByNameOrId(listId);
    if (!resolvedListId) {
      throw new Error(`Could not resolve list: ${listId}`);
    }

    const card = await this.client.put<TrelloCard>(`/cards/${cardId}`, {
      idList: resolvedListId,
    });
    this.cache.invalidateCards();
    return card;
  }

  private async getComments(cardId: string): Promise<TrelloComment[]> {
    debug('Fetching comments for card:', cardId);

    const actions = await this.client.get<TrelloAction[]>(`/cards/${cardId}/actions`, {
      filter: 'commentCard',
    });

    return actions.map((action) => ({
      id: action.id,
      text: action.data.text || '',
      date: action.date,
      memberCreator: action.memberCreator || {
        id: action.idMemberCreator,
        username: 'unknown',
        fullName: 'Unknown',
        avatarUrl: null,
        initials: '?',
      },
    }));
  }

  private async getAttachments(cardId: string): Promise<TrelloAttachment[]> {
    debug('Fetching attachments for card:', cardId);
    return this.client.get<TrelloAttachment[]>(`/cards/${cardId}/attachments`);
  }

  private async getChecklists(cardId: string): Promise<TrelloChecklist[]> {
    debug('Fetching checklists for card:', cardId);
    return this.client.get<TrelloChecklist[]>(`/cards/${cardId}/checklists`);
  }
}
