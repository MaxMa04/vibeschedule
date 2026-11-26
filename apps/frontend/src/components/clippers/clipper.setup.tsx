'use client';

import {
  FC,
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSWR from 'swr';
import {
  CircleAlertIcon,
  ImageUpIcon,
  LinkIcon,
  ListTodoIcon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserRoundCogIcon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { WARMUP_DAYS } from '@vibeschedule/helpers/clippers/clipper.onboarding';
import {
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
} from '@vibeschedule/helpers/clippers/clipper.tasks';
import { responseMessage } from '@vibeschedule/frontend/lib/response-message';
import { whatsappUrl } from '@vibeschedule/frontend/components/clippers/clipper.guide';
import type {
  OnboardingAccount,
  OnboardingClipper,
} from '@vibeschedule/frontend/components/clippers/clipper.types';
import { Alert, AlertTitle } from '@vibeschedule/frontend/components/ui/alert';
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
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Checkbox } from '@vibeschedule/frontend/components/ui/checkbox';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@vibeschedule/frontend/components/ui/sheet';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { Textarea } from '@vibeschedule/frontend/components/ui/textarea';
import { cn } from '@vibeschedule/frontend/lib/utils';

export const SETUP_KEY = '/clippers/onboarding';

const useSetup = () => {
  const fetch = useFetch();
  return useSWR(SETUP_KEY, async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error();
    }
    return (await response.json()).clippers as OnboardingClipper[];
  });
};

type Editing = { clipper: OnboardingClipper; account: OnboardingAccount };
type EditingIds = { clipperId: string; accountId: string };

