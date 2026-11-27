'use client';

import { FC, useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  UsersIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import { CLIPPER_GUIDE_URL } from '@vibeschedule/frontend/components/clippers/clipper.guide';
import {
  ClipperApplications,
  useApplications,
} from '@vibeschedule/frontend/components/clippers/clipper.applications';
import {
  ClipperSetup,
  SETUP_KEY,
} from '@vibeschedule/frontend/components/clippers/clipper.setup';
import { ClipperOverview } from '@vibeschedule/frontend/components/clippers/clipper.overview';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vibeschedule/frontend/components/ui/tabs';
import { Alert, AlertTitle } from '@vibeschedule/frontend/components/ui/alert';
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
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vibeschedule/frontend/components/ui/table';

interface PayChannel {
  id: string;
  name: string;
  picture: string;
  identifier: string;
  state: 'active' | 'disconnected' | 'deleted';
  /** the setting, null: not paid */
  monthlyFeeCents: number | null;
  postsPerDay: number;
  activeDays: number;
  posted: number;
  due: number;
  missed: number;
  charged: number;
  penaltyCents: number;
  amountCents: number;
  running: boolean;
}

interface PayMonth {
  month: string;
  freeMissedPosts: number;
  missedPostPenaltyCents: number;
  clippers: {
    user: { id: string; name: string | null; email: string };
    /** entered by the clipper in the onboarding */
    payout: { name: string | null; iban: string | null };
    /** accounts agreed with the clipper */
    maxAccounts: number;
    /** accounts connected and not lost */
    connected: number;
    channels: PayChannel[];
    totalCents: number;
  }[];
  totalCents: number;
}

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});
const money = (cents: number) => euro.format(cents / 100);

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(
    new Date(`${month}-15T12:00:00Z`)
  );

