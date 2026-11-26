'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowLeftIcon, PlusIcon, RefreshCwIcon } from 'lucide-react';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@vibeschedule/frontend/components/ui/tooltip';
import { cn } from '@vibeschedule/frontend/lib/utils';

interface CustomField {
  key: string;
  label: string;
  defaultValue?: string;
  validation: string;
  type: 'text' | 'password';
  hint?: string;
}

interface SocialProvider {
  identifier: string;
  name: string;
  toolTip?: string;
  customFields?: CustomField[];
}

// PfM sends the browser back to /integrations/social/postforme after the consent
const useConnect = () => {
  const fetch = useFetch();
  const t = useT();
  return useCallback(
    async (identifier: string, fields?: Record<string, string>) => {
      const query = fields
        ? `?code=${encodeURIComponent(
            Buffer.from(JSON.stringify(fields)).toString('base64')
          )}`
        : '';
      const response = await fetch(
        `/integrations/social/${identifier}${query}`
      );
      const { url } = await response.json().catch(() => ({}));
      if (!response.ok || !url) {
        toast.error(t('could_not_connect_to_platform'));
        return false;
      }
      window.location.href = url;
      return true;
    },
    [fetch, t]
  );
};

const toRegex = (validation: string) => {
  const parts = validation.split('/');
  return new RegExp(parts.slice(1, -1).join('/'), parts.pop());
};

const CustomFieldsForm: FC<{
  provider: SocialProvider;
  onBack: () => void;
}> = ({ provider, onBack }) => {
  const t = useT();
  const connect = useConnect();
  const fields = provider.customFields || [];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.defaultValue || '']))
  );
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const invalid = useMemo(
    () =>
      Object.fromEntries(
        fields.map((f) => [
          f.key,
          !values[f.key] || !toRegex(f.validation).test(values[f.key]),
        ])
      ),
    [fields, values]
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);
      if (Object.values(invalid).some(Boolean)) {
        return;
      }
      setBusy(true);
      if (!(await connect(provider.identifier, values))) {
        setBusy(false);
      }
    },
    [invalid, connect, provider.identifier, values]
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={t('calendar_back')}
        >
          <ArrowLeftIcon />
        </Button>
        <img
          src={`/icons/platforms/${provider.identifier}.png`}
          alt=""
          className="size-6 rounded-full"
        />
        <span className="font-medium">{provider.name}</span>
      </div>
      <FieldGroup className="gap-4">
        {fields.map((field) => {
          const showError = touched && invalid[field.key];
          return (
            <Field key={field.key} data-invalid={showError || undefined}>
              <FieldLabel htmlFor={`custom-${field.key}`}>
                {field.label}
              </FieldLabel>
              <Input
                id={`custom-${field.key}`}
                type={field.type === 'text' ? 'text' : 'password'}
                value={values[field.key]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key]: e.target.value }))
                }
                autoComplete="off"
                aria-invalid={showError || undefined}
                className="h-10 md:h-9"
              />
              {!!field.hint && (
                <FieldDescription>{field.hint}</FieldDescription>
              )}
              {showError && (
                <FieldError>
                  {t('field_is_invalid', { field: field.label })}
                </FieldError>
              )}
            </Field>
          );
        })}
      </FieldGroup>
      <Button type="submit" disabled={busy} className="h-10 md:h-9">
        {busy && <Spinner data-icon="inline-start" />}
        {t('connect')}
      </Button>
    </form>
  );
};

export const AddProviderComponent: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const connect = useConnect();
  const [selected, setSelected] = useState<SocialProvider | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const { data, isLoading } = useSWR('/integrations', async (path: string) =>
    (await fetch(path)).json()
  );
  const social: SocialProvider[] = data?.social || [];

  const select = useCallback(
    (item: SocialProvider) => async () => {
      if (item.customFields?.length) {
        setSelected(item);
        return;
      }
      setConnecting(item.identifier);
      if (!(await connect(item.identifier))) {
        setConnecting(null);
      }
    },
    [connect]
  );

  if (selected) {
    return (
      <CustomFieldsForm provider={selected} onBack={() => setSelected(null)} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t('calendar_add_channel_description')}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))
          : social.map((item) => (
              <button
                key={item.identifier}
                type="button"
                onClick={select(item)}
                disabled={!!connecting}
                className={cn(
                  'flex h-14 items-center gap-3 rounded-lg border bg-card px-3 text-start text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60',
                  connecting === item.identifier && 'bg-muted'
                )}
              >
                <img
                  src={`/icons/platforms/${item.identifier}.png`}
                  alt=""
                  className="size-7 shrink-0 rounded-full"
                />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {connecting === item.identifier && <Spinner />}
              </button>
            ))}
      </div>
    </div>
  );
};

export const useAddProvider = () => {
  const modal = useModals();
  const t = useT();
  return useCallback(() => {
    modal.openModal({
      title: t('add_channel'),
      size: 'lg',
      withCloseButton: true,
      children: <AddProviderComponent />,
    });
  }, [modal, t]);
};

// asks PfM for the connected accounts and adds, updates or disables channels
export const useSyncChannels = (onDone: () => void) => {
  const fetch = useFetch();
  const t = useT();
  const [syncing, setSyncing] = useState(false);
  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await fetch('/integrations/sync', { method: 'POST' });
      if (!response.ok) {
        toast.error(t('channel_sync_failed'));
        return;
      }
      const { total, added, disabled } = await response.json();
      toast.success(t('channel_sync_done', { total, added, disabled }));
      onDone();
    } finally {
      setSyncing(false);
    }
  }, [fetch, t, onDone]);
  return { sync, syncing };
};

export const AddProviderButton: FC<{
  update: () => void;
  className?: string;
}> = ({ update, className }) => {
  const add = useAddProvider();
  const t = useT();
  const { sync, syncing } = useSyncChannels(update);

  return (
    <div className={cn('flex gap-2', className)}>
      <Button variant="outline" className="h-9 flex-1 md:h-8" onClick={add}>
        <PlusIcon data-icon="inline-start" />
        {t('add_channel')}
      </Button>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="size-9 md:size-8"
              onClick={sync}
              disabled={syncing}
              aria-label={t('sync_channels')}
            />
          }
        >
          {syncing ? <Spinner /> : <RefreshCwIcon />}
        </TooltipTrigger>
        <TooltipContent>{t('sync_channels')}</TooltipContent>
      </Tooltip>
    </div>
  );
};
