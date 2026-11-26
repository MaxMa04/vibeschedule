'use client';
import { APPS_KEY, useAppList } from '@vibeschedule/frontend/lib/shared-data';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BoxIcon, CircleSlashIcon, PlusIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Integrations } from '@vibeschedule/frontend/components/launches/calendar.context';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@vibeschedule/frontend/components/ui/command';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import {
  Field,
  FieldError,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';

export interface AppItem {
  id: string;
  name: string;
}

const errorText = async (response: Response, fallback: string) => {
  const { message } = await response.json().catch(() => ({} as any));
  return (Array.isArray(message) ? message[0] : message) || fallback;
};

export const useApps = () => useAppList<AppItem>();

// assigns the channel to an existing app, a new app typed in the search, or none
export const AppAssignForm: FC<{
  integration: Integrations;
  close: () => void;
  onSaved: () => void;
}> = ({ integration, close, onSaved }) => {
  const t = useT();
  const fetch = useFetch();
  const { data: apps, isLoading, mutate } = useApps();
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const current = integration.app?.id || null;
  const term = search.trim();

  const filtered = useMemo(
    () =>
      (apps || []).filter((a) =>
        a.name.toLowerCase().includes(term.toLowerCase())
      ),
    [apps, term]
  );
  const exists = (apps || []).some(
    (a) => a.name.toLowerCase() === term.toLowerCase()
  );

  const assign = useCallback(
    async (appId: string | null, newName?: string) => {
      setBusy(true);
      try {
        let id = appId;
        if (newName) {
          const created = await fetch(APPS_KEY, {
            method: 'POST',
            body: JSON.stringify({ name: newName }),
          });
          if (!created.ok) {
            toast.error(await errorText(created, t('calendar_app_save_failed')));
            return;
          }
          id = (await created.json()).id;
          mutate();
        }
        const response = await fetch(`/integrations/${integration.id}/app`, {
          method: 'PUT',
          body: JSON.stringify({ appId: id }),
        });
        if (!response.ok) {
          toast.error(await errorText(response, t('calendar_app_save_failed')));
          return;
        }
        toast.success(
          id ? t('calendar_app_assigned') : t('calendar_app_removed')
        );
        onSaved();
        close();
      } finally {
        setBusy(false);
      }
    },
    [fetch, integration.id, mutate, onSaved, close, t]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <ChannelAvatar
          picture={integration.picture}
          identifier={integration.identifier}
          name={integration.name}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{integration.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {integration.app?.name || t('calendar_no_app')}
          </div>
        </div>
      </div>
      <Command shouldFilter={false} className="rounded-lg! border">
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder={t('calendar_app_search')}
          disabled={busy}
        />
        <CommandList>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <>
              {!filtered.length && !term && (
                <CommandEmpty>{t('calendar_no_apps_yet')}</CommandEmpty>
              )}
              {!!filtered.length && (
                <CommandGroup heading={t('calendar_apps')}>
                  {filtered.map((app) => (
                    <CommandItem
                      key={app.id}
                      value={app.id}
                      data-checked={app.id === current}
                      disabled={busy}
                      onSelect={() => assign(app.id)}
                    >
                      <BoxIcon className="text-muted-foreground" />
                      {app.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!!term && !exists && (
                <CommandGroup>
                  <CommandItem
                    value={`create-${term}`}
                    disabled={busy}
                    onSelect={() => assign(null, term)}
                  >
                    <PlusIcon />
                    {t('calendar_app_create', { name: term })}
                  </CommandItem>
                </CommandGroup>
              )}
              {!!current && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      value="none"
                      disabled={busy}
                      onSelect={() => assign(null)}
                    >
                      <CircleSlashIcon className="text-muted-foreground" />
                      {t('calendar_app_unassign')}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

// a single text field with save, for renaming an app or a channel
export const NameForm: FC<{
  label: string;
  initial: string;
  placeholder?: string;
  allowEmpty?: boolean;
  hint?: string;
  save: (name: string) => Promise<string | null>;
  close: () => void;
}> = ({ label, initial, placeholder, allowEmpty, hint, save, close }) => {
  const t = useT();
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!allowEmpty && !name.trim()) {
        return;
      }
      setBusy(true);
      const failed = await save(name.trim());
      setBusy(false);
      if (failed) {
        setError(failed);
        return;
      }
      close();
    },
    [allowEmpty, name, save, close]
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor="name-form-input">{label}</FieldLabel>
        <Input
          id="name-form-input"
          value={name}
          placeholder={placeholder}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          autoFocus
          autoComplete="off"
          aria-invalid={!!error || undefined}
          className="h-10 md:h-9"
        />
        {!!hint && !error && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
        {!!error && <FieldError>{error}</FieldError>}
      </Field>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 md:h-8"
          onClick={close}
        >
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          className="h-10 md:h-8"
          disabled={busy || (!allowEmpty && !name.trim())}
        >
          {busy && <Spinner data-icon="inline-start" />}
          {t('save')}
        </Button>
      </div>
    </form>
  );
};

export const useAppRequests = () => {
  const fetch = useFetch();
  const t = useT();
  const rename = useCallback(
    async (id: string, name: string) => {
      const response = await fetch(`/apps/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      return response.ok
        ? null
        : await errorText(response, t('calendar_app_save_failed'));
    },
    [fetch, t]
  );
  const remove = useCallback(
    async (id: string) => (await fetch(`/apps/${id}`, { method: 'DELETE' })).ok,
    [fetch]
  );
  const assign = useCallback(
    async (integrationId: string, appId: string | null) =>
      (
        await fetch(`/integrations/${integrationId}/app`, {
          method: 'PUT',
          body: JSON.stringify({ appId }),
        })
      ).ok,
    [fetch]
  );
  return { rename, remove, assign };
};
