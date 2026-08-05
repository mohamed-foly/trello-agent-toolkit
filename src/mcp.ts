#!/usr/bin/env node

import 'dotenv/config';
import { createTrelloSdk } from './index.js';
import { formatBriefCards, formatBriefTaskContext } from './utils/formatter.js';
import { setDebugEnabled, setLogFile, debug, error as logError } from './utils/logger.js';
import type { TrelloCard } from './types/index.js';

// MCP diagnostics are silent by default (stdout is reserved for JSON-RPC) — opt in with
// MCP_DEBUG=true and/or MCP_LOG_FILE=<path>. Setting a log file implies you want it used.
setDebugEnabled(process.env.MCP_DEBUG === 'true' || Boolean(process.env.MCP_LOG_FILE));
setLogFile(process.env.MCP_LOG_FILE);

// --- MCP JSON-RPC types ---

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// --- Tool definitions ---

const TOOLS: McpToolDefinition[] = [
  {
    name: 'board_info',
    description: 'Get board details including id, name, description, and URL',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_lists',
    description: 'List all columns/lists on the Trello board with card counts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks from the board with optional filtering by list name, list ID, or workflow stage',
    inputSchema: {
      type: 'object',
      properties: {
        list: { type: 'string', description: 'Filter by list name (e.g., "BackEnd")' },
        listId: { type: 'string', description: 'Filter by list ID' },
        stage: { type: 'string', description: 'Filter by workflow stage (todo, inProgress, testing, done)' },
        limit: { type: 'number', description: 'Limit number of results' },
        brief: { type: 'boolean', description: 'Return concise format (id, name, list, labels only)' },
      },
    },
  },
  {
    name: 'get_task',
    description: 'Get full task context including comments, attachments, and checklists',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Card/task ID' },
        comments: { type: 'boolean', description: 'Include comments (default: true)' },
        attachments: { type: 'boolean', description: 'Include attachments (default: true)' },
        checklists: { type: 'boolean', description: 'Include checklists (default: true)' },
        brief: { type: 'boolean', description: 'Return concise format (id, name, desc, list, labels, comments text)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'move_task',
    description: 'Move a single task to another list (by list ID, name, or workflow stage)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Card/task ID' },
        list: { type: 'string', description: 'Destination list ID, name, or workflow stage' },
      },
      required: ['id', 'list'],
    },
  },
  {
    name: 'move_tasks',
    description: 'Move multiple tasks to another list. Provide card IDs or use "from" to move all cards from a source list.',
    inputSchema: {
      type: 'object',
      properties: {
        cardIds: { type: 'array', items: { type: 'string' }, description: 'Array of card IDs to move' },
        from: { type: 'string', description: 'Source list name or ID (moves all cards from this list)' },
        to: { type: 'string', description: 'Destination list name or ID (required)' },
      },
      required: ['to'],
    },
  },
  {
    name: 'add_comment',
    description: 'Add a comment to a task',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Card/task ID' },
        text: { type: 'string', description: 'Comment text' },
      },
      required: ['id', 'text'],
    },
  },
  {
    name: 'manage_label',
    description: 'Add or remove a label from a task (by label ID, name, or color)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Card/task ID' },
        label: { type: 'string', description: 'Label ID, name, or color' },
        remove: { type: 'boolean', description: 'Remove the label instead of adding it (default: false)' },
      },
      required: ['id', 'label'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new card/task in a list with optional labels',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Card title' },
        list: { type: 'string', description: 'Destination list name or ID' },
        desc: { type: 'string', description: 'Card description (markdown supported)' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Array of label names/IDs/colors to attach after creation' },
      },
      required: ['name', 'list'],
    },
  },
  {
    name: 'create_tasks',
    description: 'Create multiple cards/tasks in bulk with optional labels (saves API calls vs multiple create_task)',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Card title' },
              list: { type: 'string', description: 'Destination list name or ID' },
              desc: { type: 'string', description: 'Card description' },
              labels: { type: 'array', items: { type: 'string' }, description: 'Label names/IDs/colors' },
            },
            required: ['name', 'list'],
          },
          description: 'Array of tasks to create',
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'update_task',
    description: 'Update a card name, description, or archive it',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Card/task ID' },
        name: { type: 'string', description: 'New card title' },
        desc: { type: 'string', description: 'New card description' },
        closed: { type: 'boolean', description: 'Archive the card (true) or unarchive (false)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_list',
    description: 'Create a new list/column on the board',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'List name' },
        pos: { type: 'string', description: 'Position: top, bottom, or a number' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_label',
    description: 'Update a label name or color',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Label ID' },
        name: { type: 'string', description: 'New label name' },
        color: { type: 'string', description: 'New label color' },
      },
      required: ['id'],
    },
  },
  {
    name: 'upload_attachment',
    description: 'Upload a local file as an attachment to a card',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Card/task ID' },
        file: { type: 'string', description: 'Absolute path to the local file to upload' },
        name: { type: 'string', description: 'Optional display name for the attachment' },
      },
      required: ['id', 'file'],
    },
  },
  {
    name: 'list_labels',
    description: 'List all labels available on the board',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_attachments',
    description: 'List attachments for a task',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Card/task ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'download_attachments',
    description: 'Download attachments for a task to a local directory',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Card/task ID' },
        output: { type: 'string', description: 'Output directory for attachments' },
      },
      required: ['id'],
    },
  },
];

