'use client';

import { FC, FormEvent, useEffect, useId, useState } from 'react';
import useSWR from 'swr';
import copy from 'copy-to-clipboard';
import {
  CheckIcon,
  CircleAlertIcon,
  CopyIcon,
  InboxIcon,
  MessageCircleIcon,
  XIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { responseMessage } from '@vibeschedule/frontend/lib/response-message';
import { whatsappUrl } from '@vibeschedule/frontend/components/clippers/clipper.guide';
import type { ClipperApplication } from '@vibeschedule/frontend/components/clippers/clipper.types';
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
  CardContent,
  CardDescription,
  CardFooter,
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

export const APPLICATIONS_KEY = '/clippers/applications';

export const useApplications = () => {
  const fetch = useFetch();
  return useSWR(APPLICATIONS_KEY, async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error();
    }
    return (await response.json()).applications as ClipperApplication[];
  });
};

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

// the one link we send to people who might clip for us
const ApplyLink: FC = () => {
  const t = useT();
  const toaster = useToaster();
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(`${window.location.origin}/clipping`), []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('applications_link_title')}</CardTitle>
        <CardDescription>{t('applications_link_text')}</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Input
          readOnly
          value={url}
          className="h-10 md:h-8"
          aria-label={t('applications_link_title')}
        />
        <Button
          variant="outline"
          className="h-10 md:h-8"
          onClick={() => {
            copy(url);
            toaster.show(t('start_copied'), 'success');
          }}
        >
          <CopyIcon data-icon="inline-start" />
          {t('copy')}
        </Button>
      </CardContent>
    </Card>
  );
};

