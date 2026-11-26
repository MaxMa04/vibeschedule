'use client';

import { FC, FormEvent, useEffect, useId, useRef, useState } from 'react';
import useSWR from 'swr';
import {
  CircleAlertIcon,
  ImageUpIcon,
  MessageCircleIcon,
  PencilIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { WARMUP_DAYS } from '@vibeschedule/helpers/clippers/clipper.onboarding';
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
          {profile.topic && <span className="truncate">{profile.topic}</span>}
          {plan.stage === 'warmup' && (
            <span className="tabular-nums">
              {t('setup_warmups', { done: plan.warmups, days: WARMUP_DAYS })}
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
  const [editing, setEditing] = useState<Editing | null>(null);

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
                onEdit={() => setEditing({ clipper, account })}
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
