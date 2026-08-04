import type { Command } from 'commander';
import type { GlobalOptions, OutputFormat } from '../types/index.js';
import { createTrelloSdk } from '../index.js';
import { setDebugEnabled } from '../utils/logger.js';
import { format } from '../utils/formatter.js';
import { handleError } from '../utils/error.js';

export type Sdk = Awaited<ReturnType<typeof createTrelloSdk>>;

export interface CommandContext {
  globalOptions: GlobalOptions;
  outputFormat: OutputFormat;
  sdk: Sdk;
  print: (data: unknown) => void;
}

/** Reads CLI-wide flags (--config-file, --format, --debug) from any subcommand. */
export function getGlobalOptions(cmd: Command): GlobalOptions {
  return cmd.optsWithGlobals() as GlobalOptions;
}

export function getOutputFormat(globalOptions: GlobalOptions): OutputFormat {
  return globalOptions.format || 'json';
}

/**
 * Bootstraps everything a command action needs: global options, debug logging,
 * and a ready-to-use SDK (client + cache + all services), built the same way
 * the SDK's own createTrelloSdk() builds it — instead of each command wiring
 * TrelloClient/CacheManager/services by hand.
 */
export async function createCommandContext(cmd: Command): Promise<CommandContext> {
  const globalOptions = getGlobalOptions(cmd);
  if (globalOptions.debug) {
    setDebugEnabled(true);
  }

  const sdk = await createTrelloSdk(globalOptions.configFile);
  const outputFormat = getOutputFormat(globalOptions);

  return {
    globalOptions,
    outputFormat,
    sdk,
    print: (data: unknown) => console.log(format(data, outputFormat)),
  };
}

/** Wraps a command action so thrown errors go through the shared handleError() exit path. */
export function withErrorHandling<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>
): (...args: Args) => Promise<void> {
  return async (...args: Args) => {
    try {
      await action(...args);
    } catch (error) {
      handleError(error);
    }
  };
}
