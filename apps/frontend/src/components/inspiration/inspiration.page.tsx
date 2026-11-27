'use client';

import {
  ClipboardEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ClipboardPasteIcon,
  ExternalLinkIcon,
  LightbulbIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { parseInspirationLink } from '@vibeschedule/helpers/inspiration/inspiration.link';
import { NO_APP } from '@vibeschedule/helpers/channels/channel.filter';
import { usePersistedFilters } from '@vibeschedule/frontend/lib/use-persisted-filters';
import { useAppList } from '@vibeschedule/frontend/lib/shared-data';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Textarea } from '@vibeschedule/frontend/components/ui/textarea';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Card, CardContent } from '@vibeschedule/frontend/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@vibeschedule/frontend/components/ui/item';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vibeschedule/frontend/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@vibeschedule/frontend/components/ui/toggle-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@vibeschedule/frontend/components/ui/sheet';
import { ConfirmDelete } from '@vibeschedule/frontend/components/formats/formats.sheets';
import { useFormats } from '@vibeschedule/frontend/components/formats/formats.data';
import {
  INSPIRATION_STATUSES,
  InspirationLink,
  InspirationStatus,
  statusLabelKey,
  useInspiration,
  useInspirationApi,
} from '@vibeschedule/frontend/components/inspiration/inspiration.data';

const ALL = 'all';
const NONE = '__none';
type StatusFilter = InspirationStatus | typeof ALL;

const PLATFORM_LABEL: Record<InspirationLink['platform'], string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  other: 'Link',
};

const shortUrl = (url: string) =>
  url.replace(/^https?:\/\/(?:www\.)?/, '').replace(/\/$/, '');

const savedAt = (date: string) =>
  new Date(date).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
  });

const useQueryState = () => {
  const { ready, params, setParams } = usePersistedFilters('inspiration', [
    'app',
    'status',
  ]);
  const status = params.get('status');
  return {
    ready,
    app: params.get('app'),
    status: (status === ALL || INSPIRATION_STATUSES.includes(status as InspirationStatus)
      ? status
      : 'OPEN') as StatusFilter,
    setApp: (app: string | null) => setParams({ app }),
    setStatus: (value: StatusFilter) =>
      setParams({ status: value === 'OPEN' ? null : value }),
  };
};

