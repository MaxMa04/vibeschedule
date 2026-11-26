'use client';

import React, { FC, useEffect, useMemo } from 'react';
import { BoxIcon, CheckIcon } from 'lucide-react';
import { NO_APP } from '@vibeschedule/helpers/channels/channel.filter';
import { Integrations } from '@vibeschedule/frontend/components/launches/calendar.context';
import { useAppList } from '@vibeschedule/frontend/lib/shared-data';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@vibeschedule/frontend/components/ui/select';
import { cn } from '@vibeschedule/frontend/lib/utils';

const ALL = 'all';

// filters by app; '' means all apps. Hidden while there is no app.
export const SelectApp: FC<{
  onChange: (appId: string) => void;
  integrations: Integrations[];
  app?: string | null;
  list?: boolean;
  className?: string;
}> = ({ onChange, integrations, app, list, className }) => {
  const t = useT();
  const { data: apps } = useAppList();
  const withoutApp = integrations.some((i) => !i.app);
  const items = useMemo(
    () => [
      { value: ALL, label: t('filter_all') },
      ...(apps ?? []).map((a) => ({ value: a.id, label: a.name })),
      ...(withoutApp ? [{ value: NO_APP, label: t('calendar_no_app') }] : []),
    ],
    [apps, withoutApp, t]
  );

  // a saved app that was deleted meanwhile
  useEffect(() => {
    if (apps && app && !items.some((item) => item.value === app)) {
      onChange('');
    }
  }, [apps, app, items, onChange]);

  if (!apps?.length) {
    return null;
  }

  if (list) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="px-1 text-xs font-medium text-muted-foreground">
          {t('calendar_apps')}
        </div>
        {items.map((item) => {
          const selected = (app || ALL) === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value === ALL ? '' : item.value)}
              className={cn(
                'flex h-10 items-center gap-2 rounded-lg px-2 text-start text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                selected && 'bg-muted font-medium'
              )}
            >
              <BoxIcon className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{item.label}</span>
              {selected && <CheckIcon className="size-4" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Select
      items={items}
      value={app || ALL}
      onValueChange={(value) =>
        onChange(!value || value === ALL ? '' : String(value))
      }
    >
      <SelectTrigger
        className={cn(
          'h-9 min-w-32 md:h-8',
          app && 'border-primary/40 bg-muted',
          className
        )}
        aria-label={t('calendar_filter_app')}
      >
        <BoxIcon className="text-muted-foreground" />
        <span className="text-muted-foreground">{t('calendar_app')}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={ALL}>{t('filter_all')}</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          {items.slice(1).map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
