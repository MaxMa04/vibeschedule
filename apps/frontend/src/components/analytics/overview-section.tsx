'use client';

import { CircleAlertIcon, UsersIcon } from 'lucide-react';
import type { OverviewChannel } from '@vibeschedule/helpers/utils/analytics.types';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vibeschedule/frontend/components/ui/table';
import {
  ChannelAvatar,
  DeltaBadge,
  KpiCard,
} from '@vibeschedule/frontend/components/analytics/bits';
import {
  DailyAreaChart,
  PostsBarChart,
  Sparkline,
} from '@vibeschedule/frontend/components/analytics/charts';
import {
  formatCount,
  formatInt,
  formatRate,
  percentChange,
} from '@vibeschedule/frontend/components/analytics/format';
import {
  engagementByLabel,
  type OverviewState,
} from '@vibeschedule/frontend/components/analytics/use-analytics';
import { cn } from '@vibeschedule/frontend/lib/utils';

export function OverviewSection({
  days,
  filtered,
  state,
  onOpen,
}: {
  days: number;
  filtered: boolean;
  state: OverviewState;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const { data, error, isLoading, mutate } = state;

  if (error && !data) {
    return <ErrorState message={error.message} onRetry={() => mutate()} />;
  }
  if (!data) {
    return <OverviewSkeleton />;
  }
  if (!data.channels.length) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>{t('analytics_no_channels_title')}</EmptyTitle>
          <EmptyDescription>
            {filtered
              ? t('analytics_no_channels_filtered')
              : t('analytics_no_channels_description')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const { summary } = data;
  const label = summary.primaryLabel || t('analytics_views');
  const views = summary.primaryLabel
    ? summary.current.metrics[summary.primaryLabel] ?? 0
    : null;
  const prevViews = summary.primaryLabel
    ? summary.previous.metrics[summary.primaryLabel] ?? 0
    : null;
  const avg =
    views !== null && summary.current.posts
      ? views / summary.current.posts
      : null;
  const prevAvg =
    prevViews !== null && summary.previous.posts
      ? prevViews / summary.previous.posts
      : null;
  const rate = engagementByLabel(summary.current.metrics, summary.primaryLabel);
  const prevRate = engagementByLabel(
    summary.previous.metrics,
    summary.primaryLabel
  );
  const prevHint = t('analytics_vs_previous', { days });
  const interactions = Object.entries(summary.current.metrics).filter(
    ([l]) => l !== summary.primaryLabel
  );

  const channels = [...data.channels].sort(
    (a, b) => primaryValue(b) - primaryValue(a)
  );
  // a stale range stays visible while the next one loads
  const stale = isLoading;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 transition-opacity',
        stale && 'pointer-events-none opacity-60'
      )}
      aria-busy={stale}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={label}
          value={formatCount(views)}
          delta={<DeltaBadge value={percentChange(views, prevViews)} hint={prevHint} />}
          footer={t('analytics_previous_value', {
            value: formatCount(prevViews),
          })}
        />
        <KpiCard
          label={t('analytics_posts')}
          value={formatInt(summary.current.posts)}
          delta={
            <DeltaBadge
              value={percentChange(summary.current.posts, summary.previous.posts)}
              hint={prevHint}
            />
          }
          footer={t('analytics_previous_value', {
            value: formatInt(summary.previous.posts),
          })}
        />
        <KpiCard
          label={t('analytics_avg_per_post', { label })}
          value={formatCount(avg)}
          delta={<DeltaBadge value={percentChange(avg, prevAvg)} hint={prevHint} />}
          footer={t('analytics_previous_value', { value: formatCount(prevAvg) })}
        />
        <KpiCard
          label={t('analytics_engagement')}
          value={formatRate(rate)}
          delta={
            <DeltaBadge
              value={rate !== null && prevRate !== null ? (rate - prevRate) * 100 : null}
              unit="pp"
              hint={prevHint}
            />
          }
          footer={
            interactions.length
              ? interactions
                  .map(([l, v]) => `${formatCount(v)} ${l}`)
                  .join(' · ')
              : null
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('analytics_by_publish_day', { label })}</CardTitle>
            <CardDescription>{t('analytics_by_publish_day_hint', { label })}</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyAreaChart
              data={summary.series}
              dataKey="value"
              label={label}
              postsLabel={t('analytics_posts')}
            />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>{t('analytics_posts_per_day')}</CardTitle>
            <CardDescription>{t('analytics_posts_per_day_hint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <PostsBarChart data={summary.series} label={t('analytics_posts')} />
          </CardContent>
        </Card>
      </div>

      <Card className="@container">
        <CardHeader>
          <CardTitle>{t('analytics_channels')}</CardTitle>
          <CardDescription>{t('analytics_channels_hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y rounded-lg border @3xl:hidden">
            {channels.map((c) => (
              <li key={c.channel.id}>
                <button
                  type="button"
                  onClick={() => onOpen(c.channel.id)}
                  className="flex w-full items-center gap-3 p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ChannelAvatar
                    name={c.channel.name}
                    picture={c.channel.picture}
                    identifier={c.channel.identifier}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {c.channel.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {c.error
                        ? t('analytics_channel_error')
                        : t('analytics_posts_count', { count: c.current.posts })}
                      {c.channel.app ? ` · ${c.channel.app.name}` : ''}
                    </span>
                  </span>
                  <Sparkline data={c.series} width={64} height={28} />
                  <span className="flex w-16 shrink-0 flex-col items-end gap-0.5">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCount(primaryValue(c))}
                    </span>
                    <DeltaBadge value={c.primary ? c.change[c.primary] : null} />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-lg border @3xl:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('analytics_channel')}</TableHead>
                  <TableHead className="text-right">{t('analytics_posts')}</TableHead>
                  <TableHead className="text-right">{label}</TableHead>
                  <TableHead>{t('analytics_change')}</TableHead>
                  <TableHead className="text-right">
                    {t('analytics_avg_per_post', { label })}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('analytics_engagement')}
                  </TableHead>
                  <TableHead>{t('analytics_trend')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((c) => (
                  <TableRow
                    key={c.channel.id}
                    className="cursor-pointer"
                    onClick={() => onOpen(c.channel.id)}
                  >
                    <TableCell className="max-w-0 w-[32%]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(c.channel.id);
                        }}
                        className="flex w-full min-w-0 items-center gap-3 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <ChannelAvatar
                          name={c.channel.name}
                          picture={c.channel.picture}
                          identifier={c.channel.identifier}
                        />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-medium">
                            {c.channel.name}
                          </span>
                          {c.error ? (
                            <span className="flex items-center gap-1 truncate text-xs text-destructive">
                              <CircleAlertIcon className="size-3" />
                              {t('analytics_channel_error')}
                            </span>
                          ) : c.channel.app ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {c.channel.app.name}
                            </span>
                          ) : null}
                        </span>
                        {c.channel.disabled ? (
                          <Badge variant="outline">{t('analytics_disabled')}</Badge>
                        ) : null}
                      </button>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInt(c.current.posts)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatInt(primaryValue(c))}
                    </TableCell>
                    <TableCell>
                      <DeltaBadge
                        value={c.primary ? c.change[c.primary] : null}
                        hint={prevHint}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(c.current.avgPerPost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(c.current.engagementRate)}
                    </TableCell>
                    <TableCell>
                      <Sparkline data={c.series} label={label} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const primaryValue = (c: OverviewChannel) =>
  c.primary ? c.current.metrics[c.primary] ?? 0 : 0;

export function ErrorState({
  message,
  onRetry,
  action,
}: {
  message: string;
  onRetry: () => void;
  action?: React.ReactNode;
}) {
  const t = useT();
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>{t('analytics_error_title')}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button className="h-10 md:h-8" onClick={onRetry}>
          {t('analytics_retry')}
        </Button>
        {action}
      </EmptyContent>
    </Empty>
  );
}

export function OverviewSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiCard key={i} label="" value="" loading footer=" " />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
