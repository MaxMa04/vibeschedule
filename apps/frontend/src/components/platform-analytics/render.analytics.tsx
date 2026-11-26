'use client';

import { FC } from 'react';
import useSWR from 'swr';
import { BarChart3Icon, CircleAlertIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Card, CardContent } from '@vibeschedule/frontend/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import { KpiCard } from '@vibeschedule/frontend/components/analytics/bits';
import {
  MetricBarChart,
  Sparkline,
} from '@vibeschedule/frontend/components/analytics/charts';
import { formatInt } from '@vibeschedule/frontend/components/analytics/format';

interface AnalyticsDataItem {
  label: string;
  data: Array<{ total: string | number; date: string }>;
  percentageChange?: number;
}

// AnalyticsData[] of GET /analytics/:integration or /analytics/post/:postId
export const RenderAnalytics: FC<{ url: string }> = ({ url }) => {
  const fetch = useFetch();
  const t = useT();
  const { data, error, isLoading, mutate } = useSWR<AnalyticsDataItem[]>(
    url,
    async (path: string) => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  if (error) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>{t('analytics_error_title')}</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className="h-10 md:h-8" onClick={() => mutate()}>
            {t('analytics_retry')}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiCard key={i} label="" value="" loading />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3Icon />
          </EmptyMedia>
          <EmptyTitle>{t('analytics_no_data_title')}</EmptyTitle>
          <EmptyDescription>{t('no_analytics_for_this_period')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const items = data.map((item) => ({
    label: item.label,
    total: item.data.reduce((sum, d) => sum + (Number(d.total) || 0), 0),
    series: item.data.map((d) => ({ date: d.date, value: Number(d.total) || 0 })),
  }));
  const timeline = items.some((i) => i.series.length > 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <KpiCard
            key={item.label}
            label={item.label}
            value={formatInt(item.total)}
            footer={
              timeline ? (
                <Sparkline data={item.series} label={item.label} width={160} />
              ) : undefined
            }
          />
        ))}
      </div>
      {!timeline && items.length > 1 ? (
        <Card>
          <CardContent>
            <MetricBarChart
              data={items.map((i) => ({ label: i.label, value: i.total }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
