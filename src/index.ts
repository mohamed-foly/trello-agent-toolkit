// Core - import for local use and re-export
import { TrelloClient as TrelloClientClass, type RequestOptions } from './core/client.js';
import { loadConfig as loadConfigFn, resolveConfigPath } from './core/config.js';
import { CacheManager as CacheManagerClass } from './core/cache.js';
import { RateLimiter as RateLimiterClass } from './core/rate-limiter.js';

// Services - import for local use and re-export
import { BoardService as BoardServiceClass } from './services/board.service.js';
import { ListService as ListServiceClass } from './services/list.service.js';
import { CardService as CardServiceClass, type GetContextOptions } from './services/card.service.js';
import { CommentService as CommentServiceClass } from './services/comment.service.js';
import { AttachmentService as AttachmentServiceClass } from './services/attachment.service.js';
import { ChecklistService as ChecklistServiceClass } from './services/checklist.service.js';
import { LabelService as LabelServiceClass } from './services/label.service.js';

// Re-export Core
export { TrelloClientClass as TrelloClient, type RequestOptions };
export { loadConfigFn as loadConfig, resolveConfigPath };
export { CacheManagerClass as CacheManager };
export { RateLimiterClass as RateLimiter };

// Re-export Services
export { BoardServiceClass as BoardService };
export { ListServiceClass as ListService };
export { CardServiceClass as CardService, type GetContextOptions };
export { CommentServiceClass as CommentService };
export { AttachmentServiceClass as AttachmentService };
export { ChecklistServiceClass as ChecklistService };
export { LabelServiceClass as LabelService };

// Types
export type {
  // Config types
  WorkflowConfig,
  BoardConfig,
  GlobalOptions,
  OutputFormat,
  // Trello types
  TrelloBoard,
  TrelloBoardPrefs,
  TrelloList,
  TrelloCard,
  TrelloCardBadges,
  TrelloLabel,
  TrelloAttachment,
  TrelloAction,
  TrelloActionData,
  TrelloMember,
  TrelloChecklist,
  TrelloCheckItem,
  TrelloComment,
  TaskContext,
  RateLimitHeaders,
  RateLimitState,
  // CLI types
  CommandResult,
  TaskListOptions,
  TaskGetOptions,
  TaskMoveOptions,
  TaskCommentOptions,
  AttachmentListOptions,
  AttachmentDownloadOptions,
  CachedBoardData,
  DownloadResult,
} from './types/index.js';

// Utilities
export { format } from './utils/formatter.js';
export { TrelloCliError, ConfigError, ApiError, RateLimitError, FileError } from './utils/error.js';
export { setDebugEnabled, isDebugEnabled, debug, info, warn, error } from './utils/logger.js';
export { readJsonFile, writeJsonFile, ensureDir, fileExists } from './utils/file.js';

// Constants
export {
  TRELLO_API_BASE_URL,
  DEFAULT_CONFIG_FILE,
  DEFAULT_RATE_LIMIT_FILE,
  DEFAULT_ATTACHMENTS_DIR,
  RATE_LIMITS,
  HTTP_STATUS,
  EXIT_CODES,
} from './constants/index.js';

// High-level SDK factory
export async function createTrelloSdk(configPath?: string) {
  const config = await loadConfigFn({ configFile: configPath });
  const rateLimiter = new RateLimiterClass(config);
  const client = new TrelloClientClass(config, rateLimiter);
  const cache = new CacheManagerClass(config);

  return {
    client,
    cache,
    rateLimiter,
    config,
    services: {
      board: new BoardServiceClass(client, cache),
      list: new ListServiceClass(client, cache),
      card: new CardServiceClass(client, cache),
      comment: new CommentServiceClass(client),
      attachment: new AttachmentServiceClass(client, cache, config),
      checklist: new ChecklistServiceClass(client),
      label: new LabelServiceClass(client),
    },
  };
}
