'use client';

import {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import useSWR from 'swr';
import copy from 'copy-to-clipboard';
import {
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LinkIcon,
  LockIcon,
  MessageCircleIcon,
  RotateCcwIcon,
  SearchIcon,
  SmartphoneIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import {
  AccountTask,
  isWarmupKey,
  WARMUP_DAYS,
  WARMUP_MINUTES,
  addDays,
} from '@vibeschedule/helpers/clippers/clipper.onboarding';
import { responseMessage } from '@vibeschedule/frontend/lib/response-message';
import {
  CLIPPER_GUIDE_URL,
  CLIPPER_SUPPORT_PHONE,
  CLIPPER_SUPPORT_URL,
  CLIPPER_WARMUP_URL,
} from '@vibeschedule/frontend/components/clippers/clipper.guide';
import type {
  OnboardingAccount,
  OnboardingState,
} from '@vibeschedule/frontend/components/clippers/clipper.types';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@vibeschedule/frontend/components/ui/alert';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Progress } from '@vibeschedule/frontend/components/ui/progress';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';

export const ONBOARDING_KEY = '/onboarding';

export const useOnboarding = () => {
  const fetch = useFetch();
  return useSWR(ONBOARDING_KEY, async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error();
    }
    return (await response.json()) as OnboardingState | null;
  });
};

/** steps done and all steps, the payout included */
export const onboardingProgress = (state: OnboardingState) => {
  const tasks = state.accounts.flatMap((a) =>
    a.plan.tasks.filter((task) => task.key !== 'post')
  );
  return {
    done:
      tasks.filter((task) => task.state === 'done').length +
      (state.payout.done ? 1 : 0),
    total: tasks.length + 1,
  };
};

