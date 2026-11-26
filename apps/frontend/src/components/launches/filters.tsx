'use client';

import React, { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { de } from 'react-day-picker/locale';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SlidersHorizontalIcon,
} from 'lucide-react';
import {
  CalendarDisplay,
  ListStateFilter,
  useCalendar,
} from '@vibeschedule/frontend/components/launches/calendar.context';
import { SelectApp } from '@vibeschedule/frontend/components/launches/select.app';
import {
  SelectChannels,
  useChannelFilter,
} from '@vibeschedule/frontend/components/launches/select.channels';
import { NewPost } from '@vibeschedule/frontend/components/launches/new.post';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { newDayjs } from '@vibeschedule/frontend/components/layout/set.timezone';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Calendar as DayPicker } from '@vibeschedule/frontend/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@vibeschedule/frontend/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@vibeschedule/frontend/components/ui/sheet';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@vibeschedule/frontend/components/ui/toggle-group';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { cn } from '@vibeschedule/frontend/lib/utils';

const views: { value: CalendarDisplay; label: string }[] = [
  { value: 'day', label: 'day' },
  { value: 'week', label: 'week' },
  { value: 'month', label: 'month' },
  { value: 'list', label: 'list' },
];

const listStates: { value: ListStateFilter; label: string }[] = [
  { value: 'all', label: 'all' },
  { value: 'scheduled', label: 'scheduled' },
  { value: 'draft', label: 'draft' },
  { value: 'published', label: 'published' },
];

const toggleItem =
  'h-9 flex-1 px-1.5 text-muted-foreground md:px-3 aria-pressed:bg-muted aria-pressed:text-foreground md:h-8 md:flex-none';

// "23. – 29. Nov. 2026", "Donnerstag, 26. Nov. 2026", "November 2026"
const useRangeTitle = () => {
  const { display, startDate, endDate } = useCalendar();
  return useMemo(() => {
    const start = newDayjs(startDate);
    const end = newDayjs(endDate);
    if (display === 'day') {
      return {
        long: start.format('dddd, D. MMM YYYY'),
        short: start.format('dd, D.M.'),
      };
    }
    if (display === 'month') {
      return { long: start.format('MMMM YYYY'), short: start.format('MMM YYYY') };
    }
    const sameMonth = start.month() === end.month();
    const range = sameMonth
      ? `${start.format('D.')} – ${end.format('D. MMM')}`
      : `${start.format('D. MMM')} – ${end.format('D. MMM')}`;
    return {
      long: `${range} ${end.format('YYYY')}`,
      short: `${start.format('D.M.')}–${end.format('D.M.')}`,
      week: start.isoWeek(),
    };
  }, [display, startDate, endDate]);
};

const DateNavigation: FC = () => {
  const t = useT();
  const { display, startDate, goTo, loading } = useCalendar();
  const title = useRangeTitle();
  const [open, setOpen] = useState(false);
  const unit = display === 'day' ? 'day' : display === 'month' ? 'month' : 'week';

  const step = useCallback(
    (amount: number) => () =>
      goTo(
        display,
        newDayjs(startDate).add(amount, unit).format('YYYY-MM-DD')
      ),
    [display, goTo, startDate, unit]
  );

  // the picker works with machine-local dates, only the calendar day matters
  const selected = useMemo(() => {
    const day = newDayjs(startDate);
    return new Date(day.year(), day.month(), day.date());
  }, [startDate]);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Button
        variant="outline"
        className="h-9 md:h-8"
        onClick={() => goTo(display)}
      >
        {t('today')}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 md:size-8"
        onClick={step(-1)}
        aria-label={t('calendar_previous')}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 md:size-8"
        onClick={step(1)}
        aria-label={t('calendar_next')}
      >
        <ChevronRightIcon />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              className="h-9 min-w-0 shrink px-1.5 text-sm font-semibold md:h-8 md:px-2 md:text-base"
            />
          }
        >
          <span className="truncate md:hidden">{title.short}</span>
          <span className="hidden truncate md:inline">{title.long}</span>
          {!!title.week && (
            <span className="hidden text-xs font-normal text-muted-foreground 2xl:inline">
              {t('calendar_week_number', { week: title.week })}
            </span>
          )}
          <ChevronDownIcon className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <DayPicker
            mode="single"
            locale={de}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (!date) {
                return;
              }
              goTo(display, dayjs(date).format('YYYY-MM-DD'));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {loading && <Spinner className="text-muted-foreground" />}
    </div>
  );
};

