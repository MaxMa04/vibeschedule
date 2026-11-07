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
      })),
  };
}
