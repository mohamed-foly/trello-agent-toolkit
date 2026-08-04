# Trello CLI

An LLM-to-Trello interface — a CLI, SDK, and MCP server that let AI agents (and humans) interact with Trello boards programmatically. Board-agnostic and reusable across projects: point it at any board's config and it works.

> **Unofficial project.** This is an independent, community-built tool that uses Trello's public API. It is not affiliated with, endorsed by, or sponsored by Trello or Atlassian. "Trello" is a trademark of Atlassian Pty Ltd.

## Table of Contents

- [Quick Start](#quick-start)
- [Getting Trello API Credentials](#getting-trello-api-credentials)
- [Configuration](#configuration)
- [CLI Usage](#cli-usage)
- [MCP Server (wiring into Claude Code, Cursor, etc.)](#mcp-server-wiring-into-claude-code-cursor-etc)
- [Generated & Sensitive Files](#generated--sensitive-files)
- [For Contributors](#for-contributors)
- [License](#license)

## Quick Start

Requires [Node.js](https://nodejs.org) >= 22 and [Yarn](https://yarnpkg.com).

```bash
yarn install                     # install dependencies
yarn build                       # compile the CLI, SDK, and MCP server
yarn link                        # makes the `trello` command available globally
```

Then grab your [Trello API credentials](#getting-trello-api-credentials), create a config file (see [Configuration](#configuration)), and you're running:

```bash
trello lists
```

Prefer not to install globally? Run everything as `yarn start <command>` (or `node dist/cli.js <command>`) from inside the project folder instead — no `yarn link` needed.

## Features

This isn't a thin wrapper around Trello's REST API — it's a layer built specifically for driving boards from scripts and AI agents:

- **Board-agnostic, multi-board by design.** Nothing is hardcoded to one board. Each project (or each AI agent) points at its own config file — switch boards with a flag, an env var, or just a different working directory. Run it against as many boards as you have, side by side, with zero code changes.
- **Workflow-stage abstraction.** Map raw Trello list IDs to semantic stages (`todo`, `inProgress`, `done`, ...) once in config, then move cards by stage name everywhere — in the CLI, the SDK, and the MCP tools — instead of every caller needing to know or re-resolve list IDs.
- **First-class MCP server**, not a bolted-on wrapper: every operation (list, move, comment, label, create, attach) is exposed as an agent tool over JSON-RPC 2.0 stdio, with no extra MCP SDK dependency. Point any MCP-compatible agent at it and it can run the board directly.
- **Built for LLM consumption, not just human use.** `--brief` output strips timestamps/URLs/member IDs to cut token usage; JSON is the default format; errors come back as structured, parseable objects instead of thrown exceptions an agent has to guess at.
- **Correctness-first caching.** Repeated reads within a short window are served from memory to cut down on redundant API calls (useful when an agent asks several related questions back to back) — but every write this tool makes invalidates the cache immediately, so you never get stale data back from your own actions.
- Automatic Trello rate-limit handling (state persisted across invocations) and three interchangeable surfaces — CLI, SDK, MCP — backed by the same core, so behavior is consistent no matter which one you use.

## Getting Trello API Credentials

1. **API Key** — go to https://trello.com/app-key while logged into Trello. Copy the key shown there.
2. **API Token** — on the same page, click the "Token" link next to your API key and authorize it. Copy the generated token.
3. **Board ID** — open your board in a browser; the ID is the segment right after `/b/` in the URL (`https://trello.com/b/<boardId>/...`).
4. **List IDs** (for workflow mapping) — run `trello lists` once you have a minimal config in place (see below) to print every list's ID and name, then use those IDs to fill in your `workflow` mapping.

Treat the API token like a password — it has read/write access to whatever boards you authorize it for. Don't commit it anywhere.

## Configuration

Create a board configuration file, e.g. `myboard.config.board.json`:

```json
{
  "boardId": "your-board-id",
  "apiKey": "your-api-key",
  "apiToken": "your-api-token",
  "workflow": {
    "todo": ["list-id-for-todo"],
    "inProgress": ["list-id-for-in-progress"],
    "review": ["list-id-for-review"],
    "done": ["list-id-for-done"]
  }
}
```

Notes:
- `workflow` keys are arbitrary — `todo`, `inProgress`, `review`, and `done` are the ones that default to `[]` if you omit them, but you can add any other stage name (e.g. `testing`, `validated`, `rejected`) and it will be picked up as-is.
- Each stage maps to an array of list IDs, so multiple lists can share one stage if needed.

Any file matching `*.config.board.json` is automatically gitignored — this is where your credentials live, so never commit it or rename it out of that pattern.

Point the CLI at your config in one of three ways, in priority order:

```bash
# 1. --config-file flag (highest priority)
trello tasks list --config-file ./myboard.config.board.json

# 2. BOARD_CONFIG environment variable
export BOARD_CONFIG=./myboard.config.board.json
trello tasks list

# 3. .env file (loaded automatically via dotenv)
echo "BOARD_CONFIG=./myboard.config.board.json" > .env
trello tasks list

# 4. Falls back to ./trello.config.board.json in the current directory if none of the above is set
```

A `.env.example` is included as a template for the `.env` approach.

## CLI Usage

### Lists

```bash
trello lists                                    # List all lists with IDs and card counts
```

### Tasks (multi-card)

```bash
trello tasks list                               # List all tasks (JSON, auto-cached)
trello tasks list --stage todo                  # Filter by workflow stage
trello tasks list --list "BackEnd"              # Filter by list name
trello tasks list --list-id <id>                # Filter by list ID
trello tasks list --limit 10                    # Limit results
trello tasks list --brief                       # Concise output (id, name, list, labels)
trello tasks list --format table                # table | text | json (default)

trello tasks move <id1> <id2> --to "testing"    # Move specific cards to a list
trello tasks move --from "BackEnd" --to "done"  # Move all cards from one list to another
```

### Task (single-card)

```bash
trello task get <id>                            # Full context: card, comments, attachments, checklists
trello task get <id> --no-comments
trello task get <id> --no-attachments
trello task get <id> --no-checklists
trello task get <id> --brief                    # Concise output (id, name, desc, list, labels, comment text)

trello task move <id> <list-id-or-stage>        # Move by list ID, workflow stage, or list name

trello task comment <id> "message text"
trello task comment <id> --file comment.txt     # Read comment from a file
trello task comment <id> --stdin                # Read comment from stdin (pipe) — both avoid shell-escaping issues

trello task label <id> <label-name-or-id>       # Add a label (matches by ID, name, or color)
trello task label <id> <label-name-or-id> --remove
```

### Labels

```bash
trello labels list                              # List all board labels
```

### Attachments

```bash
trello attachments list <task-id>
trello attachments download <task-id>
trello attachments download <task-id> --output ./my-attachments
```

### Global Options

```bash
--config-file <path>  # Override config file
--format <format>     # Output format: json (default), table, text
--debug               # Enable debug logging
```

**Tips for scripting / AI agents:**
- Use `--brief` to reduce token usage — it strips timestamps, URLs, and member IDs.
- Use `--format json` (the default) for structured parsing.
- Run `trello lists` first to discover list names/IDs before filtering by them.
- Use `--file`/`--stdin` for multiline comments instead of trying to escape them on the command line.

## MCP Server (wiring into Claude Code, Cursor, etc.)

The project ships an MCP server (`src/mcp.ts`) that exposes every Trello operation as a tool over JSON-RPC 2.0 stdio — no extra MCP SDK dependency required.

```bash
yarn dev:mcp             # run in dev mode
node dist/mcp.js         # run the built server
```

Wire it into an MCP-compatible client by pointing it at the built server and passing your board config via `BOARD_CONFIG`:

```json
{
  "mcpServers": {
    "trello": {
      "command": "node",
      "args": ["<path-to-project>/dist/mcp.js"],
      "env": {
        "BOARD_CONFIG": "<path-to-config>/myboard.config.board.json"
      }
    }
  }
}
```

For Claude Code specifically, add that block to your MCP configuration (`.mcp.json` or via `claude mcp add`); other MCP-compatible tools use an equivalent config file.

**Available tools:** `board_info`, `list_lists`, `list_tasks`, `get_task`, `move_task`, `move_tasks`, `add_comment`, `manage_label`, `list_labels`, `list_attachments`, `download_attachments`. Each mirrors the corresponding CLI command's options (see `src/mcp.ts` for exact input schemas).

## Generated & Sensitive Files

| File Pattern | Description |
|--------------|-------------|
| `*.config.board.json` | Board configuration — **contains your API key and token** |
| `.env` | Points to your config file path |
| `*.data.board.json` | Cached board data (auto-generated) |
| `.rate-limit.json` | Rate limit state (auto-generated) |
| `.attachments/` | Downloaded attachments |

All of these are gitignored by default. Never commit a real config file, token, or `.env` — if you fork or clone this repo, create your own config from scratch using the steps above.

Trello's rate limits are handled automatically (state persisted to `.rate-limit.json`) — nothing to configure.

## For Contributors

Contributions are welcome — bug reports, feature ideas, and pull requests. Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a PR, and see [`CLAUDE.md`](./CLAUDE.md) for a deeper architecture map if you're using an AI coding agent on this repo.

```bash
yarn dev <command>       # Run CLI in dev mode (tsx)
yarn dev:mcp             # Run MCP server in dev mode
yarn dev:watch           # Run CLI in dev mode with file watching
yarn build               # Build with tsup to dist/
yarn start <command>     # Run built CLI
yarn lint                # ESLint (yarn lint:fix to auto-fix)
yarn format              # Prettier (yarn format:check to verify only)
yarn typecheck           # Type check without emitting
```

The SDK is also usable directly in a Node/TypeScript app:

```typescript
import { createTrelloSdk } from 'trello-cli';

const sdk = await createTrelloSdk('./myboard.config.board.json');

const cards = await sdk.services.card.getAllCards();
const context = await sdk.services.card.getFullContext('card-id');
await sdk.services.card.moveCard('card-id', 'inProgress');
await sdk.services.comment.addComment('card-id', 'My comment');
const results = await sdk.services.attachment.downloadAttachments('card-id');
```

## License

[MIT](./LICENSE)
