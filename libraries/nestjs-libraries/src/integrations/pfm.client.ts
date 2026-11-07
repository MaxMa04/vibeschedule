import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { PfmMedia } from '@vibeschedule/nestjs-libraries/integrations/pfm.platforms';

export interface PfmSocialAccount {
  id: string;
  platform: string;
  username: string | null;
  profile_photo_url: string | null;
  status: 'connected' | 'disconnected';
}

export interface PfmPost {
  id: string;
  status: 'draft' | 'scheduled' | 'processing' | 'processed';
}

export interface PfmCreatePost {
  caption: string;
  media: PfmMedia[];
  social_accounts: string[];
  scheduled_at: string | null;
  platform_configurations?: Record<string, Record<string, unknown>>;
  external_id: string;
}

export interface PfmPostResult {
  post_id: string;
  social_account_id: string;
  success: boolean;
  error: unknown;
  platform_data: { id?: string; url?: string } | null;
}

export interface PfmFeedPost {
  social_post_id?: string;
  posted_at?: string;
  metrics?: Record<string, unknown>;
}

interface PfmWebhook {
  id: string;
  url: string;
  secret: string;
  event_types: string[];
}

interface PfmList<T> {
  data: T[];
  meta: { next: string | null; cursor?: string; has_more?: boolean };
}

export class PfmError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const RESULT_EVENT = 'social.post.result.created';

const webhookUrl = () => {
  const base = process.env.BACKEND_PUBLIC_URL || '';
  return base.startsWith('https://')
    ? `${base.replace(/\/+$/, '')}/public/pfm/webhook`
    : undefined;
};

const ignoreNotFound = (err: unknown): null => {
  if (err instanceof PfmError && err.status === 404) {
    return null;
  }
  throw err;
};

@Injectable()
export class PfmClient implements OnApplicationBootstrap {
  private readonly _logger = new Logger(PfmClient.name);
  private _webhookSecret?: string;
  private _webhookAttempt = 0;

  private async request<T>(
    method: string,
    path: string,
    options: {
      query?: Record<string, string | number | undefined>;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const url = new URL(
      (process.env.POST_FOR_ME_BASE_URL || 'https://api.postforme.dev/v1') +
        path
    );
    for (const [key, value] of Object.entries(options.query || {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.POST_FOR_ME_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });

    const text = await response.text();
    if (!response.ok) {
      // PfM puts the useful part in `errors`, `message` is often generic
      let message = text;
      try {
        const parsed = JSON.parse(text);
        message =
          [parsed.errors, parsed.message]
            .flat()
            .find((m) => typeof m === 'string' && m) || text;
      } catch {
        // not json, keep the raw body
      }
      throw new PfmError(response.status, message);
    }

    return (text ? JSON.parse(text) : undefined) as T;
  }

  // offset paginated lists
  private async listAll<T>(
    path: string,
    query: Record<string, string | undefined>
  ) {
    const all: T[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await this.request<PfmList<T>>('GET', path, {
        query: { ...query, offset, limit: 100 },
      });
      all.push(...page.data);
      if (!page.meta.next || !page.data.length) {
        return all;
      }
    }
  }

  async authUrl(
    platform: string,
    externalId: string,
    platformData?: Record<string, unknown>
  ) {
    const { url } = await this.request<{ url: string }>(
      'POST',
      '/social-accounts/auth-url',
      {
        body: {
          platform,
          external_id: externalId,
          permissions: ['posts', 'feeds'],
          ...(platformData ? { platform_data: platformData } : {}),
        },
      }
    );
    return url;
  }

  connectedAccounts() {
    return this.listAll<PfmSocialAccount>('/social-accounts', {
      status: 'connected',
    });
  }

  async disconnectAccount(id: string) {
    await this.request('POST', `/social-accounts/${id}/disconnect`).catch(
      ignoreNotFound
    );
  }

  createPost(body: PfmCreatePost) {
    return this.request<PfmPost>('POST', '/social-posts', { body });
  }

  updatePost(id: string, body: PfmCreatePost) {
    return this.request<PfmPost>('PUT', `/social-posts/${id}`, { body });
  }

  // null when PfM no longer has the post
  getPost(id: string) {
    return this.request<PfmPost>('GET', `/social-posts/${id}`).catch(
      ignoreNotFound
    );
  }

  async deletePost(id: string) {
    await this.request('DELETE', `/social-posts/${id}`).catch(ignoreNotFound);
  }

  postResults(postId: string) {
    return this.listAll<PfmPostResult>('/social-post-results', {
      post_id: postId,
    });
  }

  feed(
    accountId: string,
    query: { cursor?: string; social_post_id?: string; limit?: number }
  ) {
    return this.request<PfmList<PfmFeedPost>>(
      'GET',
      `/social-account-feeds/${accountId}`,
      { query: { ...query, expand: 'metrics' } }
    );
  }

  // A start while PfM was unreachable left no secret, so retry at most once a minute
  async isWebhookSecret(secret: string | undefined) {
    if (!this._webhookSecret && Date.now() - this._webhookAttempt > 60_000) {
      await this.ensureWebhook();
    }
    if (!this._webhookSecret || !secret) {
      return false;
    }
    const expected = Buffer.from(this._webhookSecret);
    const given = Buffer.from(secret);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }

  // PfM can only reach a public https URL, so local dev relies on the
  // reconcile in PostsService instead
  async onApplicationBootstrap() {
    if (!webhookUrl()) {
      this._logger.log('BACKEND_PUBLIC_URL is not https, PfM webhook skipped');
      return;
    }
    await this.ensureWebhook();
  }

  // Keeps exactly one result webhook for this deployment and remembers its secret
  private async ensureWebhook() {
    const url = webhookUrl();
    if (!url) {
      return;
    }

    this._webhookAttempt = Date.now();
    try {
      const [keep, ...extra] = await this.listAll<PfmWebhook>('/webhooks', {
        url,
      });
      for (const webhook of extra) {
        await this.request('DELETE', `/webhooks/${webhook.id}`);
      }

      const webhook = !keep
        ? await this.request<PfmWebhook>('POST', '/webhooks', {
            body: { url, event_types: [RESULT_EVENT] },
          })
        : keep.event_types.includes(RESULT_EVENT)
        ? keep
        : await this.request<PfmWebhook>('PATCH', `/webhooks/${keep.id}`, {
            body: { url, event_types: [...keep.event_types, RESULT_EVENT] },
          });

      this._webhookSecret = webhook.secret;
      this._logger.log(`PfM webhook ready for ${url}`);
    } catch (err) {
      this._logger.error(`PfM webhook registration failed: ${err}`);
    }
  }
}
