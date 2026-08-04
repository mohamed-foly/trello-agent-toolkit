# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM-to-Trello interface - a CLI and SDK that allows AI agents to interact with Trello boards programmatically. Designed to be board-agnostic and reusable across projects.

## Commands

```bash
yarn dev <command>       # Run CLI in dev mode (tsx)
yarn dev:mcp             # Run MCP server in dev mode (tsx)
yarn dev:watch           # Run CLI in dev mode with file watching
yarn build               # Build with tsup to dist/ (emits cli.js, index.js, mcp.js in cjs+esm)
yarn start <command>     # Run built CLI
yarn typecheck           # Type check without emitting
yarn lint                # ESLint (yarn lint:fix to auto-fix)
yarn format              # Prettier (yarn format:check to verify only)
```

No test suite is currently configured in this repo.

**CLI commands:**
```bash
# List commands
trello lists                                    # List all lists with IDs and card counts

# Multi-task commands
trello tasks list [--stage <stage>] [--limit <n>] [--format json|table|text]
trello tasks list --list "BackEnd"              # Filter by list name
trello tasks list --list-id <id>                # Filter by list ID
trello tasks list --brief                       # Concise output (id, name, list, labels)
trello tasks move <id1> <id2> --to "testing"    # Move specific cards to list
trello tasks move --from "BackEnd" --to "done"  # Move all cards from one list to another

# Single-task commands
trello task get <id> [--no-comments] [--no-attachments] [--no-checklists]
trello task get <id> --brief                    # Concise output (id, name, desc, list, labels, comments text)
trello task move <id> <list-id-or-stage>
trello task comment <id> "message"
trello task comment <id> --file comment.txt     # Read comment from file
trello task comment <id> --stdin                # Read comment from stdin (pipe)
trello task label <id> <label-name-or-id> [--remove]

# Label commands
trello labels list

# Attachment commands
trello attachments list <task-id>
trello attachments download <task-id> [--output <dir>]
```

**AI Agent Optimizations:**
- Use `--brief` for reduced token usage (strips timestamps, URLs, member IDs)
- Use `--format json` (default) for structured parsing
- Use `trello lists` to discover list names before filtering
- Use `--file` or `--stdin` for multiline comments (avoids shell escaping issues)

## MCP Server

The project includes an MCP (Model Context Protocol) server at `src/mcp.ts` that exposes all Trello operations as tools over JSON-RPC 2.0 stdio transport. No additional packages required.

```bash
yarn dev:mcp            # Run MCP server in dev mode
node dist/mcp.js        # Run built MCP server
```

**MCP config for AI agents (e.g. Claude Code, Cursor):**
```json
{
  "mcpServers": {
    "trello": {
      "command": "node",
      "args": ["<path-to-project>/dist/mcp.js"],
      "env": {
        "BOARD_CONFIG": "<path-to-config>/trello.config.board.json"
      }
    }
  }
}
```

**Available tools:** `list_lists`, `list_tasks`, `get_task`, `move_task`, `move_tasks`, `add_comment`, `manage_label`, `list_labels`, `list_attachments`, `download_attachments`

## Architecture

```
src/
├── cli.ts              # CLI entry point (Commander.js + dotenv)
├── mcp.ts              # MCP server entry point (JSON-RPC 2.0 over stdio)
├── index.ts            # SDK entry point (exports + createTrelloSdk factory)
├── commands/           # CLI command handlers
│   ├── lists/          # List commands (list all board lists)
│   ├── tasks/          # Multi-task commands (list, move)
│   ├── task/           # Single-task commands (get, move, comment, label)
│   ├── labels/         # Label commands (list)
│   └── attachments/    # Attachment commands (list, download)
├── core/               # Core infrastructure
│   ├── config.ts       # Config loading from *.config.board.json
│   ├── client.ts       # Trello API HTTP client
│   ├── rate-limiter.ts # Rate limit handling with JSON persistence
│   └── cache.ts        # Data caching to *.data.board.json
├── services/           # Business logic (board, card, list, comment, attachment, checklist, label)
├── types/              # TypeScript interfaces
├── utils/              # Helpers (error, logger, file, formatter)
└── constants/          # API URLs, rate limits, exit codes
```

## Key Patterns

- **Config resolution:** `--config-file` flag > `BOARD_CONFIG` env > `./trello.config.board.json`
- **Output:** Default JSON (LLM-optimized), optional `--format table|text`
- **Caching:** All fetched data auto-saved to `*.data.board.json`
- **Rate limiting:** State persisted to `.rate-limit.json`, auto-waits when limits approached
- **Workflow mapping:** List IDs mapped to stages (todo, validation, validated, inProgress, testing, done, rejected) in config. `todo`, `inProgress`, `review`, and `done` default to `[]` if omitted from the config file; any other stage keys are passed through as-is (see `validateConfig` in `src/core/config.ts`)

## Sensitive Files (gitignored, never read)

- `*.config.board.json` - Contains API credentials
- `.env` - Contains BOARD_CONFIG path
- `*.data.board.json` - Cached board data
- `.attachments/` - Downloaded files
