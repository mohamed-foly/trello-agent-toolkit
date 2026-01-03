import { EXIT_CODES } from '../constants/index.js';

export class TrelloCliError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode: number = EXIT_CODES.GENERAL_ERROR
  ) {
    super(message);
    this.name = 'TrelloCliError';
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
    };
  }
}

export class ConfigError extends TrelloCliError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', EXIT_CODES.CONFIG_ERROR);
    this.name = 'ConfigError';
  }
}

export class ApiError extends TrelloCliError {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message, 'API_ERROR', EXIT_CODES.API_ERROR);
    this.name = 'ApiError';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
    };
  }
}

export class RateLimitError extends TrelloCliError {
  constructor(public retryAfterMs: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfterMs}ms`,
      'RATE_LIMIT_ERROR',
      EXIT_CODES.RATE_LIMIT_ERROR
    );
    this.name = 'RateLimitError';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfterMs: this.retryAfterMs,
    };
  }
}

export class FileError extends TrelloCliError {
  constructor(
    message: string,
    public filePath: string
  ) {
    super(message, 'FILE_ERROR', EXIT_CODES.FILE_ERROR);
    this.name = 'FileError';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      filePath: this.filePath,
    };
  }
}

export function handleError(error: unknown): never {
  if (error instanceof TrelloCliError) {
    console.error(JSON.stringify(error.toJSON(), null, 2));
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(
      JSON.stringify(
        {
          error: true,
          code: 'UNKNOWN_ERROR',
          message: error.message,
        },
        null,
        2
      )
    );
    process.exit(EXIT_CODES.GENERAL_ERROR);
  }

  console.error(
    JSON.stringify(
      {
        error: true,
        code: 'UNKNOWN_ERROR',
        message: String(error),
      },
      null,
      2
    )
  );
  process.exit(EXIT_CODES.GENERAL_ERROR);
}
