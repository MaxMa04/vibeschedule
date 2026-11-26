'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@vibeschedule/frontend/components/ui/chart';
import {
  formatCount,
  formatDay,
  formatDayLong,
  formatInt,
} from '@vibeschedule/frontend/components/analytics/format';
import { cn } from '@vibeschedule/frontend/lib/utils';

// Small trend line with a fixed size, so it never measures inside a table cell
export function Sparkline({
  data,
  label,
  className,
  width = 112,
  height = 32,
}: {
  data: Array<{ date: string; value: number }>;
  label?: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2 || data.every((d) => !d.value)) {
    return (
      <span
        className={cn('block text-xs text-muted-foreground', className)}
        style={{ width }}
      >
        –
      </span>
    );
  }
  return (
    <div
      className={cn('shrink-0 text-primary', className)}
      style={{ width, height }}
      role="img"
      aria-label={label}
    >
      <LineChart
        width={width}
        height={height}
        data={data}
        margin={{ top: 3, right: 3, bottom: 3, left: 3 }}
      >
        <YAxis hide domain={[0, 'dataMax']} />
        <Line
          dataKey="value"
          type="monotone"
          stroke="currentColor"
          strokeWidth={1.75}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}

// one value per publishing day as a filled area
export function DailyAreaChart({
  data,
  dataKey,
  label,
  postsLabel,
  className,
}: {
  data: Array<Record<string, number | string>>;
  dataKey: string;
  label: string;
  postsLabel: string;
  className?: string;
}) {
  const config = {
    [dataKey]: { label, color: 'var(--primary)' },
  } satisfies ChartConfig;
  const fillId = `fill-${dataKey}`;
  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto h-56 w-full md:h-64', className)}
      initialDimension={{ width: 640, height: 256 }}
    >
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.2} />
            <stop offset="100%" stopColor={`var(--color-${dataKey})`} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          width={48}
          tickFormatter={(v: number) => formatCount(v)}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                formatDayLong(String(payload?.[0]?.payload?.date ?? ''))
              }
              formatter={(value, _name, item) => (
                <TooltipRow
                  label={label}
                  value={formatInt(Number(value))}
                  posts={Number(item.payload?.posts ?? 0)}
                  postsLabel={postsLabel}
                />
              )}
            />
          }
        />
        <Area
          dataKey={dataKey}
          type="monotone"
          stroke={`var(--color-${dataKey})`}
          strokeWidth={2}
          fill={`url(#${fillId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function TooltipRow({
  label,
  value,
  posts,
  postsLabel,
}: {
  label: string;
  value: string;
  posts?: number;
  postsLabel?: string;
}) {
  return (
    <span className="flex w-full flex-col gap-0.5">
      <span className="flex w-full justify-between gap-3">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </span>
      {postsLabel && posts !== undefined ? (
        <span className="flex w-full justify-between gap-3">
          <span className="text-muted-foreground">{postsLabel}</span>
          <span className="font-medium tabular-nums">{posts}</span>
        </span>
      ) : null}
    </span>
  );
}

// posts per publishing day
export function PostsBarChart({
  data,
  label,
  className,
}: {
  data: Array<{ date: string; posts: number }>;
  label: string;
  className?: string;
}) {
  const config = {
    posts: { label, color: 'var(--color-chart-2)' },
  } satisfies ChartConfig;
  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto h-56 w-full md:h-64', className)}
      initialDimension={{ width: 320, height: 256 }}
    >
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          width={28}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                formatDayLong(String(payload?.[0]?.payload?.date ?? ''))
              }
              formatter={(value) => (
                <TooltipRow label={label} value={formatInt(Number(value))} />
              )}
            />
          }
        />
        <Bar
          dataKey="posts"
          fill="var(--color-posts)"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}

// horizontal bars, one per metric (lifetime values of a single post)
export function MetricBarChart({
  data,
  className,
}: {
  data: Array<{ label: string; value: number }>;
  className?: string;
}) {
  const config = {
    value: { color: 'var(--primary)' },
  } satisfies ChartConfig;
  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto w-full', className)}
      style={{ height: Math.max(120, data.length * 44) }}
      initialDimension={{ width: 480, height: Math.max(120, data.length * 44) }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="label"
          width={96}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => (
                <TooltipRow
                  label={String(item.payload?.label ?? '')}
                  value={formatInt(Number(value))}
                />
              )}
            />
          }
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={4}
          maxBarSize={28}
          isAnimationActive={false}
          label={{
            position: 'right',
            className: 'fill-foreground text-xs tabular-nums',
            formatter: (v: unknown) => formatCount(Number(v)),
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}
