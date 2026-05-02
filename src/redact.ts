export function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!value || typeof value !== "object") return value;

  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      redacted[key] = "[redacted]";
    } else if (typeof entry === "string" && isUrlKey(key)) {
      redacted[key] = redactUrl(entry);
    } else if (typeof entry === "string" && looksSensitiveValue(key, entry)) {
      redacted[key] = "[redacted]";
    } else {
      redacted[key] = redactSensitiveFields(entry);
    }
  }
  return redacted;
}

function isSensitiveKey(key: string): boolean {
  if (/^token_type$/i.test(key)) return false;
  return /(^|_)(access_token|refresh_token|token|secret|password|credential|api_key|key)(_|$)/i.test(key);
}

function isUrlKey(key: string): boolean {
  return /url$/i.test(key);
}

function looksSensitiveValue(key: string, value: string): boolean {
  if (/avatar|photo|image|url/i.test(key)) return false;
  return /^(act\.|rft\.|cfat_|pfm_)/.test(value);
}

function redactUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  for (const param of Array.from(url.searchParams.keys())) {
    if (/(token|signature|sig|key|secret|expires|x-expires)/i.test(param)) {
      url.searchParams.set(param, "[redacted]");
    }
  }
  return url.toString();
}
