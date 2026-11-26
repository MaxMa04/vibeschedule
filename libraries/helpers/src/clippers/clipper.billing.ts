// What a clipper earns for one account in one month, by the rules in the
// clipping SOP (Notion "TikTok Clipping VibeLabs UG"):
// - the fee is per account and month and starts with the first post on it
// - a stopped or lost account is paid up to its last post
// - up to FREE_MISSED_POSTS missed posts per account and month are free,
//   every further one costs MISSED_POST_PENALTY_CENTS
export const FREE_MISSED_POSTS = 5;
export const MISSED_POST_PENALTY_CENTS = 100;
export const DEFAULT_MONTHLY_FEE_CENTS = 3000;
export const BILLING_TIME_ZONE = 'Europe/Berlin';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BILLING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD of an instant in Berlin */
export const billingDay = (date: Date | string) =>
  dayFormat.format(typeof date === 'string' ? new Date(date) : date);

/** YYYY-MM of an instant in Berlin */
export const billingMonth = (date: Date | string) =>
  billingDay(date).slice(0, 7);

export const isBillingMonth = (month: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(month);

const daysInMonth = (month: string) => {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
};

const dayOf = (month: string, day: number) =>
  `${month}-${String(day).padStart(2, '0')}`;

/** the first and last day of a month, YYYY-MM-DD */
export const monthBounds = (month: string) => ({
  first: dayOf(month, 1),
  last: dayOf(month, daysInMonth(month)),
});

export interface ClipperBillingInput {
  /** YYYY-MM */
  month: string;
  /** YYYY-MM-DD in Berlin, decides which days are over */
  today: string;
  monthlyFeeCents: number;
  postsPerDay: number;
  /** Berlin day of every post on the account, any month */
  postedDays: string[];
  /** the account is gone (disconnected or deleted), paid up to its last post */
  ended: boolean;
}

export interface ClipperBilling {
  /** days of the month the account is paid for */
  activeDays: number;
  /** posts in the month */
  posted: number;
  /** posts due on the days that are over */
  due: number;
  missed: number;
  /** missed posts beyond the free ones */
  charged: number;
  feeCents: number;
  penaltyCents: number;
  amountCents: number;
  /** the month is still running, the amount assumes the account keeps going */
  running: boolean;
}

export const clipperBilling = ({
  month,
  today,
  monthlyFeeCents,
  postsPerDay,
  postedDays,
  ended,
}: ClipperBillingInput): ClipperBilling => {
  const { first, last } = monthBounds(month);
  const sorted = [...postedDays].sort();
  const firstPost = sorted[0];
  const lastPost = sorted[sorted.length - 1];
  const inMonth = sorted.filter((day) => day >= first && day <= last);
  const running = today <= last && !ended;

  const start = firstPost && firstPost > first ? firstPost : first;
  const end = ended ? (lastPost && lastPost < last ? lastPost : last) : last;
  if (!firstPost || firstPost > last || start > end || today < first) {
    return {
      activeDays: 0,
      posted: inMonth.length,
      due: 0,
      missed: 0,
      charged: 0,
      feeCents: 0,
      penaltyCents: 0,
      amountCents: 0,
      running,
    };
  }

  const perDay = new Map<string, number>();
  for (const day of inMonth) {
    perDay.set(day, (perDay.get(day) || 0) + 1);
  }

  const total = daysInMonth(month);
  let activeDays = 0;
  let due = 0;
  let missed = 0;
  for (let d = 1; d <= total; d++) {
    const day = dayOf(month, d);
    if (day < start || day > end) {
      continue;
    }
    activeDays++;
    // today is not over yet, a post can still come
    if (day >= today) {
      continue;
    }
    due += postsPerDay;
    missed += Math.max(0, postsPerDay - (perDay.get(day) || 0));
  }

  const charged = Math.max(0, missed - FREE_MISSED_POSTS);
  const feeCents = Math.round((monthlyFeeCents * activeDays) / total);
  const penaltyCents = charged * MISSED_POST_PENALTY_CENTS;
  return {
    activeDays,
    posted: inMonth.length,
    due,
    missed,
    charged,
    feeCents,
    penaltyCents,
    amountCents: Math.max(0, feeCents - penaltyCents),
    running,
  };
};
