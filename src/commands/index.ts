import { Command } from 'commander';
import { registerTasksCommands } from './tasks/index.js';
import { registerTaskCommands } from './task/index.js';
import { registerAttachmentsCommands } from './attachments/index.js';

export function registerCommands(program: Command): void {
  registerTasksCommands(program);
  registerTaskCommands(program);
  registerAttachmentsCommands(program);
}
