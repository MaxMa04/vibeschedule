import { readFileSync } from 'fs';
import { basename, extname } from 'path';

const DEFAULT_API_URL = 'https://vibeschedule.vibelabs.to/api';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
};

export function apiUrl() {
  return (process.env.VIBESCHEDULE_API_URL || DEFAULT_API_URL).replace(
    /\/+$/,
    ''
  );
}

export async function request(
  path: string,
  init: { method?: string; body?: unknown } = {}
) {
  const apiKey = process.env.VIBESCHEDULE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'VIBESCHEDULE_API_KEY fehlt. Den Schlüssel findest du in vibeschedule unter Einstellungen > API-Schlüssel.'
    );
  }

  const url = `${apiUrl()}/public/v1${path}`;
  const isForm = init.body instanceof FormData;
  const response = await fetch(url, {
    method: init.method || 'GET',
    headers: {
      Authorization: apiKey,
      ...(init.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
    },
    body: isForm
      ? (init.body as FormData)
      : init.body
      ? JSON.stringify(init.body)
      : undefined,
  }).catch((err: Error & { cause?: { code?: string } }) => {
    throw new Error(
      `Keine Verbindung zu ${url} (${err.cause?.code || err.message})`
    );
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API-Fehler ${response.status}: ${text.trim()}`);
  }
  return text ? JSON.parse(text) : null;
}

export function uploadFile(file: string) {
  const form = new FormData();
  form.append(
    'file',
    new Blob([readFileSync(file)], {
      type:
        MIME_TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    }),
    basename(file)
  );
  return request('/upload', { method: 'POST', body: form });
}
