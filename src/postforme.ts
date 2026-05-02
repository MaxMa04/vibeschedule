import { ExternalApiError } from "./errors.js";

export interface PostForMeClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface CreateSocialPostInput {
  caption: string;
  social_accounts: string[];
  media?: Array<{ url: string; thumbnail_url?: string }>;
  scheduled_at?: string;
  external_id?: string;
  platform_configurations?: Record<string, unknown>;
}

export class PostForMeClient {
  private readonly baseUrl: string;

  constructor(private readonly options: PostForMeClientOptions) {
    this.baseUrl = (options.baseUrl ?? "https://api.postforme.dev/v1").replace(/\/+$/, "");
  }

  listSocialAccounts(params: { platform?: string; status?: string } = {}): Promise<unknown> {
    return this.request("/social-accounts", { query: params });
  }

  createSocialPost(input: CreateSocialPostInput): Promise<unknown> {
    return this.request("/social-posts", {
      method: "POST",
      body: input,
      retry: true,
    });
  }

  getSocialPost(id: string): Promise<unknown> {
    return this.request(`/social-posts/${encodeURIComponent(id)}`);
  }

  deleteSocialPost(id: string): Promise<unknown> {
    return this.request(`/social-posts/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  listPostResults(params: { post_id?: string }): Promise<unknown> {
    return this.request("/social-post-results", { query: params });
  }

  getSocialAccountFeed(socialAccountId: string, params: { expand?: string } = {}): Promise<unknown> {
    return this.request(`/social-account-feeds/${encodeURIComponent(socialAccountId)}`, { query: params });
  }

  private async request(
    path: string,
    options: {
      method?: string;
      query?: Record<string, string | undefined>;
      body?: unknown;
      retry?: boolean;
    } = {},
  ): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value) url.searchParams.set(key, value);
    }

    const attempts = options.retry ? 2 : 1;
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: options.method ?? "GET",
          headers: {
            Authorization: `Bearer ${this.options.apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });

        const text = await response.text();
        const parsed = text ? parseJson(text) : null;

        if (!response.ok) {
          const message = `Post4Me returned ${response.status}: ${text.slice(0, 1000)}`;
          if (response.status >= 500 && attempt < attempts) {
            lastError = new ExternalApiError(message, parsed);
            continue;
          }
          throw new ExternalApiError(message, parsed);
        }

        return parsed;
      } catch (error) {
        if (error instanceof ExternalApiError && error.exitCode !== 2) throw error;
        lastError = error;
        if (attempt >= attempts) break;
      }
    }

    throw lastError instanceof ExternalApiError
      ? lastError
      : new ExternalApiError(lastError instanceof Error ? lastError.message : String(lastError));
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function unwrapData(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: unknown[] }).data;
  }
  return [];
}