// --- SDK singleton (lazy init) ---

let sdkInstance: Awaited<ReturnType<typeof createTrelloSdk>> | null = null;

async function getSdk() {
  if (!sdkInstance) {
    sdkInstance = await createTrelloSdk();
  }
  return sdkInstance;
}

// --- Tool handlers ---

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  const sdk = await getSdk();

  switch (name) {
    case 'board_info': {
      const board = await sdk.services.board.getBoard();
      return {
        id: board.id,
        name: board.name,
        desc: board.desc,
        url: board.url,
        shortUrl: board.shortUrl,
        prefs: board.prefs,
      };
    }

    case 'list_lists': {
      const [lists, cards] = await Promise.all([
        sdk.services.list.getAllLists(),
        sdk.services.card.getAllCards(),
      ]);
      return lists.map((list) => ({
        id: list.id,
        name: list.name,
        cardCount: cards.filter((card) => card.idList === list.id).length,
      }));
    }

    case 'list_tasks': {
      const lists = await sdk.services.list.getAllLists();
      let cards: TrelloCard[];

      if (args.listId) {
        const allCards = await sdk.services.card.getAllCards();
        cards = allCards.filter((card) => card.idList === args.listId);
      } else if (args.list) {
        const targetList = lists.find(
          (l) => l.name.toLowerCase() === (args.list as string).toLowerCase()
        );
        if (!targetList) {
          return { error: true, message: `List not found: ${args.list}`, availableLists: lists.map((l) => l.name) };
        }
        const allCards = await sdk.services.card.getAllCards();
        cards = allCards.filter((card) => card.idList === targetList.id);
      } else if (args.stage) {
        cards = await sdk.services.card.getCardsByStage(args.stage as string);
      } else {
        cards = await sdk.services.card.getAllCards();
      }

      if (typeof args.limit === 'number' && args.limit > 0) {
        cards = cards.slice(0, args.limit);
      }

      if (args.brief) {
        return formatBriefCards(cards, lists);
      }
      return cards;
    }

    case 'get_task': {
      const context = await sdk.services.card.getFullContext(args.id as string, {
        includeComments: args.comments !== false,
        includeAttachments: args.attachments !== false,
        includeChecklists: args.checklists !== false,
      });

      if (args.brief) {
        return formatBriefTaskContext(context);
      }
      return context;
    }

    case 'move_task': {
      const updatedCard = await sdk.services.card.moveCard(args.id as string, args.list as string);
      return updatedCard;
    }

    case 'move_tasks': {
      const to = args.to as string;
      const lists = await sdk.services.list.getAllLists();
      const availableLists = lists.map((l) => l.name);

      const destListId = await sdk.services.list.getListIdByNameOrId(to);
      if (!destListId) {
        return { error: true, message: `Destination list not found: ${to}`, availableLists };
      }

      let cardsToMove: TrelloCard[];

      if (args.from) {
        const sourceListId = await sdk.services.list.getListIdByNameOrId(args.from as string);
        if (!sourceListId) {
          return { error: true, message: `Source list not found: ${args.from}`, availableLists };
        }
        const allCards = await sdk.services.card.getAllCards();
        cardsToMove = allCards.filter((card) => card.idList === sourceListId);
      } else if (Array.isArray(args.cardIds) && args.cardIds.length > 0) {
        const allCards = await sdk.services.card.getAllCards();
        cardsToMove = allCards.filter((card) => (args.cardIds as string[]).includes(card.id));
      } else {
        return { error: true, message: 'Either provide cardIds or use "from" to specify source list' };
      }

      const result = { moved: 0, failed: 0, cards: [] as { id: string; name: string; success: boolean; error?: string }[] };

      for (const card of cardsToMove) {
        try {
          await sdk.services.card.moveCard(card.id, destListId);
          result.moved++;
          result.cards.push({ id: card.id, name: card.name, success: true });
        } catch (err) {
          result.failed++;
          result.cards.push({ id: card.id, name: card.name, success: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
      return result;
    }

    case 'create_task': {
      const card = await sdk.services.card.createCard(
        args.list as string,
        args.name as string,
        args.desc as string | undefined,
      );
      const attachedLabels: string[] = [];
      if (Array.isArray(args.labels)) {
        for (const l of args.labels as string[]) {
          const labelId = await sdk.services.label.resolveLabelId(l);
          if (labelId) {
            await sdk.services.label.addLabelToCard(card.id, labelId);
            attachedLabels.push(l);
          }
        }
      }
      return { id: card.id, name: card.name, url: card.url, shortUrl: card.shortUrl, labels: attachedLabels };
    }

    case 'create_tasks': {
      if (!Array.isArray(args.tasks) || args.tasks.length === 0) {
        return { error: true, message: 'tasks must be a non-empty array' };
      }

      const result = {
        created: 0,
        failed: 0,
        tasks: [] as {
          success: boolean;
          id?: string;
          name: string;
          url?: string;
          shortUrl?: string;
          labels?: string[];
          error?: string;
        }[],
      };

      for (const task of args.tasks as Array<Record<string, unknown>>) {
        const taskName = String(task.name ?? '');
        try {
          const card = await sdk.services.card.createCard(
            task.list as string,
            taskName,
            task.desc as string | undefined,
          );
          const attachedLabels: string[] = [];
          if (Array.isArray(task.labels)) {
            for (const l of task.labels as string[]) {
              const labelId = await sdk.services.label.resolveLabelId(l);
              if (labelId) {
                await sdk.services.label.addLabelToCard(card.id, labelId);
                attachedLabels.push(l);
              }
            }
          }

          result.created++;
          result.tasks.push({
            success: true,
            id: card.id,
            name: card.name,
            url: card.url,
            shortUrl: card.shortUrl,
            labels: attachedLabels,
          });
        } catch (err) {
          result.failed++;
          result.tasks.push({
            success: false,
            name: taskName,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return result;
    }

    case 'update_task': {
      const update: Record<string, unknown> = {};
      if (typeof args.name === 'string') update.name = args.name;
      if (typeof args.desc === 'string') update.desc = args.desc;
      if (typeof args.closed === 'boolean') update.closed = args.closed;

      if (Object.keys(update).length === 0) {
        return { error: true, message: 'Provide at least one of: name, desc, closed' };
      }

      const card = await sdk.client.put<TrelloCard>(`/cards/${args.id as string}`, update);
      sdk.cache.invalidateCards();
      return {
        id: card.id,
        name: card.name,
        desc: card.desc,
        closed: card.closed,
        url: card.url,
        shortUrl: card.shortUrl,
      };
    }

    case 'create_list': {
      const boardId = sdk.config.boardId;
      const posArg = args.pos;
      const pos =
        typeof posArg === 'number'
          ? posArg
          : typeof posArg === 'string' && !Number.isNaN(Number(posArg))
            ? Number(posArg)
            : (posArg as string | undefined);

      const createdList = await sdk.client.post<{ id: string; name: string; pos: number; closed: boolean }>(
        `/boards/${boardId}/lists`,
        undefined,
        { name: args.name as string, pos },
      );
      sdk.cache.invalidateLists();
      return {
        id: createdList.id,
        name: createdList.name,
        pos: createdList.pos,
        closed: createdList.closed,
      };
    }

    case 'update_label': {
      const update: Record<string, unknown> = {};
      if (typeof args.name === 'string') update.name = args.name;
      if (typeof args.color === 'string') update.color = args.color;

      if (Object.keys(update).length === 0) {
        return { error: true, message: 'Provide at least one of: name, color' };
      }

      const label = await sdk.client.put<{ id: string; name: string; color: string }>(
        `/labels/${args.id as string}`,
        update,
      );
      // Cards embed full label objects (name/color), so any cached card is now stale.
      sdk.cache.invalidateCards();
      return { id: label.id, name: label.name, color: label.color };
    }

    case 'upload_attachment': {
      const attachment = await sdk.services.card.addAttachmentToCard(
        args.id as string,
        args.file as string,
        args.name as string | undefined,
      );
      return { id: attachment.id, name: attachment.name, url: attachment.url, bytes: attachment.bytes };
    }

    case 'add_comment': {
      const action = await sdk.services.comment.addComment(args.id as string, args.text as string);
      return { success: true, commentId: action.id };
    }

    case 'manage_label': {
      const labelId = await sdk.services.label.resolveLabelId(args.label as string);
      if (!labelId) {
        return { error: true, message: `Label not found: ${args.label}`, availableLabels: await sdk.services.label.getBoardLabels() };
      }

      if (args.remove) {
        await sdk.services.label.removeLabelFromCard(args.id as string, labelId);
        return { success: true, action: 'removed', cardId: args.id, labelId };
      } else {
        await sdk.services.label.addLabelToCard(args.id as string, labelId);
        return { success: true, action: 'added', cardId: args.id, labelId };
      }
    }

    case 'list_labels': {
      return await sdk.services.label.getBoardLabels();
    }

    case 'list_attachments': {
      return await sdk.services.attachment.listAttachments(args.id as string);
    }

    case 'download_attachments': {
      return await sdk.services.attachment.downloadAttachments(args.id as string, args.output as string | undefined);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- JSON-RPC transport over stdio ---

function sendResponse(response: JsonRpcResponse | JsonRpcNotification): void {
  const json = JSON.stringify(response);
  debug(`sending response: ${json.substring(0, 200)}`);
  process.stdout.write(json + '\n');
}

function makeResult(id: number | string, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function makeError(id: number | string | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

async function handleRequest(request: JsonRpcRequest): Promise<void> {
  const { id, method, params } = request;

  switch (method) {
    case 'initialize': {
      const clientProtocol = (params?.protocolVersion as string) || '2024-11-05';
      debug(`client protocol version: ${clientProtocol}`);
      sendResponse(makeResult(id, {
        protocolVersion: clientProtocol,
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'trello-mcp',
          version: '1.0.0',
        },
      }));
      break;
    }

    case 'tools/list': {
      sendResponse(makeResult(id, { tools: TOOLS }));
      break;
    }

    case 'tools/call': {
      const toolName = params?.name as string;
      const toolArgs = (params?.arguments as Record<string, unknown>) || {};

      if (!toolName) {
        sendResponse(makeError(id, -32602, 'Missing tool name'));
        return;
      }

      const tool = TOOLS.find((t) => t.name === toolName);
      if (!tool) {
        sendResponse(makeError(id, -32602, `Unknown tool: ${toolName}`));
        return;
      }

      try {
        const result = await handleToolCall(toolName, toolArgs);
        sendResponse(makeResult(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }));
      } catch (err) {
        sendResponse(makeResult(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                message: err instanceof Error ? err.message : String(err),
              }, null, 2),
            },
          ],
          isError: true,
        }));
      }
      break;
    }

    case 'notifications/initialized':
    case 'notifications/cancelled': {
      // Client notifications - no response needed
      break;
    }

    default: {
      sendResponse(makeError(id, -32601, `Method not found: ${method}`));
    }
  }
}

// --- Stdin parser for Content-Length framed messages ---

function startServer(): void {
  debug('trello-mcp server starting');
  debug(`BOARD_CONFIG=${process.env.BOARD_CONFIG || '(not set)'}`);
  debug(`cwd=${process.cwd()}`);
  debug(`node=${process.version}`);

  let buffer = '';
  // Tracks in-flight tools/call work so stdin closing doesn't exit the process
  // while a request is still awaiting a Trello API response.
  const pendingRequests = new Set<Promise<void>>();

  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk: string) => {
    debug(`stdin data received: ${chunk.length} bytes`);
    buffer += chunk;

    while (true) {
      // Try Content-Length framing first
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const header = buffer.substring(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (match) {
          const contentLength = parseInt(match[1], 10);
          const bodyStart = headerEnd + 4;
          const bodyEnd = bodyStart + contentLength;

          if (buffer.length < bodyEnd) break; // wait for more data

          const body = buffer.substring(bodyStart, bodyEnd);
          buffer = buffer.substring(bodyEnd);
          processMessage(body);
          continue;
        }
      }

      // Fallback: newline-delimited JSON (used by Claude Code CLI)
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx === -1) break;

      const line = buffer.substring(0, newlineIdx).trim();
      buffer = buffer.substring(newlineIdx + 1);

      if (line.length === 0) continue; // skip empty lines
      if (line.startsWith('Content-Length')) continue; // skip stray headers

      processMessage(line);
    }
  });

  function processMessage(body: string): void {
    debug(`processing: ${body.substring(0, 200)}`);
    try {
      const request = JSON.parse(body) as JsonRpcRequest;
      debug(`handling method: ${request.method} (id=${request.id})`);
      const pending: Promise<void> = handleRequest(request)
        .catch((err) => {
          logError(`handleRequest error: ${err}`);
          if (request.id !== undefined) {
            sendResponse(makeError(request.id, -32603, err instanceof Error ? err.message : String(err)));
          }
        })
        .finally(() => pendingRequests.delete(pending));
      pendingRequests.add(pending);
    } catch (e) {
      logError(`JSON parse error: ${e}`);
      sendResponse(makeError(null, -32700, 'Parse error'));
    }
  }

  process.stdin.on('end', () => {
    debug(`stdin ended, waiting for ${pendingRequests.size} in-flight request(s) before exiting`);
    Promise.allSettled([...pendingRequests]).then(() => {
      debug('all in-flight requests settled, exiting');
      process.exit(0);
    });
  });

  process.stdin.on('error', (err) => {
    logError(`stdin error: ${err}`);
  });

  process.stdout.on('error', (err) => {
    logError(`stdout error: ${err}`);
  });

  // Prevent unhandled rejections from crashing the server
  process.on('unhandledRejection', (err) => {
    logError(`unhandled rejection: ${err}`);
  });

  process.on('uncaughtException', (err) => {
    logError(`uncaught exception: ${err.stack || err}`);
  });

  debug('trello-mcp server ready, waiting for input on stdin');
}

startServer();
