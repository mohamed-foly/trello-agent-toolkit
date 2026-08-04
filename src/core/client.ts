import { readFileSync } from 'fs';
import { basename } from 'path';
import type { BoardConfig } from '../types/index.js';
import { TRELLO_API_BASE_URL, HTTP_STATUS } from '../constants/index.js';
import { ApiError, RateLimitError } from '../utils/error.js';
import { debug } from '../utils/logger.js';
import { RateLimiter } from './rate-limiter.js';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean | undefined>;
}

export class TrelloClient {
  private config: BoardConfig;
  private rateLimiter: RateLimiter;

  constructor(config: BoardConfig, rateLimiter?: RateLimiter) {
    this.config = config;
    this.rateLimiter = rateLimiter || new RateLimiter(config);
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    await this.rateLimiter.waitIfNeeded();

    const url = this.buildUrl(endpoint, options.query);
    debug(`${options.method || 'GET'} ${url}`);

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
      },
    };

    if (options.body) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Content-Type': 'application/json',
      };
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    const rateLimitHeaders = this.rateLimiter.parseHeaders(response.headers);
    if (rateLimitHeaders) {
      this.rateLimiter.updateFromHeaders(rateLimitHeaders);
    }

    if (response.status === HTTP_STATUS.RATE_LIMITED) {
      const retryAfter = response.headers.get('retry-after');
      const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 10000;
      throw new RateLimitError(retryMs);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        `Trello API error: ${response.status} ${response.statusText} - ${errorText}`,
        response.status
      );
    }

    return (await response.json()) as T;
  }

  async get<T>(endpoint: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', query });
  }

  async post<T>(
    endpoint: string,
    body?: Record<string, unknown>,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, query });
  }

  async put<T>(
    endpoint: string,
    body?: Record<string, unknown>,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, query });
  }

  async delete<T>(endpoint: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', query });
  }

  async downloadFile(url: string): Promise<Buffer> {
    await this.rateLimiter.waitIfNeeded();

    const downloadUrl = new URL(url);
    // Trello attachment URLs use trello.com but API auth requires api.trello.com
    if (downloadUrl.hostname === 'trello.com') {
      downloadUrl.hostname = 'api.trello.com';
    }

    debug(`Downloading file from: ${downloadUrl.toString()}`);

    const response = await fetch(downloadUrl.toString(), {
      headers: {
        Authorization: `OAuth oauth_consumer_key="${this.config.apiKey}", oauth_token="${this.config.apiToken}"`,
      },
    });

    if (!response.ok) {
      throw new ApiError(`Failed to download file: ${response.status} ${response.statusText}`, response.status);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async uploadFile<T>(endpoint: string, filePath: string, name?: string): Promise<T> {
    await this.rateLimiter.waitIfNeeded();

    const url = this.buildUrl(endpoint);
    const fileName = name || basename(filePath);
    const fileBuffer = readFileSync(filePath);
    const blob = new Blob([fileBuffer]);

    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('name', fileName);

    debug(`Uploading file to: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(`Failed to upload file: ${response.status} ${response.statusText} - ${errorText}`, response.status);
    }

    return (await response.json()) as T;
  }

  private buildUrl(endpoint: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${TRELLO_API_BASE_URL}${endpoint}`);

    url.searchParams.set('key', this.config.apiKey);
    url.searchParams.set('token', this.config.apiToken);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  getConfig(): BoardConfig {
    return this.config;
  }
}
