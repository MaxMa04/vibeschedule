'use client';

import { FormEvent, ReactElement, useEffect, useMemo, useState } from 'react';
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Textarea } from '@vibeschedule/frontend/components/ui/textarea';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { Separator } from '@vibeschedule/frontend/components/ui/separator';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@vibeschedule/frontend/components/ui/alert-dialog';
import {
  App,
  FORMAT_STATUSES,
  Format,
  FormatStatus,
  useApps,
  useChannels,
  useFormats,
  useFormatsApi,
} from '@vibeschedule/frontend/components/formats/formats.data';
import {
  ChannelAvatar,
  StatusBadge,
  statusLabelKey,
} from '@vibeschedule/frontend/components/formats/formats.ui';

const NEW_FORMAT = '__new';
const NO_APP_VALUE = '__none';

const useBusy = () => {
  const toaster = useToaster();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (done) toaster.show(done, 'success');
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
};

export const ConfirmDelete = ({
  trigger,
  title,
  description,
  confirm,
  onConfirm,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  confirm: string;
  onConfirm: () => void;
}) => {
  const t = useT();
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const StatusToggle = ({
  value,
  onChange,
}: {
  value: FormatStatus;
  onChange: (status: FormatStatus) => void;
}) => {
  const t = useT();
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => v.length && onChange(v[0] as FormatStatus)}
      variant="outline"
      spacing={0}
      className="w-full"
    >
      {FORMAT_STATUSES.map((status) => (
        <ToggleGroupItem
          key={status}
          value={status}
          className="h-10 flex-1 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground md:h-8"
        >
          {t(statusLabelKey[status])}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

/* ---------------------------------------------------------------- format */

export type FormatSheetState =
  | { mode: 'create' }
  | { mode: 'edit'; formatId: string };

export const FormatSheet = ({
  state,
  onClose,
}: {
  state: FormatSheetState | null;
  onClose: () => void;
}) => {
  const t = useT();
  const api = useFormatsApi();
  const { data: formats } = useFormats();
  const { data: channels } = useChannels();
  const { busy, error, setError, run } = useBusy();
  const format =
    state?.mode === 'edit'
      ? formats?.find((f) => f.id === state.formatId)
      : undefined;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!state) return;
    setName(format?.name || '');
    setDescription(format?.description || '');
    setError(null);
    // reset when the sheet opens for another format, not on every refetch
  }, [state]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { name: name.trim(), description: description.trim() || null };
    const ok = await run(
      () =>
        format ? api.updateFormat(format.id, body) : api.createFormat(body),
      format ? t('formats_saved') : t('formats_created')
    );
    if (ok) onClose();
  };

  const remove = async () => {
    if (!format) return;
    if (await run(() => api.deleteFormat(format.id), t('formats_deleted'))) {
      onClose();
    }
  };

  const runsOn = (format?.integrations || [])
    .map((i) => ({
      ...i,
      channel: channels?.find((c) => c.id === i.integrationId),
    }))
    .filter((i) => i.channel);

  return (
    <Sheet open={!!state} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetHeader>
            <SheetTitle>
              {format ? t('formats_edit_title') : t('formats_new_title')}
            </SheetTitle>
            <SheetDescription>
              {t('formats_sheet_description')}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4">
            <FieldGroup className="gap-4">
              <Field data-invalid={!!error || undefined}>
                <FieldLabel htmlFor="format-name">
                  {t('formats_name')}
                </FieldLabel>
                <Input
                  id="format-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder={t('formats_name_placeholder')}
                  autoFocus
                  required
                  maxLength={120}
                  className="h-10 md:h-8"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="format-description">
                  {t('formats_description')}
                </FieldLabel>
                <Textarea
                  id="format-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('formats_description_placeholder')}
                  maxLength={2000}
                  rows={4}
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>
            {format ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">{t('formats_runs_on')}</h3>
                {runsOn.length ? (
                  <ul className="flex flex-col divide-y rounded-lg border">
                    {runsOn.map(({ channel, status, integrationId }) => (
                      <li
                        key={integrationId}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <ChannelAvatar
                          name={channel!.name}
                          picture={channel!.picture}
                          identifier={channel!.identifier}
                          className="size-6"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {channel!.name}
                        </span>
                        <StatusBadge status={status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('formats_runs_nowhere')}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <SheetFooter className="flex-row justify-between border-t">
            {format ? (
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
                title={t('formats_delete_title')}
                description={t('formats_delete_description')}
                confirm={t('delete')}
                onConfirm={remove}
              />
            ) : (
              <span />
            )}
            <Button
              type="submit"
              className="h-10 md:h-8"
              disabled={busy || !name.trim()}
            >
              {busy ? <Spinner data-icon="inline-start" /> : null}
              {format ? t('save') : t('formats_create')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

/* ------------------------------------------------------------ assignment */

export interface AssignSheetState {
  channel: {
    id: string;
    name: string;
    picture: string | null;
    identifier: string;
  };
  /** set: edit the assignment of this format */
  formatId?: string;
  /** new assignment with this format preselected */
  presetFormatId?: string;
}

export const AssignSheet = ({
  state,
  onClose,
  onEditFormat,
}: {
  state: AssignSheetState | null;
  onClose: () => void;
  onEditFormat: (formatId: string) => void;
}) => {
  const t = useT();
  const api = useFormatsApi();
  const { data: formats } = useFormats();
  const { busy, error, setError, run } = useBusy();
  const [formatId, setFormatId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState<FormatStatus>('ACTIVE');
  const [note, setNote] = useState('');

  const channelId = state?.channel.id;
  const assignment = (f: Format) =>
    f.integrations.find((i) => i.integrationId === channelId);
  const editing = state?.formatId
    ? formats?.find((f) => f.id === state.formatId)
    : undefined;
  const current = editing ? assignment(editing) : undefined;

  useEffect(() => {
    if (!state) return;
    setFormatId(state.formatId || state.presetFormatId || null);
    setNewName('');
    setStatus(current?.status || 'ACTIVE');
    setNote(current?.note || '');
    setError(null);
    // reset when the sheet opens for another assignment, not on every refetch
  }, [state]);

  const choices = useMemo(
    () => (formats || []).filter((f) => !assignment(f)),
    [formats, channelId]
  );
  const items = [
    ...choices.map((f) => ({ value: f.id, label: f.name })),
    { value: NEW_FORMAT, label: t('formats_new_format_option') },
  ];
  const creating = !editing && (formatId === NEW_FORMAT || !choices.length);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!state) return;
    const ok = await run(
      async () => {
        const id = creating
          ? (
              await api.createFormat({
                name: newName.trim(),
                description: null,
              })
            ).id
          : formatId;
        if (!id) throw new Error(t('formats_pick_format'));
        await api.assign(id, state.channel.id, {
          status,
          note: note.trim() || null,
        });
      },
      editing ? t('formats_saved') : t('formats_assigned')
    );
    if (ok) onClose();
  };

  const remove = async () => {
    if (!state || !editing) return;
    if (
      await run(
        () => api.unassign(editing.id, state.channel.id),
        t('formats_unassigned')
      )
    ) {
      onClose();
    }
  };

  return (
    <Sheet open={!!state} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetHeader>
            <SheetTitle>
              {editing ? editing.name : t('formats_assign_title')}
            </SheetTitle>
            {state ? (
              <SheetDescription className="flex items-center gap-2">
                <ChannelAvatar
                  name={state.channel.name}
                  picture={state.channel.picture}
                  identifier={state.channel.identifier}
                  className="size-5"
                />
                {state.channel.name}
              </SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
            <FieldGroup className="gap-4">
              {editing ? (
                editing.description ? (
                  <p className="text-sm whitespace-pre-line text-muted-foreground">
                    {editing.description}
                  </p>
                ) : null
              ) : (
                <Field>
                  <FieldLabel>{t('formats_format')}</FieldLabel>
                  {choices.length ? (
                    <Select
                      value={formatId}
                      items={items}
                      onValueChange={(v) => setFormatId((v as string) || null)}
                    >
                      <SelectTrigger
                        className="w-full data-[size=default]:h-10 md:data-[size=default]:h-8"
                        aria-label={t('formats_format')}
                      >
                        <SelectValue placeholder={t('formats_pick_format')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {choices.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectItem value={NEW_FORMAT}>
                          <PlusIcon />
                          {t('formats_new_format_option')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                  {creating ? (
                    <>
                      <Input
                        value={newName}
                        onChange={(e) => {
                          setNewName(e.target.value);
                          setError(null);
                        }}
                        placeholder={t('formats_name_placeholder')}
                        aria-label={t('formats_name')}
                        autoFocus
                        maxLength={120}
                        className="h-10 md:h-8"
                      />
                      <FieldDescription>
                        {t('formats_new_inline_hint')}
                      </FieldDescription>
                    </>
                  ) : null}
                </Field>
              )}
              <Field>
                <FieldLabel>{t('formats_status')}</FieldLabel>
                <StatusToggle value={status} onChange={setStatus} />
              </Field>
              <Field>
                <FieldLabel htmlFor="assignment-note">
                  {t('formats_note')}
                </FieldLabel>
                <Textarea
                  id="assignment-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('formats_note_placeholder')}
                  maxLength={500}
                  rows={3}
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              {editing ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto self-start p-0"
                  onClick={() => onEditFormat(editing.id)}
                >
                  <PencilIcon data-icon="inline-start" />
                  {t('formats_edit_format_link')}
                </Button>
              ) : null}
            </FieldGroup>
          </div>
          <SheetFooter className="flex-row justify-between border-t">
            {editing ? (
              <ConfirmDelete
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 text-destructive md:h-8"
                    disabled={busy}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    {t('formats_unassign')}
                  </Button>
                }
                title={t('formats_unassign_title')}
                description={t('formats_unassign_description')}
                confirm={t('formats_unassign')}
                onConfirm={remove}
              />
            ) : (
              <span />
            )}
            <Button
              type="submit"
              className="h-10 md:h-8"
              disabled={
                busy || (creating ? !newName.trim() : !editing && !formatId)
              }
            >
              {busy ? <Spinner data-icon="inline-start" /> : null}
              {editing ? t('save') : t('formats_assign')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

/* ------------------------------------------------------------------ apps */

const AppRow = ({ app }: { app: App }) => {
  const t = useT();
  const api = useFormatsApi();
  const { busy, error, run } = useBusy();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(app.name);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() === app.name) return setEditing(false);
    if (await run(() => api.renameApp(app.id, name.trim()))) setEditing(false);
  };

  return (
    <li className="flex flex-col gap-1 px-3 py-2">
      {editing ? (
        <form onSubmit={save} className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={t('formats_app_name')}
            autoFocus
            className="h-10 md:h-8"
          />
          <Button
            type="submit"
            size="icon"
            className="size-10 md:size-8"
            disabled={busy || !name.trim()}
            aria-label={t('save')}
          >
            {busy ? <Spinner /> : <CheckIcon />}
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {app.name}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('formats_accounts_count', {
              count: app._count?.integrations || 0,
            })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-9 md:size-7"
            onClick={() => {
              setName(app.name);
              setEditing(true);
            }}
            aria-label={t('formats_app_rename')}
          >
            <PencilIcon />
          </Button>
          <ConfirmDelete
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-9 text-destructive md:size-7"
                aria-label={t('delete')}
              >
                <Trash2Icon />
              </Button>
            }
            title={t('formats_app_delete_title')}
            description={t('formats_app_delete_description')}
            confirm={t('delete')}
            onConfirm={() => run(() => api.deleteApp(app.id))}
          />
        </div>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </li>
  );
};

export const AppsSheet = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const t = useT();
  const api = useFormatsApi();
  const { data: apps } = useApps();
  const { data: channels } = useChannels();
  const { busy, error, run } = useBusy();
  const [name, setName] = useState('');

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => api.createApp(name.trim()))) setName('');
  };

  const appItems = [
    { value: NO_APP_VALUE, label: t('formats_no_app') },
    ...(apps || []).map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('formats_apps_title')}</SheetTitle>
          <SheetDescription>{t('formats_apps_description')}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t('formats_apps')}</h3>
            {apps?.length ? (
              <ul className="flex flex-col divide-y rounded-lg border">
                {apps.map((app) => (
                  <AppRow key={app.id} app={app} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('formats_apps_empty')}
              </p>
            )}
            <form onSubmit={create} className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('formats_app_name_placeholder')}
                aria-label={t('formats_app_name')}
                className="h-10 md:h-8"
              />
              <Button
                type="submit"
                className="h-10 md:h-8"
                disabled={busy || !name.trim()}
              >
                {busy ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                {t('formats_app_add')}
              </Button>
            </form>
            {error ? <FieldError>{error}</FieldError> : null}
          </section>
          <Separator />
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t('formats_accounts')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('formats_accounts_app_hint')}
            </p>
            <ul className="flex flex-col divide-y rounded-lg border">
              {(channels || []).map((channel) => (
                <li
                  key={channel.id}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <ChannelAvatar
                    name={channel.name}
                    picture={channel.picture}
                    identifier={channel.identifier}
                    className="size-7"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {channel.name}
                  </span>
                  <Select
                    value={channel.app?.id || NO_APP_VALUE}
                    items={appItems}
                    onValueChange={(v) =>
                      run(() =>
                        api.setChannelApp(
                          channel.id,
                          v && v !== NO_APP_VALUE ? String(v) : null
                        )
                      )
                    }
                  >
                    <SelectTrigger
                      className="w-40 data-[size=default]:h-10 md:data-[size=default]:h-8"
                      aria-label={t('formats_app_of', { name: channel.name })}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {appItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};
