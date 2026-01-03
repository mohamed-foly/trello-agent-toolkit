export interface WorkflowConfig {
  todo: string[];
  inProgress: string[];
  review: string[];
  done: string[];
  [key: string]: string[];
}

export interface BoardConfig {
  boardId: string;
  apiKey: string;
  apiToken: string;
  workflow: WorkflowConfig;
  rateLimitStateFile?: string;
  dataFile?: string;
  attachmentsDir?: string;
}

export interface GlobalOptions {
  configFile?: string;
  format?: OutputFormat;
  debug?: boolean;
}

export type OutputFormat = 'json' | 'table' | 'text';
