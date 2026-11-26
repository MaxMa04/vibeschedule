'use client';

import { useState } from 'react';
import { ArrowLeftIcon, BarChart3Icon } from 'lucide-react';
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@vibeschedule/frontend/components/ui/toggle-group';
import {
  ChannelAvatar,
  DeltaBadge,
  KpiCard,
} from '@vibeschedule/frontend/components/analytics/bits';
import {
  DailyAreaChart,
  PostsBarChart,
} from '@vibeschedule/frontend/components/analytics/charts';
import {
  formatCount,
  formatInt,
  formatRate,
} from '@vibeschedule/frontend/components/analytics/format';
import { PostsCard } from '@vibeschedule/frontend/components/analytics/posts-card';
import {
  ErrorState,
  OverviewSkeleton,
} from '@vibeschedule/frontend/components/analytics/overview-section';
import {
  PERIODS,
  type AccountState,
} from '@vibeschedule/frontend/components/analytics/use-analytics';
import { cn } from '@vibeschedule/frontend/lib/utils';
import { ChannelResponsible } from '@vibeschedule/frontend/components/team/responsible';

export function AccountSection({
  id,
  days,
  state,
  onBack,
  onDays,
}: {
  id: string;
  days: number;
  state: AccountState;
  onBack: () => void;
  onDays: (days: number) => void;
}) {
  const t = useT();
  const { data, error, isLoading, mutate } = state;
  const [metric, setMetric] = useState<string | null>(null);

  const back = (
    <Button variant="ghost" className="h-10 self-start md:h-8" onClick={onBack}>
      <ArrowLeftIcon data-icon="inline-start" />
      {t('analytics_all_channels')}
    </Button>
  );

  if (error && !data) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <ErrorState
          message={error.message}
          onRetry={() => mutate()}
        />
      </div>
    );
  }
  // never show the numbers of the previously selected channel
  if (!data || data.channel.id !== id) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <OverviewSkeleton rows={6} />
      </div>
    );
  }

  const { current, previous, change, metrics, primary } = data;
  const primaryMetric = metrics.find((m) => m.key === primary);
  const label = primaryMetric?.label || t('analytics_views');
  const chartMetric = metrics.find((m) => m.key === metric) || primaryMetric;
  const prevHint = t('analytics_vs_previous', { days });
  const interactions = metrics.filter((m) => !m.reach);
  const longest = PERIODS[PERIODS.length - 1];
  const longer = days < longest ? longest : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 transition-opacity',
        isLoading && 'pointer-events-none opacity-60'
      )}
      aria-busy={isLoading}
    >
      <div className="flex flex-wrap items-center gap-3">
        {back}
        <div className="flex min-w-0 items-center gap-3">
          <ChannelAvatar
            name={data.channel.name}
            picture={data.channel.picture}
            identifier={data.channel.identifier}
            size="lg"
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-heading text-base font-semibold">
              {data.channel.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t('analytics_range', {
                from: dayLabel(current.from),
                to: dayLabel(current.to),
              })}
            </span>
          </div>
          {data.channel.app ? (
            <Badge variant="secondary">{data.channel.app.name}</Badge>
          ) : null}
          {data.channel.disabled ? (
            <Badge variant="outline">{t('analytics_disabled')}</Badge>
          ) : null}
          <ChannelResponsible channelId={data.channel.id} labelled />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={label}
          value={formatCount(primary ? current.metrics[primary] : null)}
          delta={
            <DeltaBadge value={primary ? change[primary] : null} hint={prevHint} />
          }
          footer={t('analytics_previous_value', {
            value: formatCount(primary ? previous.metrics[primary] : null),
          })}
        />
        <KpiCard
          label={t('analytics_posts')}
          value={formatInt(current.posts)}
          delta={<DeltaBadge value={change.posts} hint={prevHint} />}
          footer={t('analytics_previous_value', {
            value: formatInt(previous.posts),
          })}
        />
        <KpiCard
          label={t('analytics_avg_per_post', { label })}
          value={formatCount(current.avgPerPost)}
          delta={<DeltaBadge value={change.avgPerPost} hint={prevHint} />}
          footer={t('analytics_previous_value', {
            value: formatCount(previous.avgPerPost),
          })}
        />
        <KpiCard
          label={t('analytics_engagement')}
          value={formatRate(current.engagementRate)}
          delta={
            <DeltaBadge
              value={
                current.engagementRate !== null && previous.engagementRate !== null
                  ? (current.engagementRate - previous.engagementRate) * 100
                  : null
              }
              unit="pp"
              hint={prevHint}
            />
          }
          footer={
            interactions.length
              ? interactions
                  .map((m) => `${formatCount(current.metrics[m.key])} ${m.label}`)
                  .join(' · ')
              : null
          }
        />
      </div>

      {current.posts === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3Icon />
            </EmptyMedia>
            <EmptyTitle>{t('analytics_no_posts_title')}</EmptyTitle>
            <EmptyDescription>
              {t('analytics_no_posts_in_days', { days })}
            </EmptyDescription>
          </EmptyHeader>
          {longer ? (
            <EmptyContent>
              <Button
                variant="outline"
                className="h-10 md:h-8"
                onClick={() => onDays(longer)}
              >
                {t('analytics_show_days', { days: longer })}
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="min-w-0 lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {t('analytics_by_publish_day', {
                    label: chartMetric?.label || label,
                  })}
                </CardTitle>
                <CardDescription>
                  {t('analytics_by_publish_day_hint', {
                    label: chartMetric?.label || label,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.length > 1 ? (
                  <div className="-mx-1 mb-3 max-w-full overflow-x-auto px-1">
                    <ToggleGroup
                      value={[chartMetric?.key || '']}
                      onValueChange={(v) => v.length && setMetric(String(v[0]))}
                      variant="outline"
                      size="sm"
                      spacing={0}
                      aria-label={t('analytics_metric')}
                    >
                      {metrics.map((m) => (
                        <ToggleGroupItem
                          key={m.key}
                          value={m.key}
                          className="h-10 px-2.5 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground md:h-7"
                        >
                          {m.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                ) : null}
                {chartMetric ? (
                  <DailyAreaChart
                    data={data.series}
                    dataKey={chartMetric.key}
                    label={chartMetric.label}
                    postsLabel={t('analytics_posts')}
                  />
                ) : null}
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>{t('analytics_posts_per_day')}</CardTitle>
                <CardDescription>{t('analytics_posts_per_day_hint')}</CardDescription>
              </CardHeader>
              <CardContent>
                <PostsBarChart data={data.series} label={t('analytics_posts')} />
              </CardContent>
            </Card>
          </div>

          <PostsCard posts={data.posts} metrics={metrics} primary={primary} />
        </>
      )}
    </div>
  );
}

const dayLabel = (date: string) => date.split('-').reverse().join('.');
