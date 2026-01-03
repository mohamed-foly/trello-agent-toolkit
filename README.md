# Trello CLI

LLM-to-Trello interface CLI and SDK. Allows programmatic interaction with Trello boards.

## Installation

```bash
yarn install
yarn build
```

## Configuration

Create a board configuration file (e.g., `myboard.config.board.json`):

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

Set the config path via environment variable or use `--config-file` flag:

```bash
# Via environment variable
export BOARD_CONFIG=./myboard.config.board.json

# Or via flag
trello tasks list --config-file ./myboard.config.board.json
```

## CLI Usage

### List Tasks

```bash
# List all tasks (JSON output, auto-cached)
trello tasks list

# Filter by workflow stage
trello tasks list --stage todo

# Limit results
trello tasks list --limit 10

# Different output formats
trello tasks list --format table
trello tasks list --format text
```

### Get Task Details

```bash
# Get full task context (card, comments, attachments, checklists)
trello task get <card-id>

# Exclude specific data
trello task get <card-id> --no-comments
trello task get <card-id> --no-attachments
trello task get <card-id> --no-checklists
```

### Move Task

```bash
# Move by list ID
trello task move <card-id> <list-id>

# Move by workflow stage
trello task move <card-id> inProgress
trello task move <card-id> done

# Move by list name
trello task move <card-id> "Done"
```

### Add Comment

```bash
trello task comment <card-id> "Your comment text here"
```

### Attachments

```bash
# List attachments
trello attachments list <card-id>

# Download attachments
trello attachments download <card-id>

# Download to specific directory
trello attachments download <card-id> --output ./my-attachments
```

### Global Options

```bash
--config-file <path>  # Override config file
--format <format>     # Output format: json (default), table, text
--debug               # Enable debug logging
```

## SDK Usage

```typescript
import { createTrelloSdk } from 'trello-cli';

const sdk = await createTrelloSdk('./myboard.config.board.json');

// List all cards
const cards = await sdk.services.card.getAllCards();

// Get full task context
const context = await sdk.services.card.getFullContext('card-id');

// Move a card
await sdk.services.card.moveCard('card-id', 'inProgress');

// Add a comment
await sdk.services.comment.addComment('card-id', 'My comment');

// Download attachments
const results = await sdk.services.attachment.downloadAttachments('card-id');
```

## Development

```bash
# Run in dev mode
yarn dev <command>

# Watch mode
yarn dev:watch

# Build
yarn build

# Run built CLI
yarn start <command>

# Lint
yarn lint
yarn lint:fix

# Format
yarn format

# Type check
yarn typecheck
```

## Files

| File Pattern | Description |
|--------------|-------------|
| `*.config.board.json` | Board configuration (API keys, workflow) |
| `*.data.board.json` | Cached board data (auto-generated) |
| `.rate-limit.json` | Rate limit state (auto-generated) |
| `.attachments/` | Downloaded attachments |

All these files are gitignored by default.

## Getting Trello API Credentials

1. Get your API Key: https://trello.com/app-key
2. Generate a Token: Click "Token" link on the API key page
3. Find your Board ID: Open your board in browser, the ID is in the URL

## Rate Limiting

The CLI automatically handles Trello's rate limits:
- 100 requests per 10 seconds (per token)
- 300 requests per 10 seconds (per API key)

Rate limit state is persisted to `.rate-limit.json` for continuity across CLI invocations.
