'use client';

import { FC, FormEvent, useEffect, useId, useMemo, useState } from 'react';
import {
  BoxIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  FileTextIcon,
  InboxIcon,
  LandmarkIcon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserRoundIcon,
  UserRoundPlusIcon,
  UsersIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { billingDay } from '@vibeschedule/helpers/clippers/clipper.billing';
import {
  APP_BRIEF_MAX,
  TASK_TITLE_MAX,
  visibleTasks,
} from '@vibeschedule/helpers/clippers/clipper.tasks';
import {
  AccountToDo,
  dueToday,
  TeamToDo,
  teamToDos,
} from '@vibeschedule/helpers/clippers/clipper.todo';
import { responseMessage } from '@vibeschedule/frontend/lib/response-message';
import { useAppList, useTeamList } from '@vibeschedule/frontend/lib/shared-data';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { whatsappUrl } from '@vibeschedule/frontend/components/clippers/clipper.guide';
import { useApplications } from '@vibeschedule/frontend/components/clippers/clipper.applications';
import {
  Editing,
  EditingIds,
  ForTeamSwitch,
  ProfileSheet,
  TeamBadge,
  useSetup,
} from '@vibeschedule/frontend/components/clippers/clipper.setup';
import {
  dayLabel,
  stepTitle,
} from '@vibeschedule/frontend/components/onboarding/onboarding.labels';
import type {
  ClipperTask,
  OnboardingAccount,
  OnboardingClipper,
} from '@vibeschedule/frontend/components/clippers/clipper.types';
import { Alert, AlertTitle } from '@vibeschedule/frontend/components/ui/alert';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Checkbox } from '@vibeschedule/frontend/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@vibeschedule/frontend/components/ui/dialog';
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
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import { Input } from '@vibeschedule/frontend/components/ui/input';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@vibeschedule/frontend/components/ui/sheet';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { Textarea } from '@vibeschedule/frontend/components/ui/textarea';
import { cn } from '@vibeschedule/frontend/lib/utils';

type T = ReturnType<typeof useT>;

const ALL = 'all';
const MINE = 'me';
const NOBODY = 'none';
const GENERAL = 'general';

const nameOf = (person: { name: string | null; email: string }) =>
  person.name || person.email;

const accountName = (account: OnboardingAccount, t: T) =>
  account.profile.username
    ? `@${account.profile.username}`
    : t('start_account', { number: account.position + 1 });

// what the clipper has to do today on the account, in one line
const todoText = (todo: AccountToDo, today: string, t: T) => {
  if (todo.kind === 'post') {
    return t('overview_todo_post', { posted: todo.posted, due: todo.due });
  }
  const step = stepTitle(todo.key, t);
  if (todo.kind === 'open') {
    return t('overview_todo_open', { step });
  }
  switch (todo.lock) {
    case 'profile':
      return t('overview_todo_profile');
    case 'previous':
      return t('overview_todo_previous', { step });
    case 'day':
      return t('overview_todo_from', {
        step,
        day: dayLabel(todo.from!, today, t),
      });
    default:
      return step;
  }
};

/** a request to the admin API that shows a toast when it fails */
const useCall = (onSaved: () => void) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
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
  return { busy, call };
};

