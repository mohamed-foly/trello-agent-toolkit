export const TRELLO_API_BASE_URL = 'https://api.trello.com/1';

export const DEFAULT_CONFIG_FILE = './trello.config.board.json';
export const DEFAULT_RATE_LIMIT_FILE = './.rate-limit.json';
export const DEFAULT_ATTACHMENTS_DIR = './.attachments';

export const RATE_LIMITS = {
  TOKEN_MAX: 100,
  TOKEN_INTERVAL_MS: 10000,
  KEY_MAX: 300,
  KEY_INTERVAL_MS: 10000,
  MEMBER_ENDPOINT_MAX: 100,
  MEMBER_ENDPOINT_INTERVAL_MS: 900000,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
} as const;

export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  CONFIG_ERROR: 2,
  API_ERROR: 3,
  RATE_LIMIT_ERROR: 4,
  FILE_ERROR: 5,
} as const;
