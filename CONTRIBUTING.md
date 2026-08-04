# Contributing

Thanks for considering a contribution to Trello CLI. This project is board-agnostic by design — keep changes generic and config-driven rather than tailored to any one team's board.

## Getting Started

1. Fork and clone the repo.
2. `yarn install`
3. Create your own board config (see the [README](./README.md#configuration)) — never use or commit a teammate's real config, tokens, or board IDs.
4. `yarn dev <command>` to run the CLI against your test board while developing.

## Before Opening a PR

Run these locally and make sure they pass:

```bash
yarn typecheck
yarn lint
yarn format:check
yarn build
```

## Guidelines

- **No secrets in commits or PR descriptions.** Never paste real API keys, tokens, board IDs, or contents of `*.config.board.json` / `*.data.board.json` files, even in a code block for illustration. Use placeholders like `your-api-key`.
- **Keep it board-agnostic.** Don't hardcode list names, board IDs, or workflow stage names into source code — those belong in the user's config file.
- **Match existing patterns.** New CLI commands live under `src/commands/<group>/`, business logic goes in `src/services/`, and both the CLI and MCP server (`src/mcp.ts`) should expose the same capability where it makes sense — check `CLAUDE.md` for the architecture map.
- **Small, focused PRs.** Prefer one feature/fix per PR over bundling unrelated changes.
- **Describe the "why."** In your PR description, explain the motivation and any tradeoffs, not just what changed.

## Reporting Bugs / Requesting Features

Open a GitHub issue using the provided templates. Include your Node version, OS, and the exact command you ran (with any real credentials or IDs redacted).

## Code of Conduct

Be respectful and constructive. Assume good faith, disagree on substance, and keep feedback focused on the code and ideas, not the person.
