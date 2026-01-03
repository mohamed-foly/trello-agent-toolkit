import { resolve } from 'path';
import type { BoardConfig, GlobalOptions } from '../types/index.js';
import { DEFAULT_CONFIG_FILE } from '../constants/index.js';
import { ConfigError } from '../utils/error.js';
import { readJsonFile } from '../utils/file.js';
import { debug } from '../utils/logger.js';

export function resolveConfigPath(options: GlobalOptions): string {
  if (options.configFile) {
    debug('Using config file from --config-file flag:', options.configFile);
    return resolve(options.configFile);
  }

  const envConfig = process.env.BOARD_CONFIG;
  if (envConfig) {
    debug('Using config file from BOARD_CONFIG env:', envConfig);
    return resolve(envConfig);
  }

  debug('Using default config file:', DEFAULT_CONFIG_FILE);
  return resolve(DEFAULT_CONFIG_FILE);
}

export async function loadConfig(options: GlobalOptions): Promise<BoardConfig> {
  const configPath = resolveConfigPath(options);
  debug('Loading config from:', configPath);

  const rawConfig = await readJsonFile<unknown>(configPath);
  return validateConfig(rawConfig, configPath);
}

function validateConfig(rawConfig: unknown, configPath: string): BoardConfig {
  if (typeof rawConfig !== 'object' || rawConfig === null) {
    throw new ConfigError(`Invalid config file: ${configPath} - expected an object`);
  }

  const config = rawConfig as Record<string, unknown>;

  if (typeof config.boardId !== 'string' || !config.boardId) {
    throw new ConfigError(`Missing or invalid 'boardId' in config: ${configPath}`);
  }

  if (typeof config.apiKey !== 'string' || !config.apiKey) {
    throw new ConfigError(`Missing or invalid 'apiKey' in config: ${configPath}`);
  }

  if (typeof config.apiToken !== 'string' || !config.apiToken) {
    throw new ConfigError(`Missing or invalid 'apiToken' in config: ${configPath}`);
  }

  if (typeof config.workflow !== 'object' || config.workflow === null) {
    throw new ConfigError(`Missing or invalid 'workflow' in config: ${configPath}`);
  }

  const workflow = config.workflow as Record<string, unknown>;
  const validatedWorkflow: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(workflow)) {
    if (!Array.isArray(value)) {
      throw new ConfigError(`Invalid workflow stage '${key}' in config: ${configPath} - expected an array`);
    }
    if (!value.every((id) => typeof id === 'string')) {
      throw new ConfigError(
        `Invalid workflow stage '${key}' in config: ${configPath} - all list IDs must be strings`
      );
    }
    validatedWorkflow[key] = value;
  }

  const boardConfig: BoardConfig = {
    boardId: config.boardId,
    apiKey: config.apiKey,
    apiToken: config.apiToken,
    workflow: {
      todo: validatedWorkflow.todo || [],
      inProgress: validatedWorkflow.inProgress || [],
      review: validatedWorkflow.review || [],
      done: validatedWorkflow.done || [],
      ...validatedWorkflow,
    },
  };

  if (typeof config.rateLimitStateFile === 'string') {
    boardConfig.rateLimitStateFile = config.rateLimitStateFile;
  }

  if (typeof config.dataFile === 'string') {
    boardConfig.dataFile = config.dataFile;
  }

  if (typeof config.attachmentsDir === 'string') {
    boardConfig.attachmentsDir = config.attachmentsDir;
  }

  debug('Config loaded successfully for board:', boardConfig.boardId);
  return boardConfig;
}
