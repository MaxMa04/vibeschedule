'use client';

import React, { FC, useCallback, useMemo } from 'react';
import { ListFilterIcon } from 'lucide-react';
import { orderBy } from 'lodash';
import { useCalendar } from '@vibeschedule/frontend/components/launches/calendar.context';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Checkbox } from '@vibeschedule/frontend/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@vibeschedule/frontend/components/ui/popover';
import { cn } from '@vibeschedule/frontend/lib/utils';

// the channels of the selected app, and which of them the calendar shows
export const useChannelFilter = () => {
  const { integrations, app, selectedChannels, setSelectedChannels } =
    useCalendar();
  const channels = useMemo(
    () =>
      orderBy(
        integrations.filter((i) => !app || i.app?.id === app),
        (i) => i.name.toLowerCase()
      ),
    [integrations, app]
  );
  const selectedIds = selectedChannels ?? channels.map((c) => c.id);
  const allSelected = channels.every((c) => selectedIds.includes(c.id));

  const toggleAll = useCallback(() => {
    setSelectedChannels(allSelected ? [] : null);
  }, [allSelected, setSelectedChannels]);

  const toggle = useCallback(
    (id: string) => {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id];
      setSelectedChannels(next.length === channels.length ? null : next);
    },
    [selectedIds, channels, setSelectedChannels]
  );

  return {
    channels,
    selectedIds,
    allSelected,
    active: !!selectedChannels,
    toggle,
    toggleAll,
  };
};

const ChannelChecklist: FC = () => {
  const t = useT();
  const { channels, selectedIds, allSelected, toggle, toggleAll } =
    useChannelFilter();
  return (
    <div className="flex flex-col gap-0.5">
      <label className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm font-medium hover:bg-muted">
        <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
        {t('select_all')}
      </label>
      {channels.map((channel) => (
        <label
          key={channel.id}
          className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-muted"
        >
          <Checkbox
            checked={selectedIds.includes(channel.id)}
            onCheckedChange={() => toggle(channel.id)}
          />
          <ChannelAvatar
            size="xs"
            picture={channel.picture}
            identifier={channel.identifier}
            name={channel.name}
            disabled={channel.disabled}
          />
          <span className="min-w-0 flex-1 truncate">{channel.name}</span>
        </label>
      ))}
    </div>
  );
};

export const SelectChannels: FC<{
  list?: boolean;
  className?: string;
}> = ({ list, className }) => {
  const t = useT();
  const { channels, selectedIds, active } = useChannelFilter();

  if (channels.length <= 1) {
    return null;
  }

  if (list) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="px-1 text-xs font-medium text-muted-foreground">
          {t('channels')}
        </div>
        <ChannelChecklist />
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'h-9 md:h-8',
              active && 'border-primary/40 bg-muted',
              className
            )}
          />
        }
      >
        <ListFilterIcon data-icon="inline-start" />
        <span className={cn(!active && 'max-2xl:sr-only')}>
          {active
            ? t('calendar_channels_selected', {
                count: selectedIds.length,
                total: channels.length,
              })
            : t('calendar_all_channels')}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-96 w-64 overflow-y-auto p-1">
        <ChannelChecklist />
      </PopoverContent>
    </Popover>
  );
};
