'use client';

import React, { useCallback, useState } from 'react';
import useCookie from 'react-use-cookie';
import {
  CALENDAR_FILTER_KEYS,
  CalendarWeekProvider,
} from '@vibeschedule/frontend/components/launches/calendar.context';
import { usePersistedFilters } from '@vibeschedule/frontend/lib/use-persisted-filters';
import { Filters } from '@vibeschedule/frontend/components/launches/filters';
import { Calendar } from '@vibeschedule/frontend/components/launches/calendar';
import { DNDProvider } from '@vibeschedule/frontend/components/launches/helpers/dnd.provider';
import { useIntegrationList } from '@vibeschedule/frontend/components/launches/helpers/use.integration.list';
import {
  ChannelPanel,
  ChannelsSheetButton,
} from '@vibeschedule/frontend/components/launches/channels.panel';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';

// the page fills the space under the app header, the grid scrolls inside
const pageHeight = 'h-[calc(100svh-3rem)]';

export const LaunchesComponent = () => {
  const [reload, setReload] = useState(false);
  const [collapsed, setCollapsed] = useCookie('calendar-channels-collapsed', '0');
  const { isLoading, data: integrations, mutate } = useIntegrationList();
  const { ready } = usePersistedFilters('calendar', CALENDAR_FILTER_KEYS);

  const update = useCallback(
    async (shouldReload: boolean) => {
      if (shouldReload) {
        setReload(true);
      }
      await mutate();
      setReload(false);
    },
    [mutate]
  );

  if (isLoading || reload || !ready) {
    return (
      <div className={`flex ${pageHeight} min-w-0`}>
        <div className="hidden w-64 shrink-0 flex-col gap-2 border-e bg-card p-3 md:flex">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <DNDProvider>
      <CalendarWeekProvider integrations={integrations}>
        <div className={`flex ${pageHeight} min-w-0`}>
          <ChannelPanel
            collapsed={collapsed === '1'}
            setCollapsed={(value) => setCollapsed(value ? '1' : '0')}
            update={update}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 md:p-4">
            <Filters channelsButton={<ChannelsSheetButton update={update} />} />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
              <Calendar />
            </div>
          </div>
        </div>
      </CalendarWeekProvider>
    </DNDProvider>
  );
};