const dayLabel = (day: string, today: string, t: ReturnType<typeof useT>) =>
  day === addDays(today, 1)
    ? t('start_tomorrow')
    : new Intl.DateTimeFormat('de-DE', {
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${day}T12:00:00Z`));

const useCopy = () => {
  const t = useT();
  const toaster = useToaster();
  return useCallback(
    (value: string) => {
      copy(value);
      toaster.show(t('start_copied'), 'success');
    },
    [t, toaster]
  );
};

const CopyRow: FC<{ label: string; value: string | null }> = ({
  label,
  value,
}) => {
  const t = useT();
  const copyValue = useCopy();
  if (!value) {
    return null;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="truncate font-medium">{value}</span>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="size-10 shrink-0 md:size-8"
        aria-label={t('start_copy', { label })}
        onClick={() => copyValue(value)}
      >
        <CopyIcon />
      </Button>
    </div>
  );
};

// the picture as a file, loaded before the tap: iOS shares only right inside it
const useAvatarFile = (account: OnboardingAccount) => {
  const fetch = useFetch();
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    if (!account.profile.avatar) {
      return;
    }
    let cancelled = false;
    fetch(`/onboarding/accounts/${account.id}/avatar`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error();
        }
        const blob = await response.blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        if (!cancelled) {
          setFile(
            new File(
              [blob],
              `${account.profile.username || 'profilbild'}.${ext}`,
              {
                type: blob.type,
              }
            )
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [account.id, account.profile.avatar]);
  return file;
};

const Profile: FC<{ account: OnboardingAccount }> = ({ account }) => {
  const t = useT();
  const file = useAvatarFile(account);
  const { profile } = account;

  const save = useCallback(() => {
    if (!file) {
      return;
    }
    const download = () => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    if (
      typeof navigator.share === 'function' &&
      navigator.canShare?.({ files: [file] })
    ) {
      navigator.share({ files: [file] }).catch((err: Error) => {
        if (err.name !== 'AbortError') {
          download();
        }
      });
    } else {
      download();
    }
  }, [file]);

  if (!profile.ready) {
    return (
      <Alert>
        <CircleDashedIcon />
        <AlertTitle>{t('start_profile_pending')}</AlertTitle>
        <AlertDescription>{t('start_profile_pending_text')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <img
          src={profile.avatar!}
          alt=""
          className="size-16 shrink-0 rounded-full border object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t('start_profile_picture')}
          </span>
          <Button
            variant="outline"
            className="h-10 self-start md:h-8"
            onClick={save}
            disabled={!file}
          >
            {file ? (
              <DownloadIcon data-icon="inline-start" />
            ) : (
              <Spinner data-icon="inline-start" />
            )}
            {t('start_save_picture')}
          </Button>
        </div>
      </div>
      <CopyRow label={t('start_profile_name')} value={profile.name} />
      <CopyRow
        label={t('start_profile_username')}
        value={profile.username && `@${profile.username}`}
      />
      <CopyRow label={t('start_profile_bio')} value={profile.bio} />
    </div>
  );
};

const Niche: FC<{ account: OnboardingAccount }> = ({ account }) => {
  const t = useT();
  const copyValue = useCopy();
  const { topic, searchTerms } = account.profile;
  if (!topic && !searchTerms.length) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
      {topic && (
        <p className="text-sm">
          <span className="text-muted-foreground">{t('start_topic')} </span>
          <span className="font-medium">{topic}</span>
        </p>
      )}
      {!!searchTerms.length && (
        <div className="flex flex-wrap gap-2">
          {searchTerms.map((term) => (
            <Button
              key={term}
              variant="outline"
              size="sm"
              className="h-9 bg-background md:h-7"
              onClick={() => copyValue(term)}
            >
              <SearchIcon data-icon="inline-start" />
              {term}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

const GuideLink: FC<{ href: string; children: ReactNode }> = ({
  href,
  children,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-1 self-start text-sm font-medium underline underline-offset-4"
  >
    {children}
    <ExternalLinkIcon className="size-3.5" />
  </a>
);

const Steps: FC<{ items: string[] }> = ({ items }) => (
  <ol className="flex list-decimal flex-col gap-1.5 ps-5 text-sm">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ol>
);

const taskTitle = (task: AccountTask, t: ReturnType<typeof useT>) =>
  isWarmupKey(task.key)
    ? t('start_task_warmup', { day: task.key.split('_')[1], days: WARMUP_DAYS })
    : t(`start_task_${task.key}`);

const lockText = (
  task: AccountTask,
  account: OnboardingAccount,
  today: string,
  t: ReturnType<typeof useT>
) => {
  switch (task.lock) {
    case 'profile':
      return t('start_lock_profile');
    case 'previous':
      return t('start_lock_previous', { number: account.position });
    case 'day':
      return t('start_lock_day', { day: dayLabel(task.from!, today, t) });
    default:
      return null;
  }
};

const AccountCard: FC<{
  account: OnboardingAccount;
  today: string;
  onChange: (state: OnboardingState) => void;
}> = ({ account, today, onChange }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [busy, setBusy] = useState<string | null>(null);
  const [fypNo, setFypNo] = useState(false);
  const number = account.position + 1;

  const act = useCallback(
    async (step: string, body?: object) => {
      setBusy(step);
      const response = await fetch(
        `/onboarding/accounts/${account.id}/${step}`,
        {
          method: 'POST',
          ...(body ? { body: JSON.stringify(body) } : {}),
        }
      );
      setBusy(null);
      if (!response.ok) {
        toaster.show(
          (await responseMessage(response)) || t('start_failed'),
          'warning'
        );
        return;
      }
      onChange(await response.json());
    },
    [account.id, fetch, onChange, t, toaster]
  );

  const connect = useCallback(async () => {
    setBusy('connect');
    const response = await fetch(`/onboarding/accounts/${account.id}/connect`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.url) {
      setBusy(null);
      toaster.show(body.message || t('clipper_connect_failed'), 'warning');
      return;
    }
    window.location.href = body.url;
  }, [account.id, fetch, t, toaster]);

  const body = (task: AccountTask): ReactNode => {
    if (task.key === 'create') {
      return (
        <>
          <Steps
            items={[
              t('start_create_1'),
              t('start_create_2'),
              t('start_create_3'),
              t('start_create_4'),
            ]}
          />
          <Button
            className="h-10 md:h-9"
            onClick={() => act('created')}
            disabled={!!busy}
          >
            {busy === 'created' ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {t('start_create_done')}
          </Button>
          <GuideLink href={CLIPPER_WARMUP_URL}>
            {t('start_guide_warmup')}
          </GuideLink>
        </>
      );
    }
    if (isWarmupKey(task.key)) {
      return (
        <>
          <p className="text-sm">
            {t('start_warmup_intro', { minutes: WARMUP_MINUTES })}
          </p>
          <Niche account={account} />
          <Steps
            items={[
              t('start_warmup_1'),
              t('start_warmup_2'),
              t('start_warmup_3'),
              t('start_warmup_4'),
              t('start_warmup_5'),
            ]}
          />
          <p className="text-sm text-muted-foreground">
            {t('start_warmup_calm')}
          </p>
          <Button
            className="h-10 md:h-9"
            onClick={() => act('warmup')}
            disabled={!!busy}
          >
            {busy === 'warmup' ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {t('start_warmup_done', { minutes: WARMUP_MINUTES })}
          </Button>
          <GuideLink href={CLIPPER_WARMUP_URL}>
            {t('start_guide_warmup')}
          </GuideLink>
        </>
      );
    }
    if (task.key === 'fyp') {
      return (
        <>
          <p className="text-sm">{t('start_fyp_question')}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-10 md:h-9"
              onClick={() => act('fyp', { ok: true })}
              disabled={!!busy}
            >
              {busy === 'fyp' ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {t('start_fyp_yes')}
            </Button>
            <Button
              variant="outline"
              className="h-10 md:h-9"
              onClick={() => setFypNo(true)}
            >
              {t('start_fyp_no')}
            </Button>
          </div>
          {fypNo && (
            <Alert>
              <MessageCircleIcon />
              <AlertTitle>{t('start_fyp_no_title')}</AlertTitle>
              <AlertDescription>
                {t('start_fyp_no_text')}{' '}
                <a
                  href={CLIPPER_SUPPORT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {t('start_whatsapp_max')}
                </a>
              </AlertDescription>
            </Alert>
          )}
        </>
      );
    }
    if (task.key === 'connect') {
      return (
        <>
          {account.channel?.disabled && (
            <p className="text-sm text-destructive">
              {t('clipper_account_disconnected')}
            </p>
          )}
          <Steps
            items={[
              t('start_connect_1', {
                username: account.profile.username
                  ? `@${account.profile.username}`
                  : t('start_this_account'),
              }),
              t('start_connect_2'),
              t('start_connect_3'),
            ]}
          />
          <Button className="h-10 md:h-9" onClick={connect} disabled={!!busy}>
            {busy === 'connect' ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <LinkIcon data-icon="inline-start" />
            )}
            {t('start_connect_button')}
          </Button>
          <GuideLink href={CLIPPER_GUIDE_URL}>
            {t('start_guide_connect')}
          </GuideLink>
        </>
      );
    }
    return (
      <>
        <p className="text-sm">{t('start_post_text')}</p>
        <Button
          className="h-10 self-start md:h-9"
          nativeButton={false}
          render={<a href="/manual" />}
        >
          <SmartphoneIcon data-icon="inline-start" />
          {t('start_post_button')}
        </Button>
        <GuideLink href={CLIPPER_GUIDE_URL}>{t('start_guide_post')}</GuideLink>
      </>
    );
  };

  // the step to do now, the others are one line each
  const current = account.plan.tasks.find((task) => task.state === 'open');
  const started = !!account.createdDay || !!account.channel;

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            {t('start_account', { number })}
            {account.profile.username && (
              <span className="truncate font-normal text-muted-foreground">
                @{account.profile.username}
              </span>
            )}
          </span>
          <Badge
            variant={account.plan.stage === 'active' ? 'default' : 'outline'}
          >
            {t(`start_stage_${account.plan.stage}`)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">
        {account.plan.stage !== 'active' && <Profile account={account} />}
        {account.usernameMismatch && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>{t('start_mismatch_title')}</AlertTitle>
            <AlertDescription>
              {t('start_mismatch_text', {
                connected: `@${account.channel?.username}`,
                expected: `@${account.profile.username}`,
              })}
            </AlertDescription>
          </Alert>
        )}
        <ol className="flex flex-col">
          {account.plan.tasks.map((task) => {
            const isCurrent = task === current;
            const locked =
              task.state === 'locked'
                ? lockText(task, account, today, t)
                : null;
            return (
              <li
                key={task.key}
                className="flex gap-3 border-b py-3 last:border-b-0"
              >
                <span className="mt-0.5 shrink-0">
                  {task.state === 'done' ? (
                    <CircleCheckIcon className="size-5 text-primary" />
                  ) : task.state === 'open' ? (
                    <CircleDashedIcon className="size-5 text-foreground" />
                  ) : (
                    <LockIcon className="size-5 text-muted-foreground" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-col">
                    <span
                      className={
                        task.state === 'locked'
                          ? 'text-muted-foreground'
                          : task.state === 'done'
                          ? 'text-muted-foreground line-through'
                          : 'font-medium'
                      }
                    >
                      {taskTitle(task, t)}
                    </span>
                    {locked && (
                      <span className="text-sm text-muted-foreground">
                        {locked}
                      </span>
                    )}
                  </div>
                  {isCurrent && body(task)}
                </div>
              </li>
            );
          })}
        </ol>
        {started && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 self-start text-muted-foreground md:h-7"
                >
                  <RotateCcwIcon data-icon="inline-start" />
                  {t('start_restart')}
                </Button>
              }
            />
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('start_restart_title', { number })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('start_restart_text')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => act('restart')}
                >
                  {t('start_restart_confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
};

const Payout: FC<{
  payout: OnboardingState['payout'];
  onChange: (state: OnboardingState) => void;
}> = ({ payout, onChange }) => {
  const t = useT();
  const id = useId();
  const fetch = useFetch();
  const toaster = useToaster();
  const [editing, setEditing] = useState(!payout.done);
  const [name, setName] = useState(payout.name || '');
  const [iban, setIban] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch('/onboarding/payout', {
      method: 'PUT',
      body: JSON.stringify({ name, iban }),
    });
    setSaving(false);
    if (!response.ok) {
      toaster.show(
        (await responseMessage(response)) || t('start_failed'),
        'warning'
      );
      return;
    }
    toaster.show(t('start_payout_saved'), 'success');
    setEditing(false);
    setIban('');
    onChange(await response.json());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {payout.done ? (
            <CircleCheckIcon className="size-5 text-primary" />
          ) : (
            <CircleDashedIcon className="size-5" />
          )}
          {t('start_payout_title')}
        </CardTitle>
        <CardDescription>{t('start_payout_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={save}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor={`${id}-name`}>
                  {t('start_payout_name')}
                </FieldLabel>
                <Input
                  id={`${id}-name`}
                  autoComplete="name"
                  className="h-10"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-iban`}>IBAN</FieldLabel>
                <Input
                  id={`${id}-iban`}
                  className="h-10 font-mono uppercase"
                  placeholder="DE00 0000 0000 0000 0000 00"
                  required
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  className="h-10 md:h-9"
                  disabled={saving || !name || !iban}
                >
                  {saving && <Spinner data-icon="inline-start" />}
                  {t('save')}
                </Button>
                {payout.done && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 md:h-9"
                    onClick={() => setEditing(false)}
                  >
                    {t('cancel')}
                  </Button>
                )}
              </div>
            </FieldGroup>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col text-sm">
              <span className="font-medium">{payout.name}</span>
              <span className="truncate font-mono text-muted-foreground">
                {payout.iban}
              </span>
            </div>
            <Button
              variant="outline"
              className="h-10 md:h-8"
              onClick={() => setEditing(true)}
            >
              {t('start_payout_change')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// A clipper's start: payout, then each account from creating to posting
export const ClipperStart: FC = () => {
  const t = useT();
  const { data, error, mutate } = useOnboarding();
  const onChange = useCallback(
    (state: OnboardingState) => mutate(state, { revalidate: false }),
    [mutate]
  );
  const progress = useMemo(() => data && onboardingProgress(data), [data]);

  return (
    <PageBody className="max-w-2xl">
      <PageHeader
        title={t('start_title')}
        description={t('start_description')}
      />
      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{t('start_load_failed')}</AlertTitle>
        </Alert>
      ) : data === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : data === null ? (
        <Alert>
          <CircleAlertIcon />
          <AlertTitle>{t('start_only_clippers')}</AlertTitle>
        </Alert>
      ) : (
        <>
          {progress && (
            <div className="flex flex-col gap-2 rounded-lg border px-4 py-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  {data.done ? t('start_all_done') : t('start_progress')}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {t('start_progress_count', progress)}
                </span>
              </div>
              <Progress value={(progress.done / progress.total) * 100} />
            </div>
          )}
          <Payout payout={data.payout} onChange={onChange} />
          {data.accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              today={data.today}
              onChange={onChange}
            />
          ))}
          <Card>
            <CardHeader>
              <CardTitle>{t('start_help_title')}</CardTitle>
              <CardDescription>{t('start_help_text')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                className="h-10 md:h-9"
                nativeButton={false}
                render={
                  <a
                    href={CLIPPER_SUPPORT_URL}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <MessageCircleIcon data-icon="inline-start" />
                {CLIPPER_SUPPORT_PHONE}
              </Button>
              <Button
                variant="outline"
                className="h-10 md:h-9"
                nativeButton={false}
                render={
                  <a
                    href={CLIPPER_WARMUP_URL}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <ExternalLinkIcon data-icon="inline-start" />
                {t('start_guide_warmup')}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </PageBody>
  );
};
