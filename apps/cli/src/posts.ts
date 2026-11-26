import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

export interface CreatePostArgs {
  json?: string;
  content?: string;
  media?: string;
  integrations?: string;
  date?: string;
  type: 'draft' | 'schedule' | 'now';
  settings?: string;
  manual?: boolean;
  formatId?: string;
}

// --format takes a format ID or its name (names are unique per workspace)
export function resolveFormat(
  value: string,
  formats: { id: string; name: string }[]
) {
  const wanted = value.trim().toLowerCase();
  const format =
    formats.find((f) => f.id === value.trim()) ||
    formats.find((f) => f.name.trim().toLowerCase() === wanted);
  if (!format) {
    throw new Error(
      `Format "${value}" nicht gefunden. Vorhandene Formate: ${
        formats.map((f) => f.name).join(', ') || 'keine'
      }`
    );
  }
  return format.id;
}

function parseJson(text: string, label: string) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(
      `${label} ist kein gültiges JSON: ${(err as Error).message}`
    );
  }
}

export function buildPost(args: CreatePostArgs) {
  if (args.json) {
    return parseJson(readFileSync(args.json, 'utf-8'), args.json);
  }

  const image = (args.media || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((path) => ({ id: randomUUID(), path }));
  const settings = args.settings
    ? parseJson(args.settings, '--settings')
    : undefined;

  return {
    type: args.type,
    date: args.date || new Date().toISOString(),
    tags: [],
    creationMethod: 'CLI',
    posts: args
      .integrations!.split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => ({
        integration: { id },
        value: [{ content: args.content || '', image }],
        settings,
        ...(args.formatId ? { formatId: args.formatId } : {}),
        ...(args.manual ? { manual: true } : {}),
      })),
  };
}
