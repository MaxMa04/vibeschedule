import { ClassConstructor } from 'class-transformer';
import { getMetadataStorage } from 'class-validator';
import { InstagramDto } from '@vibeschedule/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { FacebookDto } from '@vibeschedule/nestjs-libraries/dtos/posts/providers-settings/facebook.dto';
import { TikTokDto } from '@vibeschedule/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { YoutubeSettingsDto } from '@vibeschedule/nestjs-libraries/dtos/posts/providers-settings/youtube.settings.dto';
import { PinterestSettingsDto } from '@vibeschedule/nestjs-libraries/dtos/posts/providers-settings/pinterest.dto';
import { ThreadsDto } from '@vibeschedule/nestjs-libraries/dtos/posts/providers-settings/threads.dto';

export interface AnalyticsData {
  label: string;
  data: Array<{ total: string; date: string }>;
  percentageChange: number;
}

export interface PfmMedia {
  url: string;
  thumbnail_url?: string;
}

export interface CustomField {
  key: string;
  label: string;
  validation: string;
  type: 'text' | 'password';
}

// Editor settings use PfM's platform_configurations field names, so the DTO
// doubles as the whitelist of what gets forwarded.
export interface PfmPlatform {
  identifier: string;
  name: string;
  maxLength: number;
  dto?: ClassConstructor<object>;
  // asked in the connect dialog and passed to PfM as platform_data
  customFields?: CustomField[];
  platformData?: (fields: Record<string, string>) => Record<string, unknown>;
  mediaError?: (media: { path: string }[]) => string | undefined;
  // dot paths into the PfM feed metrics
  metrics: Array<{ path: string; label: string }>;
}

const requireMedia = (name: string) => (media: { path: string }[]) =>
  media.length ? undefined : `${name} braucht mindestens ein Bild oder Video.`;

const tiktok: Omit<PfmPlatform, 'identifier' | 'name' | 'metrics'> = {
  maxLength: 2200,
  dto: TikTokDto,
  mediaError: requireMedia('TikTok'),
};