const shiftMonth = (month: string, by: number) => {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m - 1 + by, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    '0'
  )}`;
};

// "30" or "30,50" -> cents, empty -> not paid
const parseEuro = (value: string) => {
  const clean = value.trim().replace(',', '.');
  if (!clean) {
    return null;
  }
  const number = Number(clean);
  return Number.isFinite(number) && number >= 0
    ? Math.round(number * 100)
    : undefined;
};

const PayInputs: FC<{ channel: PayChannel; onSaved: () => void }> = ({
  channel,
  onSaved,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [fee, setFee] = useState(
    channel.monthlyFeeCents === null ? '' : String(channel.monthlyFeeCents / 100).replace('.', ',')
  );
  const [perDay, setPerDay] = useState(String(channel.postsPerDay));

  useEffect(() => {
    setFee(
      channel.monthlyFeeCents === null ? '' : String(channel.monthlyFeeCents / 100).replace('.', ',')
    );
    setPerDay(String(channel.postsPerDay));
  }, [channel.monthlyFeeCents, channel.postsPerDay]);

  const save = async () => {
    const feeCents = parseEuro(fee);
    const postsPerDay = Number(perDay);
    if (
      feeCents === undefined ||
      !Number.isInteger(postsPerDay) ||
      postsPerDay < 1
    ) {
      toaster.show(t('clippers_pay_invalid'), 'warning');
      return;
    }
    if (feeCents === channel.monthlyFeeCents && postsPerDay === channel.postsPerDay) {
      return;
    }
    const response = await fetch(`/clippers/channels/${channel.id}/pay`, {
      method: 'PUT',
      body: JSON.stringify({ feeCents, postsPerDay }),
    });
    if (!response.ok) {
      toaster.show(t('clippers_pay_failed'), 'warning');
      return;
    }
    toaster.show(t('clippers_pay_saved'), 'success');
    onSaved();
  };

  return (
    <>
      <TableCell>
        <Input
          aria-label={t('clippers_fee')}
          inputMode="decimal"
          placeholder="–"
          className="w-20 text-right tabular-nums"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label={t('clippers_posts_per_day')}
          inputMode="numeric"
          className="w-14 text-right tabular-nums"
          value={perDay}
          onChange={(e) => setPerDay(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </TableCell>
    </>
  );
};

// how many accounts the clipper may connect
const AccountsInput: FC<{
  userId: string;
  value: number;
  onSaved: () => void;
}> = ({ userId, value, onSaved }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const save = async () => {
    const accounts = Number(draft);
    if (!Number.isInteger(accounts) || accounts < 0 || accounts > 20) {
      toaster.show(t('clippers_accounts_invalid'), 'warning');
      setDraft(String(value));
      return;
    }
    if (accounts === value) {
      return;
    }
    const response = await fetch(`/clippers/users/${userId}/accounts`, {
      method: 'PUT',
      body: JSON.stringify({ accounts }),
    });
    if (!response.ok) {
      toaster.show(t('clippers_pay_failed'), 'warning');
      return;
    }
    toaster.show(t('clippers_pay_saved'), 'success');
    onSaved();
  };

  return (
    <Input
      aria-label={t('clippers_accounts')}
      inputMode="numeric"
      className="h-8 w-14 text-right tabular-nums"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
};

const ClipperPay: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const [month, setMonth] = useState<string | null>(null);
  const { data, error, mutate } = useSWR(
    `/clippers/pay${month ? `?month=${month}` : ''}`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error();
      }
      return (await response.json()) as PayMonth;
    },
    { keepPreviousData: true }
  );
  const current = data?.month;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data
            ? t('clippers_description', {
                free: data.freeMissedPosts,
                penalty: money(data.missedPostPenaltyCents),
              })
            : null}
        </p>
        <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={t('clippers_previous_month')}
              disabled={!current}
              onClick={() => current && setMonth(shiftMonth(current, -1))}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="min-w-32 text-center text-sm font-medium">
              {current ? monthLabel(current) : <Skeleton className="h-5 w-full" />}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('clippers_next_month')}
              disabled={!current}
              onClick={() => current && setMonth(shiftMonth(current, 1))}
            >
              <ChevronRightIcon />
            </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{t('clippers_load_failed')}</AlertTitle>
        </Alert>
      ) : !data ? (
        <Skeleton className="h-48 w-full" />
      ) : !data.clippers.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>{t('clippers_empty')}</EmptyTitle>
            <EmptyDescription>{t('clippers_empty_hint')}</EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={CLIPPER_GUIDE_URL} target="_blank" rel="noreferrer" />}
          >
            {t('clipper_guide')}
          </Button>
        </Empty>
      ) : (
        <>
          <div className="flex items-baseline justify-between rounded-lg border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {t('clippers_total')}
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {money(data.totalCents)}
            </span>
          </div>
          {data.clippers.map((clipper) => (
            <Card key={clipper.user.id} className="gap-0 pb-0">
              <CardHeader className="border-b">
                <CardTitle className="flex items-baseline justify-between gap-3">
                  <span className="truncate">
                    {clipper.user.name || clipper.user.email}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {money(clipper.totalCents)}
                  </span>
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{clipper.user.email}</span>
                    <span className="truncate font-mono text-xs">
                      {clipper.payout.iban
                        ? `${clipper.payout.name} · ${clipper.payout.iban}`
                        : t('setup_payout_missing')}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">
                      {t('clippers_connected_of', {
                        connected: clipper.connected,
                      })}
                    </span>
                    <AccountsInput
                      userId={clipper.user.id}
                      value={clipper.maxAccounts}
                      onSaved={() => mutate()}
                    />
                    <span>{t('clippers_accounts')}</span>
                  </span>
                </CardDescription>
              </CardHeader>
              {!clipper.channels.length ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  {t('clipper_accounts_empty')}
                </p>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-4">{t('clippers_account')}</TableHead>
                    <TableHead>{t('clippers_fee')}</TableHead>
                    <TableHead>{t('clippers_posts_per_day')}</TableHead>
                    <TableHead className="text-right">{t('clippers_posted')}</TableHead>
                    <TableHead className="text-right">{t('clippers_missed')}</TableHead>
                    <TableHead className="pe-4 text-right">{t('clippers_amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clipper.channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell className="ps-4">
                        <div className="flex min-w-36 items-center gap-2">
                          <ChannelAvatar
                            picture={channel.picture}
                            identifier={channel.identifier}
                            name={channel.name}
                          />
                          <span className="truncate font-medium">{channel.name}</span>
                          {channel.state !== 'active' && (
                            <Badge variant="outline">
                              {t(`clippers_state_${channel.state}`)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <PayInputs channel={channel} onSaved={() => mutate()} />
                      <TableCell className="text-right tabular-nums">
                        {channel.posted}
                        {channel.due > 0 && (
                          <span className="text-muted-foreground"> / {channel.due}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {channel.missed}
                        {channel.charged > 0 && (
                          <span className="block text-xs text-destructive">
                            −{money(channel.penaltyCents)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="pe-4 text-right font-medium tabular-nums">
                        {channel.monthlyFeeCents === null ? (
                          <span className="text-muted-foreground">{t('clippers_no_fee')}</span>
                        ) : (
                          money(channel.amountCents)
                        )}
                        {channel.running && channel.monthlyFeeCents !== null && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {t('clippers_running')}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

type Tab = 'overview' | 'applications' | 'setup' | 'pay';
const TABS: Tab[] = ['overview', 'applications', 'setup', 'pay'];

// Clippers for admins: what every clipper and we still have to do today,
// applications from /clipping, the accounts we hand out and their warm-up,
// and the pay per account and month
export const ClippersPage = () => {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.find((value) => value === params.get('tab')) || 'overview';
  const { data: applications } = useApplications();
  const { mutate } = useSWRConfig();
  const pending = applications?.filter((a) => a.status === 'PENDING').length;
  const setTab = (value: Tab) =>
    router.replace(value === 'overview' ? '/clippers' : `/clippers?tab=${value}`);

  return (
    <PageBody className="max-w-5xl">
      <PageHeader title={t('clippers')} description={t('clippers_page_description')} />
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="w-full sm:w-fit group-data-horizontal/tabs:h-10 sm:group-data-horizontal/tabs:h-8">
          <TabsTrigger value="overview">{t('clippers_tab_overview')}</TabsTrigger>
          <TabsTrigger value="applications">
            {t('clippers_tab_applications')}
            {!!pending && (
              <Badge className="h-5 min-w-5 px-1.5 tabular-nums">{pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="setup">{t('clippers_tab_setup')}</TabsTrigger>
          <TabsTrigger value="pay">{t('clippers_tab_pay')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-2">
          <ClipperOverview onOpenApplications={() => setTab('applications')} />
        </TabsContent>
        <TabsContent value="applications" className="pt-2">
          <ClipperApplications onAccepted={() => mutate(SETUP_KEY)} />
        </TabsContent>
        <TabsContent value="setup" className="pt-2">
          <ClipperSetup />
        </TabsContent>
        <TabsContent value="pay" className="pt-2">
          <ClipperPay />
        </TabsContent>
      </Tabs>
    </PageBody>
  );
};
