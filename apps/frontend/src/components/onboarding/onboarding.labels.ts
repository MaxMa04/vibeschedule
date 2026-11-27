import type { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  addDays,
  AccountTaskKey,
  isWarmupKey,
  WARMUP_DAYS,
} from '@vibeschedule/helpers/clippers/clipper.onboarding';

type T = ReturnType<typeof useT>;

/** "morgen" or "Sa., 28.11." for a Berlin day */
export const dayLabel = (day: string, today: string, t: T) =>
  day === addDays(today, 1)
    ? t('start_tomorrow')
    : new Intl.DateTimeFormat('de-DE', {
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${day}T12:00:00Z`));

/** the name of an onboarding step, e.g. "Aufwärmen, Tag 2 von 3" */
export const stepTitle = (key: AccountTaskKey, t: T) =>
  isWarmupKey(key)
    ? t('start_task_warmup', { day: key.split('_')[1], days: WARMUP_DAYS })
    : t(`start_task_${key}`);
