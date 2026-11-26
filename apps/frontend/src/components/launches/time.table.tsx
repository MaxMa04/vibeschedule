'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { toast } from 'sonner';
import { ClockIcon, PlusIcon, XIcon } from 'lucide-react';
import { sortBy, uniqBy } from 'lodash';
import { Integrations } from '@vibeschedule/frontend/components/launches/calendar.context';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  fromUtc,
  newDayjs,
} from '@vibeschedule/frontend/components/layout/set.timezone';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';

dayjs.extend(utc);

// posting times are stored as minutes of the UTC day
const toUtcMinutes = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  const minutes = hour * 60 + minute - newDayjs().utcOffset();
  return ((minutes % 1440) + 1440) % 1440;
};

const formatMinutes = (minutes: number) =>
  fromUtc(dayjs.utc().startOf('day').add(minutes, 'minutes')).format('HH:mm');

export const TimeTable: FC<{
  integration: Integrations;
  mutate: () => void;
  close?: () => void;
}> = ({ integration, mutate, close }) => {
  const t = useT();
  const fetch = useFetch();
  const [currentTimes, setCurrentTimes] = useState(() =>
    integration.time.map(({ time }) => time)
  );
  const [value, setValue] = useState('09:00');
  const [busy, setBusy] = useState(false);

  const times = useMemo(
    () =>
      sortBy(
        uniqBy(
          currentTimes.map((time) => ({ time, label: formatMinutes(time) })),
          'label'
        ),
        'label'
      ),
    [currentTimes]
  );

  const add = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!value) {
        return;
      }
      setCurrentTimes((prev) => [...prev, toUtcMinutes(value)]);
    },
    [value]
  );

  const save = useCallback(async () => {
    setBusy(true);
    const response = await fetch(`/integrations/${integration.id}/time`, {
      method: 'POST',
      body: JSON.stringify({
        time: times.map(({ time }) => ({ time })),
      }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error(t('calendar_save_failed'));
      return;
    }
    toast.success(t('calendar_times_saved'));
    mutate();
    close?.();
  }, [fetch, integration.id, times, mutate, close, t]);

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={add}>
        <Field>
          <FieldLabel htmlFor="posting-time">{t('add_time_slot')}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="posting-time"
              type="time"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 flex-1 md:h-9"
            />
            <Button type="submit" variant="outline" className="h-10 md:h-9">
              <PlusIcon data-icon="inline-start" />
              {t('add')}
            </Button>
          </div>
          <FieldDescription>{t('calendar_times_hint')}</FieldDescription>
        </Field>
      </form>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">
          {t('scheduled_times')}{' '}
          <span className="text-muted-foreground">({times.length})</span>
        </div>
        {times.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {t('no_time_slots')}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {times.map((slot) => (
              <span
                key={slot.label}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card ps-2.5 pe-1 text-sm tabular-nums"
              >
                <ClockIcon className="size-3.5 text-muted-foreground" />
                {slot.label}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('delete')}
                  onClick={() =>
                    setCurrentTimes((prev) =>
                      prev.filter(
                        (time) => formatMinutes(time) !== slot.label
                      )
                    )
                  }
                >
                  <XIcon />
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {!!close && (
          <Button variant="outline" className="h-10 md:h-8" onClick={close}>
            {t('cancel')}
          </Button>
        )}
        <Button className="h-10 md:h-8" onClick={save} disabled={busy}>
          {busy && <Spinner data-icon="inline-start" />}
          {t('save_changes')}
        </Button>
      </div>
    </div>
  );
};
