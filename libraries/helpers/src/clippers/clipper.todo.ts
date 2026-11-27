// What a clipper has to do today on one account, for the admin overview on
// /clippers: the next onboarding step from the plan (clipper.onboarding.ts),
// or the posts of the day once the account runs. Tasks we gave
// (clipper.tasks.ts) come on top.
import type {
  AccountPlan,
  AccountTaskKey,
  LockReason,
} from './clipper.onboarding';

export type AccountToDo =
  /** the clipper can do this step today */
  | { kind: 'open'; key: AccountTaskKey }
  /** nothing to do yet: waits for us (profile), a day or the step before */
  | { kind: 'locked'; key: AccountTaskKey; lock?: LockReason; from?: string }
  /** the account runs: posts marked as posted today of those agreed */
  | { kind: 'post'; posted: number; due: number };

export const accountToDo = (
  plan: AccountPlan,
  posts: { postedToday: number; postsPerDay: number }
): AccountToDo => {
  const next = plan.tasks.find((task) => task.state !== 'done');
  if (!next || next.key === 'post') {
    return { kind: 'post', posted: posts.postedToday, due: posts.postsPerDay };
  }
  if (next.state === 'open') {
    return { kind: 'open', key: next.key };
  }
  return { kind: 'locked', key: next.key, lock: next.lock, from: next.from };
};

/** the clipper still has something to do today on this account */
export const dueToday = (todo: AccountToDo) =>
  todo.kind === 'open' || (todo.kind === 'post' && todo.posted < todo.due);

/** the account waits for us to hand out the profile */
export const waitsForUs = (todo: AccountToDo) =>
  todo.kind === 'locked' && todo.lock === 'profile';

export interface ClipperToDo {
  /** steps, posts and open tasks the clipper still has today */
  open: number;
  /** accounts that wait for a profile from us */
  waitingForUs: number;
}

/**
 * sums one clipper up: every account, the general tasks (openTasks) and the
 * payout details
 */
export const clipperToDo = (
  accounts: { todo: AccountToDo; openTasks: number }[],
  clipper: { payoutDone: boolean; openTasks: number }
): ClipperToDo => ({
  open:
    (clipper.payoutDone ? 0 : 1) +
    clipper.openTasks +
    accounts.reduce(
      (sum, account) =>
        sum + account.openTasks + (dueToday(account.todo) ? 1 : 0),
      0
    ),
  waitingForUs: accounts.filter((account) => waitsForUs(account.todo)).length,
});

// What we (the team) still have to do for a clipper: tasks marked for us,
// profiles to hand out, connected accounts that do not carry our profile,
// and a clipper nobody looks after yet.
export type TeamToDo =
  | { kind: 'task'; taskId: string; accountId: string | null }
  | { kind: 'profile'; accountId: string }
  | { kind: 'rebrand'; accountId: string }
  | { kind: 'mismatch'; accountId: string }
  | { kind: 'manager' };

interface TeamTaskLike {
  id: string;
  kind: string;
  forTeam: boolean;
  doneDay: string | null;
}

export interface TeamToDoInput {
  manager: unknown | null;
  tasks: TeamTaskLike[];
  accounts: {
    id: string;
    todo: AccountToDo;
    rebrand: boolean;
    usernameMismatch: boolean;
    tasks: TeamTaskLike[];
  }[];
}

const openTeamTasks = (tasks: TeamTaskLike[], accountId: string | null) =>
  tasks
    .filter((task) => task.forTeam && !task.doneDay)
    .map((task): TeamToDo => ({ kind: 'task', taskId: task.id, accountId }));

export const teamToDos = (clipper: TeamToDoInput): TeamToDo[] => [
  ...(clipper.manager ? [] : [{ kind: 'manager' } as TeamToDo]),
  ...openTeamTasks(clipper.tasks, null),
  ...clipper.accounts.flatMap((account): TeamToDo[] => [
    ...(waitsForUs(account.todo)
      ? [{ kind: 'profile' as const, accountId: account.id }]
      : []),
    // a profile task for the clipper is already on its way
    ...(account.rebrand &&
    !account.tasks.some((task) => task.kind === 'PROFILE' && !task.doneDay)
      ? [{ kind: 'rebrand' as const, accountId: account.id }]
      : []),
    ...(account.usernameMismatch
      ? [{ kind: 'mismatch' as const, accountId: account.id }]
      : []),
    ...openTeamTasks(account.tasks, account.id),
  ]),
];
