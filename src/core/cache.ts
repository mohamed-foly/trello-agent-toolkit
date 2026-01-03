import { resolve, dirname } from 'path';
import type {
  BoardConfig,
  TrelloCard,
  TrelloList,
  TaskContext,
  CachedBoardData,
} from '../types/index.js';
import { readJsonFileOrDefault, writeJsonFile, ensureDir } from '../utils/file.js';
import { debug } from '../utils/logger.js';

export class CacheManager {
  private dataFilePath: string;
  private data: CachedBoardData | null = null;
  private boardId: string;

  constructor(config: BoardConfig) {
    this.boardId = config.boardId;
    this.dataFilePath = config.dataFile || `./${config.boardId}.data.board.json`;
    this.dataFilePath = resolve(this.dataFilePath);
  }

  async load(): Promise<void> {
    if (this.data) return;

    this.data = await readJsonFileOrDefault<CachedBoardData>(this.dataFilePath, {
      lastUpdated: new Date().toISOString(),
      boardId: this.boardId,
      lists: [],
      cards: [],
      taskContexts: {},
      attachmentPaths: {},
    });

    debug('Cache loaded from:', this.dataFilePath);
  }

  async save(): Promise<void> {
    if (!this.data) return;

    this.data.lastUpdated = new Date().toISOString();
    await ensureDir(dirname(this.dataFilePath));
    await writeJsonFile(this.dataFilePath, this.data);
    debug('Cache saved to:', this.dataFilePath);
  }

  async getLists(): Promise<TrelloList[]> {
    await this.load();
    return this.data!.lists;
  }

  async setLists(lists: TrelloList[]): Promise<void> {
    await this.load();
    this.data!.lists = lists;
    await this.save();
  }

  async getCards(): Promise<TrelloCard[]> {
    await this.load();
    return this.data!.cards;
  }

  async setCards(cards: TrelloCard[]): Promise<void> {
    await this.load();
    this.data!.cards = cards;
    await this.save();
  }

  async getTaskContext(cardId: string): Promise<TaskContext | null> {
    await this.load();
    return this.data!.taskContexts[cardId] || null;
  }

  async setTaskContext(cardId: string, context: TaskContext): Promise<void> {
    await this.load();
    this.data!.taskContexts[cardId] = context;
    await this.save();
  }

  async getAttachmentPath(cardId: string, attachmentId: string): Promise<string | null> {
    await this.load();
    return this.data!.attachmentPaths[cardId]?.[attachmentId] || null;
  }

  async setAttachmentPath(cardId: string, attachmentId: string, filePath: string): Promise<void> {
    await this.load();
    if (!this.data!.attachmentPaths[cardId]) {
      this.data!.attachmentPaths[cardId] = {};
    }
    this.data!.attachmentPaths[cardId][attachmentId] = filePath;
    await this.save();
  }

  async setAttachmentPaths(cardId: string, paths: Record<string, string>): Promise<void> {
    await this.load();
    this.data!.attachmentPaths[cardId] = paths;
    await this.save();
  }

  async getData(): Promise<CachedBoardData> {
    await this.load();
    return this.data!;
  }

  getDataFilePath(): string {
    return this.dataFilePath;
  }
}
