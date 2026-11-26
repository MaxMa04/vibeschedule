import {
  DEFAULT_MONTHLY_FEE_CENTS,
  FREE_MISSED_POSTS,
  MISSED_POST_PENALTY_CENTS,
} from '@vibeschedule/helpers/clippers/clipper.billing';
import {
  WARMUP_DAYS,
  WARMUP_MINUTES,
} from '@vibeschedule/helpers/clippers/clipper.onboarding';

// The offer on the public page /clipping, by the clipping SOP (Notion
// "TikTok Clipping VibeLabs UG"). The numbers come from the billing and
// onboarding rules, so the page never promises something else than we pay.
export const MAX_OFFER_ACCOUNTS = 3;

export const CLIPPER_DEVICES = ['iphone', 'android'] as const;
export type ClipperDevice = (typeof CLIPPER_DEVICES)[number];

export const clipperOffer = () => ({
  feeCents: DEFAULT_MONTHLY_FEE_CENTS,
  maxAccounts: MAX_OFFER_ACCOUNTS,
  postsPerDay: 1,
  freeMissedPosts: FREE_MISSED_POSTS,
  missedPostPenaltyCents: MISSED_POST_PENALTY_CENTS,
  warmupDays: WARMUP_DAYS,
  warmupMinutes: WARMUP_MINUTES,
});

export type ClipperOffer = ReturnType<typeof clipperOffer>;
