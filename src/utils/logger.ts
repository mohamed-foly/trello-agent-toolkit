let debugEnabled = false;

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function debug(...args: unknown[]): void {
  if (debugEnabled) {
    console.error('[DEBUG]', ...args);
  }
}

export function info(...args: unknown[]): void {
  if (debugEnabled) {
    console.error('[INFO]', ...args);
  }
}

export function warn(...args: unknown[]): void {
  if (debugEnabled) {
    console.error('[WARN]', ...args);
  }
}

export function error(...args: unknown[]): void {
  console.error('[ERROR]', ...args);
}
