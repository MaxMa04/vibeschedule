// The steps a clipper goes through for each account, by the Notion guide
// "TikTok Clipping: Accounts erstellen und aufwärmen":
// - at most one new account per day, in the order of the accounts
// - WARMUP_DAYS days of scrolling in the niche, no posts, one check per day
//   (the day the account was created counts as the first)
// - the For You page shows the niche, then connect and post daily from the
//   day after the last warm-up day
// Days are Berlin days (YYYY-MM-DD), see billingDay in clipper.billing.ts.
export const WARMUP_DAYS = 3;
export const WARMUP_MINUTES = 20;

export type TaskState = 'done' | 'open' | 'locked';

export type AccountTaskKey =
  | 'create'
  | `warmup_${number}`
  | 'fyp'
  | 'connect'
  | 'post';

export type LockReason =
  /** we have not handed out the profile yet */
  | 'profile'
  /** the account before this one comes first */
  | 'previous'
  /** a step can only be done on a later day */
  | 'day'
  /** the step before is not done */
  | 'step';

export interface AccountTask {
  key: AccountTaskKey;
  state: TaskState;
  lock?: LockReason;
  /** the day a locked step opens, for lock 'day' */
  from?: string;
}

export type AccountStage =
  | 'profile'
  | 'waiting'
  | 'create'
  | 'warmup'
  | 'fyp'
  | 'connect'
  | 'active'
  | 'reconnect';

export interface OnboardingAccountInput {
  id: string;
  /** name, username and picture are there */
  profileReady: boolean;
  /** day the account was created in TikTok */
  createdDay: string | null;
  /** days a warm-up was checked off */
  warmupDays: string[];
  fypOk: boolean;
  connection: 'none' | 'active' | 'disconnected';
}

export interface AccountPlan {
  id: string;
  stage: AccountStage;
  tasks: AccountTask[];
  /** warm-up days done */
  warmups: number;
}

/** YYYY-MM-DD plus n days */
export const addDays = (day: string, n: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};

const warmupKey = (n: number): AccountTaskKey => `warmup_${n}`;

export const isWarmupKey = (key: string) => /^warmup_\d+$/.test(key);

const stageOf = (tasks: AccountTask[], input: OnboardingAccountInput) => {
  if (input.connection === 'active') {
    return 'active';
  }
  if (input.connection === 'disconnected') {
    return 'reconnect';
  }
  const next = tasks.find((task) => task.state !== 'done');
  if (!next || next.key === 'post') {
    return 'active';
  }
  if (next.key === 'create') {
    return next.lock === 'profile'
      ? 'profile'
      : next.state === 'open'
      ? 'create'
      : 'waiting';
  }
  if (isWarmupKey(next.key)) {
    return 'warmup';
  }
  return next.key as 'fyp' | 'connect';
};

const planOne = (
  input: OnboardingAccountInput,
  today: string,
  // when the account before was created, undefined for the first account;
  // null: not created yet
  previousCreated: string | null | undefined
): AccountPlan => {
  // an account that is connected went through everything (also accounts
  // connected before this onboarding existed)
  if (input.connection !== 'none') {
    const tasks: AccountTask[] = [
      { key: 'create', state: 'done' },
      ...Array.from({ length: WARMUP_DAYS }, (_, i) => ({
        key: warmupKey(i + 1),
        state: 'done' as const,
      })),
      { key: 'fyp', state: 'done' },
      {
        key: 'connect',
        state: input.connection === 'active' ? 'done' : 'open',
      },
      { key: 'post', state: input.connection === 'active' ? 'open' : 'locked' },
    ];
    return {
      id: input.id,
      stage: stageOf(tasks, input),
      tasks,
      warmups: WARMUP_DAYS,
    };
  }

  const tasks: AccountTask[] = [];
  const created = input.createdDay;
  if (created) {
    tasks.push({ key: 'create', state: 'done' });
  } else if (!input.profileReady) {
    tasks.push({ key: 'create', state: 'locked', lock: 'profile' });
  } else if (previousCreated === null) {
    tasks.push({ key: 'create', state: 'locked', lock: 'previous' });
  } else if (previousCreated && previousCreated >= today) {
    tasks.push({
      key: 'create',
      state: 'locked',
      lock: 'day',
      from: addDays(previousCreated, 1),
    });
  } else {
    tasks.push({ key: 'create', state: 'open' });
  }

  const days = [...input.warmupDays].sort();
  for (let n = 1; n <= WARMUP_DAYS; n++) {
    if (days.length >= n) {
      tasks.push({ key: warmupKey(n), state: 'done' });
      continue;
    }
    const before = n === 1 ? created : days[n - 2];
    if (!created || days.length < n - 1 || !before) {
      tasks.push({ key: warmupKey(n), state: 'locked', lock: 'step' });
      continue;
    }
    // the first warm-up may be on the day of creation, every further one on
    // a new day
    const from = n === 1 ? before : addDays(before, 1);
    tasks.push(
      from <= today
        ? { key: warmupKey(n), state: 'open' }
        : { key: warmupKey(n), state: 'locked', lock: 'day', from }
    );
  }

  const warmedUp = days.length >= WARMUP_DAYS;
  tasks.push(
    input.fypOk
      ? { key: 'fyp', state: 'done' }
      : warmedUp
      ? { key: 'fyp', state: 'open' }
      : { key: 'fyp', state: 'locked', lock: 'step' }
  );

  const lastWarmup = days[WARMUP_DAYS - 1];
  if (!warmedUp || !input.fypOk) {
    tasks.push({ key: 'connect', state: 'locked', lock: 'step' });
  } else if (lastWarmup >= today) {
    tasks.push({
      key: 'connect',
      state: 'locked',
      lock: 'day',
      from: addDays(lastWarmup, 1),
    });
  } else {
    tasks.push({ key: 'connect', state: 'open' });
  }
  tasks.push({ key: 'post', state: 'locked', lock: 'step' });

  return {
    id: input.id,
    stage: stageOf(tasks, input),
    tasks,
    warmups: Math.min(days.length, WARMUP_DAYS),
  };
};

/** the plan of every account, in the order the clipper creates them */
export const planAccounts = (
  accounts: OnboardingAccountInput[],
  today: string
): AccountPlan[] =>
  accounts.map((account, i) => {
    if (i === 0) {
      return planOne(account, today, undefined);
    }
    const previous = accounts[i - 1];
    // a connected account from before the onboarding counts as created long ago
    const previousCreated =
      previous.createdDay ??
      (previous.connection !== 'none' ? '0000-01-01' : null);
    return planOne(account, today, previousCreated);
  });

export const taskState = (plan: AccountPlan, key: AccountTaskKey) =>
  plan.tasks.find((task) => task.key === key)?.state ?? 'locked';

/** the next warm-up step that is open, if any */
export const openWarmup = (plan: AccountPlan) =>
  plan.tasks.find((task) => isWarmupKey(task.key) && task.state === 'open');

/** an account is running when it is connected and posts daily */
export const onboardingDone = (plans: AccountPlan[], payoutDone: boolean) =>
  payoutDone && plans.every((plan) => plan.stage === 'active');

/** "@Name" or "name" to "name", for comparing TikTok usernames */
export const normalizeUsername = (value?: string | null) =>
  (value || '').trim().replace(/^@+/, '').toLowerCase();
