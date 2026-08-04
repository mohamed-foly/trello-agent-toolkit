import { Command } from 'commander';
import { registerGetCommand } from './get.js';
import { registerMoveCommand } from './move.js';
import { registerCommentCommand } from './comment.js';
import { registerLabelCommand } from './label.js';

export function registerTaskCommands(program: Command): void {
  const task = program
    .command('task')
    .description('Commands for working with a single task');

  registerGetCommand(task);
  registerMoveCommand(task);
  registerCommentCommand(task);
  registerLabelCommand(task);
}