// payout details the clipper sent another way, e.g. on WhatsApp
const PayoutDialog: FC<{ clipper: OnboardingClipper; onSaved: () => void }> = ({
  clipper,
  onSaved,
}) => {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [iban, setIban] = useState('');
  const { busy, call } = useCall(onSaved);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await call('payout', `/clippers/users/${clipper.user.id}/payout`, {
      method: 'PUT',
      body: JSON.stringify({ name, iban }),
    });
    if (ok) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-10 md:h-8">
            <LandmarkIcon data-icon="inline-start" />
            {t('overview_payout_missing')}
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('start_payout_title')}</DialogTitle>
            <DialogDescription>
              {t('overview_payout_description', {
                name: nameOf(clipper.user),
              })}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`${id}-name`}>
              {t('start_payout_name')}
            </FieldLabel>
            <Input
              id={`${id}-name`}
              className="h-10 md:h-8"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-iban`}>IBAN</FieldLabel>
            <Input
              id={`${id}-iban`}
              className="h-10 font-mono md:h-8"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button
              type="submit"
              className="h-10 md:h-8"
              disabled={!name.trim() || !iban.trim() || busy === 'payout'}
            >
              {busy === 'payout' && <Spinner data-icon="inline-start" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// the team member who looks after the clipper
const ManagerSelect: FC<{
  clipper: OnboardingClipper;
  onSaved: () => void;
  className?: string;
}> = ({ clipper, onSaved, className }) => {
  const t = useT();
  const { data: team } = useTeamList();
  const { busy, call } = useCall(onSaved);
  const managers = (team || []).filter((member) => member.role !== 'CLIPPER');
  const items = [
    { value: NOBODY, label: t('overview_no_manager') },
    ...managers.map((member) => ({ value: member.id, label: nameOf(member) })),
  ];
  return (
    <Select
      items={items}
      value={clipper.manager?.id || NOBODY}
      disabled={!!busy}
      onValueChange={(value) =>
        call('manager', `/clippers/users/${clipper.user.id}/manager`, {
          method: 'PUT',
          body: JSON.stringify({
            managerId: !value || value === NOBODY ? null : String(value),
          }),
        })
      }
    >
      <SelectTrigger
        className={cn(
          'min-w-36 data-[size=default]:h-10 md:data-[size=default]:h-8',
          !clipper.manager && 'text-muted-foreground',
          className
        )}
        aria-label={t('overview_manager_of', { name: nameOf(clipper.user) })}
      >
        <UserRoundIcon className="text-muted-foreground" />
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
};

// one task with a checkbox, for the clipper's or for us
const TaskItem: FC<{
  task: ClipperTask;
  busy: boolean;
  onCheck: (done: boolean) => void;
  onDelete?: () => void;
  context?: string;
}> = ({ task, busy, onCheck, onDelete, context }) => {
  const t = useT();
  const id = useId();
  const done = !!task.doneDay;
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="flex size-6 shrink-0 items-center justify-center">
        <Checkbox
          id={id}
          className="size-5"
          checked={done}
          disabled={busy}
          onCheckedChange={(checked) => onCheck(!!checked)}
        />
      </span>
      <label htmlFor={id} className="flex min-w-0 flex-1 flex-col text-sm">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'font-medium',
              done && 'font-normal text-muted-foreground line-through'
            )}
          >
            {task.title}
          </span>
          {task.forTeam && <TeamBadge />}
        </span>
        {context && (
          <span className="text-xs text-muted-foreground">{context}</span>
        )}
        {task.description && !done && (
          <span className="whitespace-pre-line text-muted-foreground">
            {task.description}
          </span>
        )}
      </label>
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 text-muted-foreground md:size-8"
          aria-label={t('setup_task_delete')}
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
      )}
    </li>
  );
};

const TaskList: FC<{
  tasks: ClipperTask[];
  today: string;
  onSaved: () => void;
  className?: string;
}> = ({ tasks, today, onSaved, className }) => {
  const { busy, call } = useCall(onSaved);
  const shown = visibleTasks(tasks, today);
  if (!shown.length) {
    return null;
  }
  return (
    <ul className={cn('flex flex-col', className)}>
      {shown.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          busy={busy === task.id}
          onCheck={(done) =>
            call(task.id, `/clippers/tasks/${task.id}`, {
              method: 'PUT',
              body: JSON.stringify({ done }),
            })
          }
          onDelete={() =>
            call(task.id, `/clippers/tasks/${task.id}`, { method: 'DELETE' })
          }
        />
      ))}
    </ul>
  );
};

// a new task, in general or for one account, for the clipper or for us
const AddTask: FC<{ clipper: OnboardingClipper; onSaved: () => void }> = ({
  clipper,
  onSaved,
}) => {
  const t = useT();
  const id = useId();
  const { busy, call } = useCall(onSaved);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(GENERAL);
  const [forTeam, setForTeam] = useState(false);
  const targets = [
    { value: GENERAL, label: t('tasks_general') },
    ...clipper.accounts.map((account) => ({
      value: account.id,
      label: accountName(account, t),
    })),
  ];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    const url =
      target === GENERAL
        ? `/clippers/users/${clipper.user.id}/tasks`
        : `/clippers/accounts/${target}/tasks`;
    const ok = await call('add', url, {
      method: 'POST',
      body: JSON.stringify({ kind: 'CUSTOM', title, forTeam }),
    });
    if (ok) {
      setTitle('');
      setForTeam(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 border-t px-4 py-3 md:flex-row md:flex-wrap md:items-center"
    >
      <FieldLabel htmlFor={`${id}-title`} className="sr-only">
        {t('setup_task_title')}
      </FieldLabel>
      <Input
        id={`${id}-title`}
        className="h-10 md:h-8 md:min-w-48 md:flex-1"
        placeholder={t('setup_task_title')}
        maxLength={TASK_TITLE_MAX}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={targets}
          value={target}
          onValueChange={(value) => setTarget(value ? String(value) : GENERAL)}
        >
          <SelectTrigger
            className="min-w-32 flex-1 data-[size=default]:h-10 md:flex-none md:data-[size=default]:h-8"
            aria-label={t('overview_task_target')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {targets.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ForTeamSwitch checked={forTeam} onChange={setForTeam} />
        <Button
          type="submit"
          variant="outline"
          className="h-10 md:h-8"
          disabled={!title.trim() || busy === 'add'}
        >
          {busy === 'add' ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PlusIcon data-icon="inline-start" />
          )}
          {t('setup_task_add')}
        </Button>
      </div>
    </form>
  );
};

const AccountItem: FC<{
  account: OnboardingAccount;
  today: string;
  onEdit: () => void;
  onSaved: () => void;
}> = ({ account, today, onEdit, onSaved }) => {
  const t = useT();
  const due = dueToday(account.todo);
  const waiting =
    account.todo.kind === 'locked' && account.todo.lock === 'profile';
  return (
    <li className="flex flex-col px-4 py-3">
      <div className="flex items-center gap-3">
        {account.profile.avatar ? (
          <img
            src={account.profile.avatar}
            alt=""
            className="size-9 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted">
            <UserRoundIcon className="size-4 text-muted-foreground" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">
              {accountName(account, t)}
            </span>
            {account.app && (
              <Badge variant="outline" className="shrink-0">
                <BoxIcon data-icon="inline-start" />
                {account.app.name}
              </Badge>
            )}
          </span>
          <span
            className={cn(
              'flex items-center gap-1 text-sm',
              waiting
                ? 'text-destructive'
                : due
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {!due && !waiting && (
              <CircleCheckIcon className="size-3.5 shrink-0" />
            )}
            {waiting && <TriangleAlertIcon className="size-3.5 shrink-0" />}
            <span className="truncate">{todoText(account.todo, today, t)}</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 md:size-8"
          aria-label={t('setup_edit')}
          onClick={onEdit}
        >
          <PencilIcon />
        </Button>
      </div>
      <TaskList
        tasks={account.tasks}
        today={today}
        onSaved={onSaved}
        className="ps-12"
      />
    </li>
  );
};

const ClipperCard: FC<{
  clipper: OnboardingClipper;
  today: string;
  onEdit: (accountId: string) => void;
  onSaved: () => void;
}> = ({ clipper, today, onEdit, onSaved }) => {
  const t = useT();
  const { open } = clipper.todo;
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="truncate">{nameOf(clipper.user)}</span>
          <Badge variant={open ? 'default' : 'outline'} className="shrink-0">
            {open
              ? t('overview_open_today', { count: open })
              : t('overview_all_done')}
          </Badge>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ManagerSelect clipper={clipper} onSaved={onSaved} />
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
          {!clipper.payout.iban && (
            <PayoutDialog clipper={clipper} onSaved={onSaved} />
          )}
        </CardDescription>
      </CardHeader>
      {!!visibleTasks(clipper.tasks, today).length && (
        <section className="flex flex-col border-b px-4 pt-3 pb-1">
          <h3 className="text-sm font-medium">{t('tasks_general')}</h3>
          <TaskList tasks={clipper.tasks} today={today} onSaved={onSaved} />
        </section>
      )}
      <ul className="divide-y">
        {clipper.accounts.map((account) => (
          <AccountItem
            key={account.id}
            account={account}
            today={today}
            onEdit={() => onEdit(account.id)}
            onSaved={onSaved}
          />
        ))}
      </ul>
      <AddTask clipper={clipper} onSaved={onSaved} />
    </Card>
  );
};

// What we still have to do for the clippers in the filter, plus applications
const TeamToDos: FC<{
  clippers: OnboardingClipper[];
  pendingApplications: number;
  onOpenApplications: () => void;
  onEdit: (ids: EditingIds) => void;
  onSaved: () => void;
}> = ({
  clippers,
  pendingApplications,
  onOpenApplications,
  onEdit,
  onSaved,
}) => {
  const t = useT();
  const { busy, call } = useCall(onSaved);
  const items = clippers.flatMap((clipper) =>
    teamToDos(clipper).map((todo) => ({ clipper, todo }))
  );
  const count = items.length + (pendingApplications ? 1 : 0);

  const row = (clipper: OnboardingClipper, todo: TeamToDo) => {
    const account =
      'accountId' in todo && todo.accountId
        ? clipper.accounts.find((a) => a.id === todo.accountId)
        : undefined;
    const where = [nameOf(clipper.user), account && accountName(account, t)]
      .filter(Boolean)
      .join(' · ');
    if (todo.kind === 'task') {
      const task = [
        ...clipper.tasks,
        ...clipper.accounts.flatMap((a) => a.tasks),
      ].find((candidate) => candidate.id === todo.taskId);
      if (!task) {
        return null;
      }
      return (
        <TaskItem
          key={task.id}
          task={task}
          context={where}
          busy={busy === task.id}
          onCheck={(done) =>
            call(task.id, `/clippers/tasks/${task.id}`, {
              method: 'PUT',
              body: JSON.stringify({ done }),
            })
          }
        />
      );
    }
    if (todo.kind === 'manager') {
      return (
        <li
          key={`${clipper.user.id}-manager`}
          className="flex flex-wrap items-center gap-3 py-2"
        >
          <span className="flex size-6 shrink-0 items-center justify-center">
            <UserRoundPlusIcon className="size-4 text-muted-foreground" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col text-sm">
            <span className="font-medium">{t('overview_team_manager')}</span>
            <span className="text-xs text-muted-foreground">{where}</span>
          </span>
          <ManagerSelect clipper={clipper} onSaved={onSaved} />
        </li>
      );
    }
    return (
      <li
        key={`${todo.accountId}-${todo.kind}`}
        className="flex items-center gap-3 py-2"
      >
        <span className="flex size-6 shrink-0 items-center justify-center">
          <TriangleAlertIcon className="size-4 text-destructive" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col text-sm">
          <span className="font-medium">
            {t(`overview_team_${todo.kind}`, {
              username: account?.channel?.username || '',
            })}
          </span>
          <span className="text-xs text-muted-foreground">{where}</span>
        </span>
        <Button
          variant="outline"
          className="h-10 shrink-0 md:h-8"
          onClick={() =>
            onEdit({ clipperId: clipper.user.id, accountId: todo.accountId })
          }
        >
          <PencilIcon data-icon="inline-start" />
          {t('overview_team_open_profile')}
        </Button>
      </li>
    );
  };

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className={cn(count && 'border-b')}>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{t('overview_team_title')}</span>
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {count
              ? t('tasks_open_count', { count })
              : t('tasks_all_done')}
          </span>
        </CardTitle>
        <CardDescription>{t('overview_team_description')}</CardDescription>
      </CardHeader>
      {!!count && (
        <ul className="flex flex-col divide-y px-4">
          {!!pendingApplications && (
            <li className="flex items-center gap-3 py-2">
              <span className="flex size-6 shrink-0 items-center justify-center">
                <InboxIcon className="size-4 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">
                {t('overview_team_applications', {
                  count: pendingApplications,
                })}
              </span>
              <Button
                variant="outline"
                className="h-10 shrink-0 md:h-8"
                onClick={onOpenApplications}
              >
                {t('overview_team_applications_open')}
              </Button>
            </li>
          )}
          {items.map(({ clipper, todo }) => row(clipper, todo))}
        </ul>
      )}
    </Card>
  );
};

const BriefRow: FC<{ app: { id: string; name: string; brief?: string | null } }> = ({
  app,
}) => {
  const t = useT();
  const id = useId();
  const fetch = useFetch();
  const toaster = useToaster();
  const { mutate } = useAppList();
  const [brief, setBrief] = useState(app.brief || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => setBrief(app.brief || ''), [app.brief]);
  const changed = brief.trim() !== (app.brief || '');

  const save = async () => {
    setSaving(true);
    const response = await fetch(`/apps/${app.id}/brief`, {
      method: 'PUT',
      body: JSON.stringify({ brief }),
    });
    setSaving(false);
    if (!response.ok) {
      toaster.show(
        (await responseMessage(response)) || t('setup_save_failed'),
        'warning'
      );
      return;
    }
    toaster.show(t('brief_saved'), 'success');
    mutate();
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>{app.name}</FieldLabel>
      <Textarea
        id={id}
        rows={5}
        maxLength={APP_BRIEF_MAX}
        placeholder={t('brief_placeholder')}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        className="h-10 w-fit md:h-8"
        disabled={!changed || saving}
        onClick={save}
      >
        {saving && <Spinner data-icon="inline-start" />}
        {t('save')}
      </Button>
    </Field>
  );
};

// The brief per app: the clipper reads it on the start and posting page
const BriefsSheet: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const t = useT();
  const { data: apps } = useAppList();
  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('brief_sheet_title')}</SheetTitle>
          <SheetDescription>{t('brief_sheet_description')}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          {apps?.length ? (
            apps.map((app) => <BriefRow key={app.id} app={app} />)
          ) : (
            <FieldDescription>{t('brief_no_apps')}</FieldDescription>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// What every clipper still has to do today, per clipper and per account,
// and what we have to do for them. Filtered by who looks after them.
export const ClipperOverview: FC<{ onOpenApplications: () => void }> = ({
  onOpenApplications,
}) => {
  const t = useT();
  const me = useUser();
  const { data, error, mutate } = useSetup();
  const { data: team } = useTeamList();
  const { data: applications } = useApplications();
  const [filter, setFilter] = useState<string | null>(null);
  const [briefs, setBriefs] = useState(false);
  const [editingIds, setEditing] = useState<EditingIds | null>(null);
  const today = billingDay(new Date());

  const mine = (data || []).filter((c) => c.manager?.id === me?.id);
  // my clippers first, all when I look after nobody yet
  const active = filter ?? (mine.length ? MINE : ALL);
  const shown = useMemo(
    () =>
      (data || []).filter((clipper) =>
        active === ALL
          ? true
          : active === MINE
          ? clipper.manager?.id === me?.id
          : active === NOBODY
          ? !clipper.manager
          : clipper.manager?.id === active
      ),
    [data, active, me?.id]
  );
  const editing = useMemo((): Editing | null => {
    const clipper = data?.find((c) => c.user.id === editingIds?.clipperId);
    const account = clipper?.accounts.find(
      (a) => a.id === editingIds?.accountId
    );
    return clipper && account ? { clipper, account } : null;
  }, [data, editingIds]);

  const managers = (team || []).filter(
    (member) => member.role !== 'CLIPPER' && member.id !== me?.id
  );
  const filters = [
    { value: MINE, label: t('overview_filter_mine', { count: mine.length }) },
    { value: ALL, label: t('overview_filter_all', { count: data?.length || 0 }) },
    { value: NOBODY, label: t('overview_no_manager') },
    ...managers.map((member) => ({ value: member.id, label: nameOf(member) })),
  ];
  const pending =
    applications?.filter((a) => a.status === 'PENDING').length || 0;

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          items={filters}
          value={active}
          onValueChange={(value) => setFilter(value ? String(value) : ALL)}
        >
          <SelectTrigger
            className="min-w-44 data-[size=default]:h-10 md:data-[size=default]:h-8"
            aria-label={t('overview_filter')}
          >
            <UsersIcon className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {filters.slice(0, 3).map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
            {filters.length > 3 && <SelectSeparator />}
            <SelectGroup>
              {filters.slice(3).map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="h-10 md:h-8"
          onClick={() => setBriefs(true)}
        >
          <FileTextIcon data-icon="inline-start" />
          {t('brief_sheet_title')}
        </Button>
      </div>

      <TeamToDos
        clippers={shown}
        pendingApplications={pending}
        onOpenApplications={onOpenApplications}
        onEdit={setEditing}
        onSaved={() => mutate()}
      />

      {!shown.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>
              {data.length ? t('overview_empty_filter') : t('clippers_empty')}
            </EmptyTitle>
            <EmptyDescription>
              {data.length
                ? t('overview_empty_filter_hint')
                : t('setup_empty_hint')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        shown.map((clipper) => (
          <ClipperCard
            key={clipper.user.id}
            clipper={clipper}
            today={today}
            onEdit={(accountId) =>
              setEditing({ clipperId: clipper.user.id, accountId })
            }
            onSaved={() => mutate()}
          />
        ))
      )}

      <ProfileSheet
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => mutate()}
      />
      <BriefsSheet open={briefs} onClose={() => setBriefs(false)} />
    </div>
  );
};
