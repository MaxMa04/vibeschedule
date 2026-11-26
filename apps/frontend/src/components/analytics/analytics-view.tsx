'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCwIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import { Button } from '@vibeschedule/frontend/components/ui/button';
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
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { ChannelAvatar } from '@vibeschedule/frontend/components/analytics/bits';
import {
  PERIODS,
  useAccount,
  useApps,
  useChannels,
  useOverview,
} from '@vibeschedule/frontend/components/analytics/use-analytics';
import { OverviewSection } from '@vibeschedule/frontend/components/analytics/overview-section';
import { AccountSection } from '@vibeschedule/frontend/components/analytics/account-section';

const ALL = '__all';
const NO_APP = 'none';

export function AnalyticsView() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const account = params.get('account');
  const app = params.get('app');
  const daysParam = Number(params.get('days'));
  const days = (PERIODS as readonly number[]).includes(daysParam)
    ? daysParam
    : 7;

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const query = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null) query.delete(key);
        else query.set(key, value);
      }
      const qs = query.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );

  const channels = useChannels();
  const apps = useApps();
  const overview = useOverview(days, account ? null : app);
  const detail = useAccount(account, days);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await (account ? detail.refresh() : overview.refresh());
    } finally {
      setRefreshing(false);
    }
  };

  const channelItems = [
    { value: ALL, label: t('analytics_all_channels') },
    ...(channels.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ...(account && !channels.data?.some((c) => c.id === account)
      ? [
          {
            value: account,
            label:
              detail.data?.channel.id === account
                ? detail.data.channel.name
                : channels.data
                ? t('analytics_unknown_channel')
                : t('analytics_loading'),
          },
        ]
      : []),
  ];
  const appItems = [
    { value: ALL, label: t('analytics_all_apps') },
    ...(apps.data ?? []).map((a) => ({ value: a.id, label: a.name })),
    { value: NO_APP, label: t('analytics_without_app') },
  ];

  return (
    <PageBody>
      <PageHeader
        title={t('analytics')}
        description={t('analytics_description')}
        actions={
          <>
            <Select
              value={account ?? ALL}
              items={channelItems}
              onValueChange={(v) =>
                setParams({ account: !v || v === ALL ? null : String(v) })
              }
            >
              <SelectTrigger
                className="h-10 w-full min-w-44 sm:w-auto md:h-8"
                aria-label={t('analytics_channel')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL}>{t('analytics_all_channels')}</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  {(channels.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <ChannelAvatar
                        name={c.name}
                        picture={c.picture}
                        identifier={c.identifier}
                        size="sm"
                      />
                      <span className="truncate">{c.name}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {!account ? (
              <Select
                value={app ?? ALL}
                items={appItems}
                onValueChange={(v) =>
                  setParams({ app: !v || v === ALL ? null : String(v) })
                }
              >
                <SelectTrigger
                  className="h-10 w-full min-w-36 sm:w-auto md:h-8"
                  aria-label={t('analytics_app')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {appItems.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <ToggleGroup
              value={[String(days)]}
              onValueChange={(v) =>
                v.length &&
                setParams({ days: v[0] === '7' ? null : String(v[0]) })
              }
              variant="outline"
              size="sm"
              spacing={0}
              aria-label={t('analytics_period')}
            >
              {PERIODS.map((d) => (
                <ToggleGroupItem
                  key={d}
                  value={String(d)}
                  className="h-10 px-3 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground md:h-8"
                >
                  {t('analytics_days_short', { days: d })}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <Button
              variant="outline"
              size="icon"
              className="size-10 md:size-8"
              onClick={refresh}
              disabled={refreshing}
              aria-label={t('analytics_refresh')}
              title={t('analytics_refresh')}
            >
              {refreshing ? <Spinner /> : <RefreshCwIcon />}
            </Button>
          </>
        }
      />

      {account ? (
        <AccountSection
          key={account}
          id={account}
          days={days}
          state={detail}
          onBack={() => setParams({ account: null })}
          onDays={(d) => setParams({ days: d === 7 ? null : String(d) })}
        />
      ) : (
        <OverviewSection
          days={days}
          app={app}
          state={overview}
          onOpen={(id) => setParams({ account: id })}
        />
      )}
    </PageBody>
  );
}
