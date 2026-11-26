// Tasks we give a clipper for one account (ClipperTask), on top of the
// onboarding steps and also while the account is already running. The
// clipper checks them off on the posting page (/manual).
// Days are Berlin days (YYYY-MM-DD), see billingDay in clipper.billing.ts.

export type ClipperTaskKind = 'CUSTOM' | 'PROFILE';

export const PROFILE_TASK_TITLE =
  'Profil in TikTok umstellen (Bild, Name, Username, Bio)';

export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 2000;

/** the profile fields the clipper has to carry over into TikTok */
export interface HandedOutProfile {
  name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar?: string | null;
}

const PROFILE_FIELDS = ['name', 'username', 'bio', 'avatar'] as const;

/**
 * Did an update change what the clipper sees in TikTok? A field left out
 * (undefined) stays as it was, topic and search terms do not count.
 */
export const profileChanged = (
  before: HandedOutProfile,
  update: HandedOutProfile
) =>
  PROFILE_FIELDS.some(
    (field) =>
      update[field] !== undefined &&
      (update[field] || null) !== (before[field] || null)
  );

// A new profile for an account the clipper already created or connected
// does not reach TikTok by itself: the clipper has to switch it over. An
// account that is not created yet gets the profile in the create step.
export const needsProfileTask = (input: {
  changed: boolean;
  /** created in TikTok or connected */
  started: boolean;
  /** a profile task is still open */
  openProfileTask: boolean;
}) => input.changed && input.started && !input.openProfileTask;

export interface TaskLike {
  doneDay: string | null;
  createdAt: string | Date;
}

const time = (value: string | Date) => new Date(value).getTime();

/**
 * What the checklist shows: open tasks, oldest first, then the ones checked
 * off today, so a tap can still be undone. Older done tasks are gone.
 */
export const visibleTasks = <T extends TaskLike>(tasks: T[], today: string) =>
  [
    ...tasks
      .filter((task) => !task.doneDay)
      .sort((a, b) => time(a.createdAt) - time(b.createdAt)),
    ...tasks
      .filter((task) => task.doneDay === today)
      .sort((a, b) => time(a.createdAt) - time(b.createdAt)),
  ] as T[];

export const openTaskCount = (tasks: TaskLike[]) =>
  tasks.filter((task) => !task.doneDay).length;