const ListNavigation: FC = () => {
  const t = useT();
  const { listState, setListState, listPage, listTotalPages, setListPage, loading } =
    useCalendar();
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <ToggleGroup
        value={[listState]}
        onValueChange={(v) => v.length && setListState(v[0] as ListStateFilter)}
        variant="outline"
        spacing={0}
        className="max-md:w-full"
      >
        {listStates.map((state) => (
          <ToggleGroupItem
            key={state.value}
            value={state.value}
            className={toggleItem}
          >
            {t(state.label)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {listTotalPages > 1 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 md:size-8"
            disabled={listPage === 0}
            onClick={() => setListPage(listPage - 1)}
            aria-label={t('calendar_previous')}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="tabular-nums">
            {t('page')} {listPage + 1} {t('of')} {listTotalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 md:size-8"
            disabled={listPage >= listTotalPages - 1}
            onClick={() => setListPage(listPage + 1)}
            aria-label={t('calendar_next')}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      )}
      {loading && <Spinner className="text-muted-foreground" />}
    </div>
  );
};

const ViewSwitch: FC<{ className?: string }> = ({ className }) => {
  const t = useT();
  const { display, goTo, startDate } = useCalendar();
  return (
    <ToggleGroup
      value={[display]}
      onValueChange={(v) => {
        if (!v.length) {
          return;
        }
        const next = v[0] as CalendarDisplay;
        // stays in the week or month in view when it contains today
        const today = newDayjs();
        const start = newDayjs(startDate);
        const keep =
          display !== 'list' &&
          next !== 'list' &&
          !today.isSame(start, display === 'day' ? 'day' : display === 'month' ? 'month' : 'isoWeek');
        goTo(next, keep ? start.format('YYYY-MM-DD') : undefined);
      }}
      variant="outline"
      spacing={0}
      className={className}
    >
      {views.map((view) => (
        <ToggleGroupItem key={view.value} value={view.value} className={toggleItem}>
          {t(view.label)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

const AppFilter: FC<{ list?: boolean }> = ({ list }) => {
  const { app, integrations, setFilters, startDate, endDate, display } =
    useCalendar();
  return (
    <SelectApp
      list={list}
      app={app}
      integrations={integrations}
      onChange={(next) =>
        setFilters({ startDate, endDate, display, app: next || null })
      }
    />
  );
};

const MobileFilters: FC = () => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { app, integrations } = useCalendar();
  const { active, channels } = useChannelFilter();
  const hasApps = integrations.some((i) => !!i.app);
  if (channels.length <= 1 && !hasApps) {
    return null;
  }
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={cn('relative size-9', (active || app) && 'bg-muted')}
        onClick={() => setOpen(true)}
        aria-label={t('calendar_filters')}
      >
        <SlidersHorizontalIcon />
        {(active || !!app) && (
          <span className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85svh] rounded-t-xl">
          <SheetHeader>
            <SheetTitle>{t('calendar_filters')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-6">
            <AppFilter list />
            <SelectChannels list />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export const Filters: FC<{ channelsButton?: ReactNode }> = ({
  channelsButton,
}) => {
  const { display } = useCalendar();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {channelsButton}
        <div
          className={cn(
            'flex min-w-0 flex-1 items-center md:flex-none',
            display === 'list' && 'max-md:order-last max-md:basis-full'
          )}
        >
          {display === 'list' ? <ListNavigation /> : <DateNavigation />}
        </div>
        <div className="ms-auto flex items-center gap-2 max-md:hidden">
          <AppFilter />
          <SelectChannels />
          <ViewSwitch />
          <NewPost />
        </div>
      </div>
      <div className="flex items-center gap-2 md:hidden">
        <ViewSwitch className="flex-1" />
        <MobileFilters />
        <NewPost iconOnly />
      </div>
    </div>
  );
};