const ChoiceSelect = ({
  value,
  items,
  onChange,
  label,
  className,
}: {
  value: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) => (
  <Select value={value} items={items} onValueChange={(v) => v && onChange(String(v))}>
    <SelectTrigger
      className={className || 'w-full data-[size=default]:h-10 md:data-[size=default]:h-8'}
      aria-label={label}
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);

/* --------------------------------------------------------------- add bar */

const AddLink = ({
  app,
  appName,
  appItems,
  onAppChange,
}: {
  app: string | null;
  appName: string | null;
  appItems: { value: string; label: string }[];
  onAppChange: (app: string | null) => void;
}) => {
  const t = useT();
  const toaster = useToaster();
  const api = useInspirationApi();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(0);
  const [canPaste, setCanPaste] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCanPaste(!!navigator.clipboard?.readText);
  }, []);

  const appId = app && app !== NO_APP ? app : null;
  // with an empty field, pasting from the clipboard is the main action
  const empty = !value.trim();

  // the field clears at once, so the next link can follow while this one saves
  const save = async (raw: string) => {
    if (!parseInspirationLink(raw)) {
      setError(t('inspiration_no_link'));
      return;
    }
    setError(null);
    setValue('');
    setSaving((n) => n + 1);
    try {
      const link = await api.add({ url: raw, appId });
      toaster.show(
        link.duplicate ? t('inspiration_duplicate') : t('inspiration_saved'),
        link.duplicate ? 'warning' : 'success'
      );
    } catch (e) {
      setError((e as Error).message);
      setValue((current) => current || raw);
    } finally {
      setSaving((n) => n - 1);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) save(value);
    input.current?.focus();
  };

  // pasting a link saves it right away
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!value.trim() && parseInspirationLink(text)) {
      e.preventDefault();
      save(text);
    }
  };

  const fromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) save(text);
      else setError(t('inspiration_clipboard_empty'));
    } catch {
      setError(t('inspiration_clipboard_blocked'));
      input.current?.focus();
    }
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={submit}>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel>
                {t('inspiration_app')}
              </FieldLabel>
              <ChoiceSelect
                value={app || ALL}
                items={appItems}
                onChange={(v) => onAppChange(v === ALL ? null : v)}
                label={t('inspiration_app')}
                className="w-full data-[size=default]:h-10 md:w-64 md:data-[size=default]:h-8"
              />
            </Field>
            <Field data-invalid={!!error || undefined}>
              <FieldLabel htmlFor="inspiration-url">
                {t('inspiration_link')}
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Input
                  ref={input}
                  id="inspiration-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  enterKeyHint="send"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  onPaste={paste}
                  placeholder={t('inspiration_link_placeholder')}
                  aria-invalid={!!error || undefined}
                  className="h-10 min-w-0 flex-1 basis-56 text-base md:h-8 md:text-sm"
                />
                <Button
                  type="submit"
                  variant={empty && canPaste ? 'outline' : 'default'}
                  className="h-10 max-md:flex-1 md:h-8"
                  disabled={empty}
                >
                  {saving ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <PlusIcon data-icon="inline-start" />
                  )}
                  {t('inspiration_add')}
                </Button>
                {canPaste ? (
                  <Button
                    type="button"
                    variant={empty ? 'default' : 'outline'}
                    className="h-10 max-md:flex-1 md:h-8"
                    onClick={fromClipboard}
                  >
                    <ClipboardPasteIcon data-icon="inline-start" />
                    {t('inspiration_paste')}
                  </Button>
                ) : null}
              </div>
              {error ? (
                <FieldError>{error}</FieldError>
              ) : (
                <FieldDescription>
                  {appName
                    ? t('inspiration_saves_for', { app: appName })
                    : t('inspiration_saves_without_app')}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------------ list */

const LinkRow = ({
  link,
  showApp,
  showStatus,
  onEdit,
}: {
  link: InspirationLink;
  showApp: boolean;
  showStatus: boolean;
  onEdit: () => void;
}) => {
  const t = useT();
  const by = link.createdBy?.name || link.createdBy?.email;
  return (
    <Item variant="outline" size="sm" className="flex-nowrap bg-card">
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full min-w-0">
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="truncate hover:underline"
          >
            {link.author || shortUrl(link.url)}
          </a>
        </ItemTitle>
        {link.note ? (
          <ItemDescription className="line-clamp-2">{link.note}</ItemDescription>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <Badge variant="secondary">{PLATFORM_LABEL[link.platform]}</Badge>
          {showApp && link.app ? (
            <Badge variant="outline">{link.app.name}</Badge>
          ) : null}
          {link.format ? <Badge>{link.format.name}</Badge> : null}
          {showStatus && link.status !== 'OPEN' ? (
            <Badge variant="outline">{t(statusLabelKey[link.status])}</Badge>
          ) : null}
          <span className="tabular-nums">
            {savedAt(link.createdAt)}
            {by ? ` · ${by}` : ''}
          </span>
        </div>
      </ItemContent>
      <ItemActions className="gap-1">
        <Button
          variant="ghost"
          size="icon-lg"
          nativeButton={false}
          render={<a href={link.url} target="_blank" rel="noreferrer" />}
          aria-label={t('inspiration_open')}
        >
          <ExternalLinkIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={onEdit}
          aria-label={t('inspiration_edit')}
        >
          <PencilIcon />
        </Button>
      </ItemActions>
    </Item>
  );
};

/* ----------------------------------------------------------------- sheet */

const EditSheet = ({
  link,
  onClose,
}: {
  link: InspirationLink | null;
  onClose: () => void;
}) => {
  const t = useT();
  const toaster = useToaster();
  const api = useInspirationApi();
  const { data: apps } = useAppList();
  const { data: formats } = useFormats();
  const [status, setStatus] = useState<InspirationStatus>('OPEN');
  const [appId, setAppId] = useState(NONE);
  const [formatId, setFormatId] = useState(NONE);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!link) return;
    setStatus(link.status);
    setAppId(link.app?.id || NONE);
    setFormatId(link.format?.id || NONE);
    setNote(link.note || '');
    setError(null);
    // reset when the sheet opens for another link, not on every refetch
  }, [link?.id]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      toaster.show(done, 'success');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!link) return;
    run(
      () =>
        api.update(link.id, {
          status,
          appId: appId === NONE ? null : appId,
          formatId: formatId === NONE ? null : formatId,
          note: note.trim() || null,
        }),
      t('inspiration_updated')
    );
  };

  const appItems = [
    { value: NONE, label: t('formats_no_app') },
    ...(apps || []).map((a) => ({ value: a.id, label: a.name })),
  ];
  const formatItems = [
    { value: NONE, label: t('inspiration_no_format') },
    ...(formats || []).map((f) => ({ value: f.id, label: f.name })),
  ];

  return (
    <Sheet open={!!link} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetHeader>
            <SheetTitle>{t('inspiration_edit')}</SheetTitle>
            <SheetDescription className="truncate">
              {link ? shortUrl(link.url) : null}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>{t('inspiration_status')}</FieldLabel>
                <ToggleGroup
                  value={[status]}
                  onValueChange={(v) =>
                    v.length && setStatus(v[0] as InspirationStatus)
                  }
                  variant="outline"
                  spacing={0}
                  className="w-full"
                >
                  {INSPIRATION_STATUSES.map((s) => (
                    <ToggleGroupItem
                      key={s}
                      value={s}
                      className="h-10 flex-1 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground md:h-8"
                    >
                      {t(statusLabelKey[s])}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel>{t('inspiration_format')}</FieldLabel>
                <ChoiceSelect
                  value={formatId}
                  items={formatItems}
                  onChange={(v) => {
                    setFormatId(v);
                    if (v !== NONE && status === 'OPEN') setStatus('DONE');
                  }}
                  label={t('inspiration_format')}
                />
                <FieldDescription>
                  {t('inspiration_format_description')}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>{t('inspiration_app')}</FieldLabel>
                <ChoiceSelect
                  value={appId}
                  items={appItems}
                  onChange={setAppId}
                  label={t('inspiration_app')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="inspiration-note">
                  {t('inspiration_note')}
                </FieldLabel>
                <Textarea
                  id="inspiration-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('inspiration_note_placeholder')}
                  maxLength={1000}
                  rows={3}
                  className="text-base md:text-sm"
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>
          </div>
          <SheetFooter className="flex-row justify-between border-t">
            <ConfirmDelete
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 text-destructive md:h-8"
                  disabled={busy}
                >
                  <Trash2Icon data-icon="inline-start" />
                  {t('delete')}
                </Button>
              }
              title={t('inspiration_delete_title')}
              description={t('inspiration_delete_description')}
              confirm={t('delete')}
              onConfirm={() =>
                link && run(() => api.remove(link.id), t('inspiration_deleted'))
              }
            />
            <Button type="submit" className="h-10 md:h-8" disabled={busy}>
              {busy ? <Spinner data-icon="inline-start" /> : null}
              {t('save')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

/* ------------------------------------------------------------------ page */

export const InspirationPage = () => {
  const t = useT();
  const { ready, app, status, setApp, setStatus } = useQueryState();
  const { data: apps } = useAppList();
  const links = useInspiration(app, ready);
  const [editId, setEditId] = useState<string | null>(null);

  const appItems = useMemo(
    () => [
      { value: ALL, label: t('formats_all_apps') },
      ...(apps || []).map((a) => ({ value: a.id, label: a.name })),
      { value: NO_APP, label: t('formats_no_app') },
    ],
    [apps, t]
  );
  const appName =
    app && app !== NO_APP ? apps?.find((a) => a.id === app)?.name || null : null;

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      OPEN: 0,
      DONE: 0,
      SKIPPED: 0,
      all: links.data?.length || 0,
    };
    for (const link of links.data || []) result[link.status]++;
    return result;
  }, [links.data]);

  const shown = (links.data || []).filter(
    (link) => status === ALL || link.status === status
  );
  const editing = links.data?.find((link) => link.id === editId) || null;

  const content = () => {
    if (links.error) {
      return (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t('inspiration_load_failed')}</EmptyTitle>
            <EmptyDescription>{links.error.message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => links.mutate()}>
              {t('formats_retry')}
            </Button>
          </EmptyContent>
        </Empty>
      );
    }
    if (!links.data) {
      return (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      );
    }
    if (!shown.length) {
      return (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LightbulbIcon />
            </EmptyMedia>
            <EmptyTitle>
              {links.data.length
                ? t('inspiration_empty_status_title')
                : t('inspiration_empty_title')}
            </EmptyTitle>
            <EmptyDescription>
              {links.data.length
                ? t('inspiration_empty_status_description')
                : t('inspiration_empty_description')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }
    return (
      <ItemGroup className="gap-2">
        {shown.map((link) => (
          <LinkRow
            key={link.id}
            link={link}
            showApp={!app}
            showStatus={status === ALL}
            onEdit={() => setEditId(link.id)}
          />
        ))}
      </ItemGroup>
    );
  };

  const statusItems: StatusFilter[] = [...INSPIRATION_STATUSES, ALL];

  return (
    <PageBody className="max-w-3xl">
      <PageHeader
        title={t('inspiration')}
        description={t('inspiration_page_description')}
      />
      <AddLink
        app={app}
        appName={appName}
        appItems={appItems}
        onAppChange={setApp}
      />
      <ToggleGroup
        value={[status]}
        onValueChange={(v) => v.length && setStatus(v[0] as StatusFilter)}
        variant="outline"
        spacing={0}
        className="w-full md:w-auto"
        aria-label={t('inspiration_status')}
      >
        {statusItems.map((s) => (
          <ToggleGroupItem
            key={s}
            value={s}
            className="h-10 flex-1 px-3 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground md:h-8 md:flex-none"
          >
            {s === ALL ? t('inspiration_status_all') : t(statusLabelKey[s])}
            <span className="tabular-nums opacity-70">{counts[s]}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {content()}
      <EditSheet link={editing} onClose={() => setEditId(null)} />
    </PageBody>
  );
};
