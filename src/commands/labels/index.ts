import { Command } from 'commander';
import { registerLabelsListCommand } from './list.js';

export function registerLabelsCommands(program: Command): void {
  const labels = program
    .command('labels')
    .description('Commands for working with board labels');

  registerLabelsListCommand(labels);
}