const AcceptSheet: FC<{
  application: ClipperApplication | null;
  onClose: () => void;
  onAccepted: () => void;
}> = ({ application, onClose, onAccepted }) => {
  const t = useT();
  const id = useId();
  const fetch = useFetch();
  const toaster = useToaster();
  const [accounts, setAccounts] = useState('');
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    setAccounts(application ? String(application.accounts) : '');
    setAccepted(false);
  }, [application?.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!application) {
      return;
    }
    setSaving(true);
    const response = await fetch(
      `/clippers/applications/${application.id}/accept`,
      {
        method: 'POST',
        body: JSON.stringify({ accounts: Number(accounts) }),
      }
    );
    setSaving(false);
    if (!response.ok) {
      toaster.show(
        (await responseMessage(response)) || t('applications_failed'),
        'warning'
      );
      return;
    }
    setAccepted(true);
    onAccepted();
  };

  const message =
    application &&
    t('applications_welcome_message', {
      name: application.name.split(' ')[0],
      url:
        typeof window === 'undefined'
          ? ''
          : `${window.location.origin}/auth/login`,
      email: application.email,
    });

  return (
    <Sheet open={!!application} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        {application && (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <SheetHeader>
              <SheetTitle>
                {accepted
                  ? t('applications_accepted_title')
                  : t('applications_accept_title')}
              </SheetTitle>
              <SheetDescription>{application.name}</SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4">
              {accepted ? (
                <>
                  <p className="text-sm">{t('applications_accepted_text')}</p>
                  <Button
                    className="h-10 self-start md:h-9"
                    nativeButton={false}
                    render={
                      <a
                        href={whatsappUrl(
                          application.phone,
                          message || undefined
                        )}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <MessageCircleIcon data-icon="inline-start" />
                    {t('applications_send_whatsapp')}
                  </Button>
                  <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">
                    {message}
                  </p>
                </>
              ) : (
                <Field>
                  <FieldLabel htmlFor={`${id}-accounts`}>
                    {t('clippers_accounts')}
                  </FieldLabel>
                  <Input
                    id={`${id}-accounts`}
                    inputMode="numeric"
                    className="h-10 w-24 md:h-8"
                    value={accounts}
                    onChange={(e) => setAccounts(e.target.value)}
                  />
                  <FieldDescription>
                    {t('applications_accounts_hint', {
                      count: application.accounts,
                    })}
                  </FieldDescription>
                </Field>
              )}
            </div>
            <SheetFooter className="border-t">
              {accepted ? (
                <Button
                  key="close"
                  type="button"
                  variant="outline"
                  className="h-10 md:h-8"
                  onClick={onClose}
                >
                  {t('close')}
                </Button>
              ) : (
                <Button
                  key="accept"
                  type="submit"
                  className="h-10 md:h-8"
                  disabled={saving || !(Number(accounts) >= 1)}
                >
                  {saving ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <CheckIcon data-icon="inline-start" />
                  )}
                  {t('applications_accept')}
                </Button>
              )}
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Answer: FC<{ label: string; value: string | number | null }> = ({
  label,
  value,
}) =>
  value === null || value === '' ? null : (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm whitespace-pre-line">{value}</dd>
    </div>
  );

const ApplicationCard: FC<{
  application: ClipperApplication;
  onAccept: () => void;
  onDecline: () => void;
}> = ({ application, onAccept, onDecline }) => {
  const t = useT();
  const pending = application.status === 'PENDING';
  return (
    <Card className={pending ? undefined : 'opacity-70'}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="truncate">{application.name}</span>
          <Badge variant={pending ? 'default' : 'outline'}>
            {t(`applications_status_${application.status.toLowerCase()}`)}
          </Badge>
        </CardTitle>
        <CardDescription>
          {dateFormat.format(new Date(application.createdAt))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Answer label={t('clipping_age')} value={application.age} />
          <Answer
            label={t('clipping_device')}
            value={application.device === 'iphone' ? 'iPhone' : 'Android'}
          />
          <Answer label={t('clipping_accounts')} value={application.accounts} />
          <Answer label={t('label_email')} value={application.email} />
          <Answer label={t('clipping_phone')} value={application.phone} />
          <Answer label={t('clipping_source')} value={application.source} />
          <div className="sm:col-span-2">
            <Answer
              label={t('clipping_experience')}
              value={application.experience}
            />
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button
          variant="outline"
          className="h-10 md:h-8"
          nativeButton={false}
          render={
            <a
              href={whatsappUrl(application.phone)}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <MessageCircleIcon data-icon="inline-start" />
          WhatsApp
        </Button>
        {pending && (
          <>
            <Button className="h-10 md:h-8" onClick={onAccept}>
              <CheckIcon data-icon="inline-start" />
              {t('applications_accept')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" className="h-10 md:h-8">
                    <XIcon data-icon="inline-start" />
                    {t('applications_decline')}
                  </Button>
                }
              />
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('applications_decline_title', {
                      name: application.name,
                    })}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('applications_decline_text')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={onDecline}>
                    {t('applications_decline')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

// Applications from /clipping: accept with one click, the login exists then
export const ClipperApplications: FC<{ onAccepted: () => void }> = ({
  onAccepted,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, error, mutate } = useApplications();
  const [accepting, setAccepting] = useState<ClipperApplication | null>(null);

  const decline = async (application: ClipperApplication) => {
    const response = await fetch(
      `/clippers/applications/${application.id}/decline`,
      {
        method: 'POST',
      }
    );
    if (!response.ok) {
      toaster.show(
        (await responseMessage(response)) || t('applications_failed'),
        'warning'
      );
      return;
    }
    mutate();
  };

  const pending = data?.filter((a) => a.status === 'PENDING') || [];
  const decided = data?.filter((a) => a.status !== 'PENDING') || [];

  return (
    <div className="flex flex-col gap-4">
      <ApplyLink />
      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{t('clippers_load_failed')}</AlertTitle>
        </Alert>
      ) : !data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          {!pending.length && (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>{t('applications_empty')}</EmptyTitle>
                <EmptyDescription>
                  {t('applications_empty_hint')}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {pending.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onAccept={() => setAccepting(application)}
              onDecline={() => decline(application)}
            />
          ))}
          {!!decided.length && (
            <h2 className="pt-2 text-sm font-medium text-muted-foreground">
              {t('applications_decided')}
            </h2>
          )}
          {decided.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onAccept={() => undefined}
              onDecline={() => undefined}
            />
          ))}
        </>
      )}
      <AcceptSheet
        application={accepting}
        onClose={() => setAccepting(null)}
        onAccepted={() => {
          mutate();
          onAccepted();
        }}
      />
    </div>
  );
};