// Tasks for one account: the clipper sees the open ones on the posting page
// and checks them off, also while the account is already running
const TaskEditor: FC<{ account: OnboardingAccount; onSaved: () => void }> = ({
  account,
  onSaved,
}) => {
  const t = useT();
  const id = useId();
  const fetch = useFetch();
  const toaster = useToaster();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (key: string, url: string, init: RequestInit) => {
    setBusy(key);
    const response = await fetch(url, init);
    setBusy(null);
    if (!response.ok) {
      toaster.show(
        (await responseMessage(response)) || t('setup_save_failed'),
        'warning'
      );
      return false;
    }
    onSaved();
    return true;
  };

  const add = async (kind: 'CUSTOM' | 'PROFILE') => {
    if (kind === 'CUSTOM' && !title.trim()) {
      return;
    }
    const ok = await call(kind, `/clippers/accounts/${account.id}/tasks`, {
      method: 'POST',
      body: JSON.stringify(
        kind === 'PROFILE' ? { kind } : { kind, title, description }
      ),
    });
    if (ok && kind === 'CUSTOM') {
      setTitle('');
      setDescription('');
    }
  };

  const tasks = [
    ...account.tasks.filter((task) => !task.doneDay),
    ...account.tasks.filter((task) => task.doneDay),
  ];
  const profileOpen = account.tasks.some(
    (task) => task.kind === 'PROFILE' && !task.doneDay
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{t('setup_tasks')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('setup_tasks_hint')}
        </p>
      </div>
      {!!tasks.length && (
        <ul className="flex flex-col rounded-lg border">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-3 border-b px-3 py-2.5 last:border-b-0"
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                <Checkbox
                  id={`${id}-${task.id}`}
                  className="size-5"
                  checked={!!task.doneDay}
                  disabled={busy === task.id}
                  onCheckedChange={(checked) =>
                    call(task.id, `/clippers/tasks/${task.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ done: !!checked }),
                    })
                  }
                />
              </span>
              <label
                htmlFor={`${id}-${task.id}`}
                className="flex min-w-0 flex-1 flex-col text-sm"
              >
                <span
                  className={cn(
                    'font-medium',
                    task.doneDay &&
                      'font-normal text-muted-foreground line-through'
                  )}
                >
                  {task.title}
                </span>
                {task.description && (
                  <span className="whitespace-pre-line text-muted-foreground">
                    {task.description}
                  </span>
                )}
                {task.kind === 'PROFILE' && (
                  <span className="text-muted-foreground">
                    {t('setup_task_profile_hint')}
                  </span>
                )}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 text-muted-foreground md:size-8"
                aria-label={t('setup_task_delete')}
                disabled={busy === `delete-${task.id}`}
                onClick={() =>
                  call(`delete-${task.id}`, `/clippers/tasks/${task.id}`, {
                    method: 'DELETE',
                  })
                }
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-title`} className="sr-only">
            {t('setup_task_title')}
          </FieldLabel>
          <Input
            id={`${id}-title`}
            className="h-10 md:h-8"
            placeholder={t('setup_task_title')}
            maxLength={TASK_TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              // the sheet is the profile form, Enter adds the task instead
              if (e.key === 'Enter') {
                e.preventDefault();
                add('CUSTOM');
              }
            }}
          />
        </Field>
        {!!title.trim() && (
          <Field>
            <FieldLabel htmlFor={`${id}-description`} className="sr-only">
              {t('setup_task_description')}
            </FieldLabel>
            <Textarea
              id={`${id}-description`}
              rows={2}
              placeholder={t('setup_task_description')}
              maxLength={TASK_DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        )}
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 md:h-8"
          disabled={!title.trim() || busy === 'CUSTOM'}
          onClick={() => add('CUSTOM')}
        >
          {busy === 'CUSTOM' ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PlusIcon data-icon="inline-start" />
          )}
          {t('setup_task_add')}
        </Button>
        {!profileOpen && (
          <Button
            type="button"
            variant="ghost"
            className="h-10 md:h-8"
            disabled={!account.profile.ready || busy === 'PROFILE'}
            onClick={() => add('PROFILE')}
          >
            {busy === 'PROFILE' ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <UserRoundCogIcon data-icon="inline-start" />
            )}
            {t('setup_task_add_profile')}
          </Button>
        )}
      </div>
    </div>
  );
};

const ProfileSheet: FC<{
  editing: Editing | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ editing, onClose, onSaved }) => {
  const t = useT();
  const id = useId();
  const fetch = useFetch();
  const toaster = useToaster();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    username: '',
    bio: '',
    topic: '',
    searchTerms: '',
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const account = editing?.account;

  useEffect(() => {
    if (!account) {
      return;
    }
    setForm({
      name: account.profile.name || '',
      username: account.profile.username || '',
      bio: account.profile.bio || '',
      topic: account.profile.topic || '',
      searchTerms: account.profile.searchTerms.join('\n'),
    });
    setAvatar(account.profile.avatar);
  }, [account?.id]);

  const upload = async (file: File) => {
    if (!account) {
      return;
    }
    setUploading(true);
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`/clippers/accounts/${account.id}/avatar`, {
      method: 'POST',
      body,
    });
    setUploading(false);
    if (!response.ok) {
      toaster.show(
        (await responseMessage(response)) || t('setup_upload_failed'),
        'warning'
      );
      return;
    }
    setAvatar((await response.json()).avatar);
    onSaved();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!account) {
      return;
    }
    setSaving(true);
    const response = await fetch(`/clippers/accounts/${account.id}`, {
      method: 'PUT',
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) {
      toaster.show(
        (await responseMessage(response)) || t('setup_save_failed'),
        'warning'
      );
      return;
    }
    toaster.show(t('setup_saved'), 'success');
    onSaved();
    onClose();
  };

  const restart = async () => {
    if (!account) {
      return;
    }
    const response = await fetch(`/clippers/accounts/${account.id}/restart`, {
      method: 'POST',
    });
    if (!response.ok) {
      toaster.show(
        (await responseMessage(response)) || t('setup_save_failed'),
        'warning'
      );
      return;
    }
    onSaved();
    onClose();
  };

  const set =
    (key: keyof typeof form) => (event: { target: { value: string } }) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Sheet open={!!editing} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        {editing && account && (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <SheetHeader>
              <SheetTitle>
                {t('start_account', { number: account.position + 1 })}
              </SheetTitle>
              <SheetDescription>
                {editing.clipper.user.name || editing.clipper.user.email}
              </SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('start_profile_picture')}</FieldLabel>
                  <div className="flex items-center gap-3">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt=""
                        className="size-16 rounded-full border object-cover"
                      />
                    ) : (
                      <span className="flex size-16 items-center justify-center rounded-full border bg-muted">
                        <UserRoundIcon className="size-6 text-muted-foreground" />
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 md:h-8"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <ImageUpIcon data-icon="inline-start" />
                      )}
                      {avatar
                        ? t('setup_avatar_change')
                        : t('setup_avatar_upload')}
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) {
                          upload(file);
                        }
                      }}
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-name`}>
                    {t('start_profile_name')}
                  </FieldLabel>
                  <Input
                    id={`${id}-name`}
                    className="h-10 md:h-8"
                    maxLength={30}
                    value={form.name}
                    onChange={set('name')}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-username`}>
                    {t('start_profile_username')}
                  </FieldLabel>
                  <Input
                    id={`${id}-username`}
                    className="h-10 md:h-8"
                    placeholder="gym.lena"
                    maxLength={25}
                    value={form.username}
                    onChange={set('username')}
                  />
                  <FieldDescription>
                    {t('setup_username_hint')}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-bio`}>
                    {t('start_profile_bio')}
                  </FieldLabel>
                  <Textarea
                    id={`${id}-bio`}
                    rows={2}
                    maxLength={80}
                    value={form.bio}
                    onChange={set('bio')}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-topic`}>
                    {t('setup_topic')}
                  </FieldLabel>
                  <Input
                    id={`${id}-topic`}
                    className="h-10 md:h-8"
                    placeholder={t('setup_topic_placeholder')}
                    value={form.topic}
                    onChange={set('topic')}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-terms`}>
                    {t('setup_search_terms')}
                  </FieldLabel>
                  <Textarea
                    id={`${id}-terms`}
                    rows={4}
                    placeholder={'weight gain\nbulking\ngym food'}
                    value={form.searchTerms}
                    onChange={set('searchTerms')}
                  />
                  <FieldDescription>
                    {t('setup_search_terms_hint')}
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <TaskEditor account={account} onSaved={onSaved} />
              {(account.createdDay || account.channel) && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 self-start text-muted-foreground md:h-8"
                      >
                        <RotateCcwIcon data-icon="inline-start" />
                        {t('start_restart')}
                      </Button>
                    }
                  />
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('start_restart_title', {
                          number: account.position + 1,
                        })}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('setup_restart_text')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={restart}
                      >
                        {t('start_restart_confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <SheetFooter className="border-t">
              <Button type="submit" className="h-10 md:h-8" disabled={saving}>
                {saving && <Spinner data-icon="inline-start" />}
                {t('save')}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};

const AccountRow: FC<{ account: OnboardingAccount; onEdit: () => void }> = ({
  account,
  onEdit,
}) => {
  const t = useT();
  const { profile, plan } = account;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {profile.avatar ? (
        <img
          src={profile.avatar}
          alt=""
          className="size-9 shrink-0 rounded-full border object-cover"
        />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted">
          <UserRoundIcon className="size-4 text-muted-foreground" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {profile.username
            ? `@${profile.username}`
            : t('start_account', { number: account.position + 1 })}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {account.channel && (
            <span className="flex min-w-0 items-center gap-1">
              <LinkIcon className="size-3.5 shrink-0" />
              <span className="truncate">{account.channel.name}</span>
            </span>
          )}
          {profile.topic && <span className="truncate">{profile.topic}</span>}
          {plan.stage === 'warmup' && (
            <span className="tabular-nums">
              {t('setup_warmups', { done: plan.warmups, days: WARMUP_DAYS })}
            </span>
          )}
          {!!account.openTasks && (
            <span className="flex items-center gap-1 tabular-nums">
              <ListTodoIcon className="size-3.5" />
              {t('setup_open_tasks', { count: account.openTasks })}
            </span>
          )}
          {account.rebrand &&
            !account.tasks.some((task) => task.kind === 'PROFILE') && (
              <span className="flex items-center gap-1 text-destructive">
                <TriangleAlertIcon className="size-3.5" />
                {t('setup_rebrand', {
                  username: account.channel?.username || '',
                })}
              </span>
            )}
          {account.usernameMismatch && (
            <span className="flex items-center gap-1 text-destructive">
              <TriangleAlertIcon className="size-3.5" />
              {t('setup_mismatch', {
                username: `@${account.channel?.username}`,
              })}
            </span>
          )}
        </span>
      </div>
      <Badge
        variant={
          plan.stage === 'profile' || plan.stage === 'reconnect'
            ? 'destructive'
            : plan.stage === 'active'
            ? 'default'
            : 'outline'
        }
      >
        {t(`setup_stage_${plan.stage}`)}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 md:size-8"
        aria-label={t('setup_edit')}
        onClick={onEdit}
      >
        <PencilIcon />
      </Button>
    </li>
  );
};

// Every clipper with the profiles we hand out and how far each account is
export const ClipperSetup: FC = () => {
  const t = useT();
  const { data, error, mutate } = useSetup();
  const [editingIds, setEditing] = useState<EditingIds | null>(null);
  // looked up in the live data, so saved tasks show right away
  const editing = useMemo((): Editing | null => {
    const clipper = data?.find((c) => c.user.id === editingIds?.clipperId);
    const account = clipper?.accounts.find(
      (a) => a.id === editingIds?.accountId
    );
    return clipper && account ? { clipper, account } : null;
  }, [data, editingIds]);

  if (error) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>{t('clippers_load_failed')}</AlertTitle>
      </Alert>
    );
  }
  if (!data) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (!data.length) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>{t('clippers_empty')}</EmptyTitle>
          <EmptyDescription>{t('setup_empty_hint')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((clipper) => (
        <Card key={clipper.user.id} className="gap-0 pb-0">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="truncate">
                {clipper.user.name || clipper.user.email}
              </span>
              <Badge variant={clipper.done ? 'default' : 'outline'}>
                {clipper.done ? t('setup_done') : t('setup_running')}
              </Badge>
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="truncate">{clipper.user.email}</span>
              {clipper.user.phone && (
                <a
                  href={whatsappUrl(clipper.user.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-4"
                >
                  <MessageCircleIcon className="size-3.5" />
                  {clipper.user.phone}
                </a>
              )}
              <span>
                {clipper.payout.iban
                  ? t('setup_payout_done')
                  : t('setup_payout_missing')}
              </span>
            </CardDescription>
          </CardHeader>
          <ul className="divide-y">
            {clipper.accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onEdit={() =>
                  setEditing({ clipperId: clipper.user.id, accountId: account.id })
                }
              />
            ))}
          </ul>
        </Card>
      ))}
      <ProfileSheet
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => mutate()}
      />
    </div>
  );
};
