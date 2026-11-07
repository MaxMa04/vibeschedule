import { FC, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { ChartSocial } from '@vibeschedule/frontend/components/analytics/chart-social';
import { LoadingComponent } from '@vibeschedule/frontend/components/layout/loading';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

interface AnalyticsDataItem {
  label: string;
  data: Array<{ total: number; date: string }>;
  average?: boolean;
  percentageChange?: number;
}

const TrendIndicator: FC<{ value: number; average?: boolean }> = ({
  value,
  average,
}) => {
  if (value === 0) return null;

  const isPositive = value > 0;
  const displayValue = Math.abs(value).toFixed(1).replace('.', ',');

  return (
    <div
      className={`flex items-center gap-[4px] text-[13px] font-medium ${
        isPositive ? 'text-teal' : 'text-error'
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className={isPositive ? '' : 'rotate-180'}
      >
        <path d="M6 2.5L10 7.5H2L6 2.5Z" fill="currentColor" />
      </svg>
      <span>
        {displayValue}
        {average ? ' pp' : ' %'}
      </span>
    </div>
  );
};

const AnalyticsCard: FC<{
  item: AnalyticsDataItem;
  total: string | number;
  index: number;
}> = ({ item, total, index }) => {
  const colorVariants = ['coral', 'teal', 'amber'] as const;
  const color = colorVariants[index % colorVariants.length];

  const hasDataPoints = item.data.length >= 1;

  return (
    <div className="group relative">
      <div
        className={`
          flex flex-col h-full
          bg-newTableHeader
          border border-newTableBorder
          rounded-[20px]
          overflow-hidden
        `}
      >
        <div className="flex items-center justify-between px-[16px] pt-[14px] pb-[8px]">
          <div className="flex items-center gap-[10px]">
            <div
              className={`
                w-[8px] h-[8px] rounded-full
                ${color === 'coral' ? 'bg-coral' : ''}
                ${color === 'teal' ? 'bg-teal' : ''}
                ${color === 'amber' ? 'bg-amber' : ''}
              `}
            />
            <span className="text-[15px] font-medium text-newTableText">
              {item.label}
            </span>
          </div>
          {item.percentageChange !== undefined && (
            <TrendIndicator
              value={item.percentageChange}
              average={item.average}
            />
          )}
        </div>

        {hasDataPoints ? (
          <>
            <div className="flex-1 px-[12px] py-[8px]">
              <div className="h-[120px] relative">
                <ChartSocial
                  data={item.data}
                  color={color}
                  key={`chart-${index}`}
                />
              </div>
            </div>

            <div className="px-[16px] pb-[14px]">
              <div className="text-[36px] leading-[42px] font-display font-bold tracking-tight">
                {total}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-[32px] px-[16px]">
            <div className="text-[48px] leading-[56px] font-display font-bold tracking-tight">
              {total}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState: FC = () => {
  const t = useT();

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-[48px] px-[24px] bg-newTableHeader border border-newTableBorder rounded-[20px] text-[15px] text-newTableText text-center">
      {t('no_analytics_for_this_period')}
    </div>
  );
};

// AnalyticsData[] of GET /analytics/:integration or /analytics/post/:postId
export const RenderAnalytics: FC<{ url: string }> = ({ url }) => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    return (await fetch(url)).json();
  }, [url]);

  const { data, isLoading: loading } = useSWR(url, load, {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    revalidateOnMount: true,
  });

  const totals = useMemo(() => {
    return data?.map((p: AnalyticsDataItem) => {
      const value =
        (p?.data.reduce(
          (acc: number, curr: { total: number }) => acc + curr.total,
          0
        ) || 0) / (p.average ? p.data.length : 1);
      if (p.average) {
        return value.toFixed(2).replace('.', ',') + ' %';
      }
      return new Intl.NumberFormat('de-DE').format(Math.round(value));
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-[48px]">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
      {data?.length === 0 && <EmptyState />}
      {data?.map((item: AnalyticsDataItem, index: number) => (
        <AnalyticsCard
          key={`analytics-${index}`}
          item={item}
          total={totals[index]}
          index={index}
        />
      ))}
    </div>
  );
};
