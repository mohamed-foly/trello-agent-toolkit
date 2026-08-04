import { appendFileSync } from 'fs';
import { inspect } from 'util';

let debugEnabled = false;
let logFilePath: string | undefined;

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/** Mirrors console output to a file as well (e.g. for the MCP server, whose stderr isn't always visible to its host). */
export function setLogFile(filePath: string | undefined): void {
  logFilePath = filePath;
}

function appendToLogFile(prefix: string, args: unknown[]): void {
  if (!logFilePath) return;
  const message = args.map((a) => (typeof a === 'string' ? a : inspect(a))).join(' ');
  try {
    appendFileSync(logFilePath, `[${new Date().toISOString()}] ${prefix} ${message}\n`);
  } catch {
    // Best-effort file logging — never let a logging failure crash the process.
  }
}

export function debug(...args: unknown[]): void {
  if (debugEnabled) {
    console.error('[DEBUG]', ...args);
    appendToLogFile('[DEBUG]', args);
  }
}

export function info(...args: unknown[]): void {
  if (debugEnabled) {
    console.error('[INFO]', ...args);
    appendToLogFile('[INFO]', args);
  }
}

export function warn(...args: unknown[]): void {
  if (debugEnabled) {
    console.error('[WARN]', ...args);
    appendToLogFile('[WARN]', args);
  }
}

export function error(...args: unknown[]): void {
  console.error('[ERROR]', ...args);
  appendToLogFile('[ERROR]', args);
}
