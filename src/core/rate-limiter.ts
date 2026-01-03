import type { RateLimitState, RateLimitHeaders, BoardConfig } from '../types/index.js';
import { RATE_LIMITS, DEFAULT_RATE_LIMIT_FILE } from '../constants/index.js';
import { readJsonFileOrDefault, writeJsonFile } from '../utils/file.js';
import { debug } from '../utils/logger.js';

const DEFAULT_STATE: RateLimitState = {
  lastRequestTime: 0,
  tokenRemaining: RATE_LIMITS.TOKEN_MAX,
  tokenResetTime: 0,
  keyRemaining: RATE_LIMITS.KEY_MAX,
  keyResetTime: 0,
};

export class RateLimiter {
  private stateFilePath: string;
  private state: RateLimitState;
  private stateLoaded: boolean = false;

  constructor(config: BoardConfig) {
    this.stateFilePath = config.rateLimitStateFile || DEFAULT_RATE_LIMIT_FILE;
    this.state = { ...DEFAULT_STATE };
  }

  async loadState(): Promise<void> {
    if (this.stateLoaded) return;

    this.state = await readJsonFileOrDefault<RateLimitState>(this.stateFilePath, DEFAULT_STATE);
    this.stateLoaded = true;
    debug('Rate limit state loaded:', this.state);
  }

  async saveState(): Promise<void> {
    await writeJsonFile(this.stateFilePath, this.state);
    debug('Rate limit state saved');
  }

  async waitIfNeeded(): Promise<void> {
    await this.loadState();

    const now = Date.now();

    if (this.state.tokenRemaining <= 1 && now < this.state.tokenResetTime) {
      const waitTime = this.state.tokenResetTime - now;
      debug(`Waiting ${waitTime}ms for token rate limit reset`);
      await this.delay(waitTime);
    }

    if (this.state.keyRemaining <= 1 && now < this.state.keyResetTime) {
      const waitTime = this.state.keyResetTime - now;
      debug(`Waiting ${waitTime}ms for key rate limit reset`);
      await this.delay(waitTime);
    }
  }

  updateFromHeaders(headers: RateLimitHeaders): void {
    const now = Date.now();

    this.state = {
      lastRequestTime: now,
      tokenRemaining: headers.remainingToken,
      tokenResetTime: now + RATE_LIMITS.TOKEN_INTERVAL_MS,
      keyRemaining: headers.remainingKey,
      keyResetTime: now + RATE_LIMITS.KEY_INTERVAL_MS,
    };

    debug('Rate limit state updated from headers:', this.state);

    void this.saveState();
  }

  parseHeaders(headers: Headers): RateLimitHeaders | null {
    const limitToken = headers.get('x-ratelimit-limit-tokens');
    const remainingToken = headers.get('x-ratelimit-remaining-tokens');
    const limitKey = headers.get('x-ratelimit-limit-key');
    const remainingKey = headers.get('x-ratelimit-remaining-key');

    if (!remainingToken || !remainingKey) {
      return null;
    }

    return {
      limitToken: limitToken ? parseInt(limitToken, 10) : RATE_LIMITS.TOKEN_MAX,
      remainingToken: parseInt(remainingToken, 10),
      limitKey: limitKey ? parseInt(limitKey, 10) : RATE_LIMITS.KEY_MAX,
      remainingKey: parseInt(remainingKey, 10),
    };
  }

  getState(): RateLimitState {
    return { ...this.state };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