export const pfmPlatforms: PfmPlatform[] = [
  {
    identifier: 'x',
    name: 'X',
    maxLength: 280,
    platformData: () => ({ x: { connection_type: 'oauth2' } }),
    metrics: [
      { path: 'public_metrics.impression_count', label: 'Impressionen' },
      { path: 'public_metrics.like_count', label: 'Likes' },
      { path: 'public_metrics.reply_count', label: 'Antworten' },
      { path: 'public_metrics.retweet_count', label: 'Reposts' },
      { path: 'public_metrics.quote_count', label: 'Zitate' },
      { path: 'public_metrics.bookmark_count', label: 'Lesezeichen' },
    ],
  },
  {
    identifier: 'linkedin',
    name: 'LinkedIn',
    maxLength: 3000,
    // PfM's own app credentials only work with the organization connection
    platformData: () => ({ linkedin: { connection_type: 'organization' } }),
    metrics: [
      { path: 'impressionCount', label: 'Impressionen' },
      { path: 'likeCount', label: 'Likes' },
      { path: 'commentCount', label: 'Kommentare' },
      { path: 'shareCount', label: 'Geteilt' },
      { path: 'clickCount', label: 'Klicks' },
    ],
  },
  {
    identifier: 'instagram',
    name: 'Instagram',
    maxLength: 2200,
    dto: InstagramDto,
    platformData: () => ({ instagram: { connection_type: 'instagram' } }),
    mediaError: requireMedia('Instagram'),
    metrics: [
      { path: 'views', label: 'Aufrufe' },
      { path: 'reach', label: 'Reichweite' },
      { path: 'likes', label: 'Likes' },
      { path: 'comments', label: 'Kommentare' },
      { path: 'shares', label: 'Geteilt' },
      { path: 'saved', label: 'Gespeichert' },
    ],
  },
  {
    identifier: 'facebook',
    name: 'Facebook',
    maxLength: 63206,
    dto: FacebookDto,
    metrics: [
      { path: 'reach', label: 'Reichweite' },
      { path: 'media_views', label: 'Aufrufe' },
      { path: 'reactions_total', label: 'Reaktionen' },
      { path: 'comments', label: 'Kommentare' },
      { path: 'shares', label: 'Geteilt' },
    ],
  },
  {
    identifier: 'threads',
    name: 'Threads',
    maxLength: 500,
    dto: ThreadsDto,
    metrics: [
      { path: 'views', label: 'Aufrufe' },
      { path: 'likes', label: 'Likes' },
      { path: 'replies', label: 'Antworten' },
      { path: 'reposts', label: 'Reposts' },
      { path: 'quotes', label: 'Zitate' },
    ],
  },
  {
    identifier: 'tiktok',
    name: 'TikTok',
    ...tiktok,
    metrics: [
      { path: 'view_count', label: 'Aufrufe' },
      { path: 'like_count', label: 'Likes' },
      { path: 'comment_count', label: 'Kommentare' },
      { path: 'share_count', label: 'Geteilt' },
    ],
  },
  {
    identifier: 'tiktok_business',
    name: 'TikTok Business',
    ...tiktok,
    metrics: [
      { path: 'video_views', label: 'Aufrufe' },
      { path: 'reach', label: 'Reichweite' },
      { path: 'likes', label: 'Likes' },
      { path: 'comments', label: 'Kommentare' },
      { path: 'shares', label: 'Geteilt' },
      { path: 'favorites', label: 'Favoriten' },
    ],
  },
  {
    identifier: 'youtube',
    name: 'YouTube',
    maxLength: 5000,
    dto: YoutubeSettingsDto,
    mediaError: (media) =>
      media.length === 1 && media[0].path.toLowerCase().endsWith('.mp4')
        ? undefined
        : 'YouTube braucht genau ein Video.',
    metrics: [
      { path: 'views', label: 'Aufrufe' },
      { path: 'likes', label: 'Likes' },
      { path: 'comments', label: 'Kommentare' },
      { path: 'shares', label: 'Geteilt' },
      { path: 'subscribersGained', label: 'Neue Abonnenten' },
    ],
  },
  {
    identifier: 'pinterest',
    name: 'Pinterest',
    maxLength: 500,
    dto: PinterestSettingsDto,
    mediaError: requireMedia('Pinterest'),
    metrics: [
      { path: 'lifetime_metrics.impression', label: 'Impressionen' },
      { path: 'lifetime_metrics.save', label: 'Gespeichert' },
      { path: 'lifetime_metrics.pin_click', label: 'Pin-Klicks' },
      { path: 'lifetime_metrics.outbound_click', label: 'Link-Klicks' },
    ],
  },
  {
    identifier: 'bluesky',
    name: 'Bluesky',
    maxLength: 300,
    customFields: [
      {
        key: 'handle',
        label: 'Handle (z. B. name.bsky.social)',
        validation: '/^.+$/',
        type: 'text',
      },
      {
        key: 'app_password',
        label: 'App-Passwort',
        validation: '/^.{3,}$/',
        type: 'password',
      },
    ],
    platformData: (fields) => ({
      bluesky: { handle: fields.handle, app_password: fields.app_password },
    }),
    metrics: [
      { path: 'likeCount', label: 'Likes' },
      { path: 'replyCount', label: 'Antworten' },
      { path: 'repostCount', label: 'Reposts' },
      { path: 'quoteCount', label: 'Zitate' },
    ],
  },
];

export const getPfmPlatform = (identifier: string) =>
  pfmPlatforms.find((p) => p.identifier === identifier);

export const toPlatformConfiguration = (
  platform: PfmPlatform,
  settings: Record<string, unknown>
) => {
  if (!platform.dto) {
    return undefined;
  }
  const fields = new Set(
    getMetadataStorage()
      .getTargetValidationMetadatas(platform.dto, '', true, false)
      .map((m) => m.propertyName)
  );
  return Object.fromEntries(
    Object.entries(settings).filter(
      ([key, value]) =>
        fields.has(key) &&
        value !== undefined &&
        value !== '' &&
        !(Array.isArray(value) && !value.length)
    )
  );
};
