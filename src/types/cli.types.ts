import type { GlobalOptions, OutputFormat } from './config.types.js';

export type { OutputFormat };

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

export interface TaskListOptions extends GlobalOptions {
  stage?: string;
  limit?: number;
}

export interface TaskGetOptions extends GlobalOptions {
  comments?: boolean;
  attachments?: boolean;
  checklists?: boolean;
}

export interface TaskMoveOptions extends GlobalOptions {}

export interface TaskCommentOptions extends GlobalOptions {}

export interface AttachmentListOptions extends GlobalOptions {}

export interface AttachmentDownloadOptions extends GlobalOptions {
  output?: string;
}

export interface CachedBoardData {
  lastUpdated: string;
  boardId: string;
  lists: import('./trello.types.js').TrelloList[];
  cards: import('./trello.types.js').TrelloCard[];
  taskContexts: Record<string, import('./trello.types.js').TaskContext>;
  attachmentPaths: Record<string, Record<string, string>>;
}

export interface DownloadResult {
  id: string;
  name: string;
  path: string;
  bytes: number | null;
}
