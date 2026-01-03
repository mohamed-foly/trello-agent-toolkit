import { Command } from 'commander';
import { registerListCommand } from './list.js';

export function registerTasksCommands(program: Command): void {
  const tasks = program
    .command('tasks')
    .description('Commands for working with multiple tasks');

  registerListCommand(tasks);
}
