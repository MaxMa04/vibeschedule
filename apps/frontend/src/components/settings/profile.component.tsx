'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import { CheckIcon, ChevronsUpDownIcon, GlobeIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  browserTimezone,
  setUserTimezone,
} from '@vibeschedule/frontend/components/layout/set.timezone';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import {
  Avatar,
  AvatarFallback,
} from '@vibeschedule/frontend/components/ui/avatar';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@vibeschedule/frontend/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@vibeschedule/frontend/components/ui/command';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';

export type UserRole = 'ADMIN' | 'USER' | 'CLIPPER';

export const useRoleLabel = () => {
  const t = useT();
  return useCallback(
    (role: UserRole) =>
      role === 'ADMIN'
        ? t('admin')
        : role === 'CLIPPER'
        ? t('role_clipper')
        : t('role_user'),
    [t]
  );
};

const offsetLabel = (timezone: string) => {
  try {
    return (
      new Intl.DateTimeFormat('de-DE', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
      })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value || ''
    );
  } catch {
    return '';
  }
};

// Intl.supportedValuesOf is ES2022, the frontend still compiles against an older lib
const intl = Intl as typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => string[];
};

const allTimezones = (): string[] => {
  const zones = intl.supportedValuesOf?.('timeZone') || [];
  return zones.includes('UTC') ? zones : ['UTC', ...zones];
};

export const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

const TimezonePicker = () => {
  const user = useUser();
  const fetch = useFetch();
  const toaster = useToaster();
  const { mutate } = useSWRConfig();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(user?.timezoneName || '');
  const [saving, setSaving] = useState(false);
  const browser = useMemo(() => browserTimezone(), []);
  const zones = useMemo(() => (open ? allTimezones() : []), [open]);

  const save = useCallback(async () => {
    setSaving(true);
    const response = await fetch('/user/timezone', {
      method: 'POST',
      body: JSON.stringify({ timezoneName: value || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      toaster.show(t('timezone_save_failed'), 'warning');
      return;
    }
    setUserTimezone(value || null);
    await mutate('/user/self');
    toaster.show(t('timezone_saved'));
  }, [fetch, mutate, t, toaster, value]);

  const shown = value || browser;
  const changed = value !== (user?.timezoneName || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('timezone')}</CardTitle>
        <CardDescription>{t('timezone_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel>{t('timezone')}</FieldLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="h-10 w-full justify-between font-normal sm:w-96 md:h-9"
                />
              }
            >
              <span className="flex min-w-0 items-center gap-2">
                <GlobeIcon className="text-muted-foreground" />
                <span className="truncate">
                  {value ? value : t('timezone_browser', { timezone: browser })}
                </span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs">{offsetLabel(shown)}</span>
                <ChevronsUpDownIcon />
              </span>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-(--anchor-width) min-w-72 p-0"
            >
              <Command>
                <CommandInput placeholder={t('timezone_search')} />
                <CommandList>
                  <CommandEmpty>{t('timezone_not_found')}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value={`browser ${browser}`}
                      onSelect={() => {
                        setValue('');
                        setOpen(false);
                      }}
                    >
                      <span className="flex-1 truncate">
                        {t('timezone_browser', { timezone: browser })}
                      </span>
                      {!value && <CheckIcon />}
                    </CommandItem>
                    {zones.map((zone) => (
                      <CommandItem
                        key={zone}
                        value={zone}
                        onSelect={() => {
                          setValue(zone);
                          setOpen(false);
                        }}
                      >
                        <span className="flex-1 truncate">{zone}</span>
                        <span className="text-xs text-muted-foreground">
                          {offsetLabel(zone)}
                        </span>
                        {value === zone && <CheckIcon />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FieldDescription>{t('timezone_hint')}</FieldDescription>
        </Field>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button
          className="h-10 w-full sm:w-fit md:h-8"
          disabled={!changed || saving}
          onClick={save}
        >
          {saving && <Spinner data-icon="inline-start" />}
          {t('save')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export const ProfileComponent = () => {
  const user = useUser();
  const t = useT();
  const isAdmin = user?.role === 'ADMIN' || !!user?.isAdmin;
  const roleLabel = useRoleLabel();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="text-base">
              {initials(user?.name || user?.email || '')}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">
              {user?.name || user?.email}
            </span>
            <span className="truncate text-sm text-muted-foreground">
              {user?.email}
            </span>
          </div>
          <Badge
            variant={
              isAdmin
                ? 'default'
                : user?.role === 'CLIPPER'
                ? 'outline'
                : 'secondary'
            }
          >
            {roleLabel(isAdmin ? 'ADMIN' : user?.role || 'USER')}
          </Badge>
        </CardContent>
      </Card>
      <TimezonePicker />
    </div>
  );
};
