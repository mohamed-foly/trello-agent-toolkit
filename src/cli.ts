#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { registerCommands } from './commands/index.js';

const program = new Command();

program
  .name('trello')
  .description('LLM-to-Trello interface CLI - Interact with Trello boards programmatically')
  .version('1.0.0')
  .option('--config-file <path>', 'Path to board configuration file')
  .option('--format <format>', 'Output format: json, table, text', 'json')
  .option('--debug', 'Enable debug logging');

registerCommands(program);

program.parse(process.argv);
