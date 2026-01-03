import type { OutputFormat, TrelloCard, TrelloList, TaskContext } from '../types/index.js';

export function format<T>(data: T, outputFormat: OutputFormat = 'json'): string {
  switch (outputFormat) {
    case 'json':
      return formatJson(data);
    case 'table':
      return formatTable(data);
    case 'text':
      return formatText(data);
    default:
      return formatJson(data);
  }
}

function formatJson<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}

function formatTable<T>(data: T): string {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return 'No data';
    }

    if (isCardArray(data)) {
      return formatCardTable(data);
    }

    if (isListArray(data)) {
      return formatListTable(data);
    }

    return formatGenericTable(data);
  }

  if (isTaskContext(data)) {
    return formatTaskContextTable(data);
  }

  return formatJson(data);
}

function formatText<T>(data: T): string {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return 'No data';
    }

    if (isCardArray(data)) {
      return formatCardText(data);
    }

    return data.map((item) => formatItemText(item)).join('\n\n');
  }

  if (isTaskContext(data)) {
    return formatTaskContextText(data);
  }

  return formatJson(data);
}

function isCardArray(data: unknown[]): data is TrelloCard[] {
  return data.length > 0 && typeof data[0] === 'object' && data[0] !== null && 'idList' in data[0];
}

function isListArray(data: unknown[]): data is TrelloList[] {
  return (
    data.length > 0 && typeof data[0] === 'object' && data[0] !== null && 'idBoard' in data[0] && !('idList' in data[0])
  );
}

function isTaskContext(data: unknown): data is TaskContext {
  return typeof data === 'object' && data !== null && 'card' in data && 'list' in data;
}

function formatCardTable(cards: TrelloCard[]): string {
  const headers = ['ID', 'Name', 'Due', 'Labels'];
  const rows = cards.map((card) => [
    card.id,
    truncate(card.name, 40),
    card.due ? new Date(card.due).toLocaleDateString() : '-',
    card.labels.map((l) => l.name || l.color).join(', ') || '-',
  ]);

  return formatTableRows(headers, rows);
}

function formatListTable(lists: TrelloList[]): string {
  const headers = ['ID', 'Name', 'Position'];
  const rows = lists.map((list) => [list.id, list.name, String(list.pos)]);

  return formatTableRows(headers, rows);
}

function formatGenericTable(data: unknown[]): string {
  if (data.length === 0) return 'No data';

  const firstItem = data[0];
  if (typeof firstItem !== 'object' || firstItem === null) {
    return data.map(String).join('\n');
  }

  const keys = Object.keys(firstItem).slice(0, 5);
  const rows = data.map((item) =>
    keys.map((key) => truncate(String((item as Record<string, unknown>)[key] ?? ''), 30))
  );

  return formatTableRows(keys, rows);
}

function formatTableRows(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] || '').length)));

  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
  const separator = colWidths.map((w) => '-'.repeat(w)).join('-+-');
  const dataRows = rows.map((row) => row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | '));

  return [headerRow, separator, ...dataRows].join('\n');
}

function formatCardText(cards: TrelloCard[]): string {
  return cards
    .map((card, index) => {
      const lines = [`[${index + 1}] ${card.name}`, `    ID: ${card.id}`];

      if (card.due) {
        lines.push(`    Due: ${new Date(card.due).toLocaleDateString()}`);
      }

      if (card.labels.length > 0) {
        lines.push(`    Labels: ${card.labels.map((l) => l.name || l.color).join(', ')}`);
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

function formatTaskContextTable(context: TaskContext): string {
  const lines: string[] = [];

  lines.push('CARD');
  lines.push(`  ID: ${context.card.id}`);
  lines.push(`  Name: ${context.card.name}`);
  lines.push(`  List: ${context.list.name} (${context.workflowStage || 'unknown'})`);

  if (context.card.desc) {
    lines.push(`  Description: ${truncate(context.card.desc, 100)}`);
  }

  if (context.checklists.length > 0) {
    lines.push('\nCHECKLISTS');
    for (const checklist of context.checklists) {
      lines.push(`  ${checklist.name}`);
      for (const item of checklist.checkItems) {
        const status = item.state === 'complete' ? '[x]' : '[ ]';
        lines.push(`    ${status} ${item.name}`);
      }
    }
  }

  if (context.comments.length > 0) {
    lines.push('\nCOMMENTS');
    for (const comment of context.comments) {
      lines.push(`  ${comment.memberCreator.fullName} (${new Date(comment.date).toLocaleDateString()}):`);
      lines.push(`    ${comment.text}`);
    }
  }

  if (context.attachments.length > 0) {
    lines.push('\nATTACHMENTS');
    for (const attachment of context.attachments) {
      lines.push(`  - ${attachment.name} (${attachment.mimeType})`);
    }
  }

  return lines.join('\n');
}

function formatTaskContextText(context: TaskContext): string {
  return formatTaskContextTable(context);
}

function formatItemText(item: unknown): string {
  if (typeof item === 'object' && item !== null) {
    return Object.entries(item)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');
  }
  return String(item);
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
