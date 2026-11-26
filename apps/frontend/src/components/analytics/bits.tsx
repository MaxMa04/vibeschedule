'use client';

import { useState, type ReactNode } from 'react';
import {
  ImageIcon,
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@vibeschedule/frontend/components/ui/avatar';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@vibeschedule/frontend/components/ui/tooltip';
import { cn } from '@vibeschedule/frontend/lib/utils';

const oneFmt = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

// change vs the previous period; `unit` "pp" for differences of rates
export function DeltaBadge({
  value,
  unit = '%',
  hint,
  className,
}: {
  value: number | null;
  unit?: '%' | 'pp';
  hint?: string;
  className?: string;
}) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value * 10) / 10;
  const Icon =
    rounded > 0 ? TrendingUpIcon : rounded < 0 ? TrendingDownIcon : MinusIcon;
  const badge = (
    <Badge
      variant={rounded < 0 ? 'destructive' : rounded > 0 ? 'secondary' : 'outline'}
      className={cn('tabular-nums', className)}
    >
      <Icon data-icon="inline-start" aria-hidden />
      {oneFmt.format(rounded)}
      {unit === 'pp' ? ' pp' : ' %'}
    </Badge>
  );
  if (!hint) return badge;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {badge}
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  footer,
  loading,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardDescription className="truncate">{label}</CardDescription>
        <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {loading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </span>
          )}
          {!loading && delta}
        </CardTitle>
      </CardHeader>
      {footer ? (
        <CardContent className="text-xs text-muted-foreground">
          {loading ? <Skeleton className="h-3 w-28" /> : footer}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function ChannelAvatar({
  name,
  picture,
  identifier,
  size = 'default',
  className,
}: {
  name: string;
  picture: string | null;
  identifier: string;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <Avatar size={size}>
        {picture ? <AvatarImage src={picture} alt="" /> : null}
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <img
        src={`/icons/platforms/${identifier}.png`}
        alt={identifier}
        className="absolute -right-1 -bottom-1 size-4 rounded-full ring-2 ring-background"
      />
    </span>
  );
}

// cover of a feed post; TikTok links expire, so a broken image falls back
export function PostThumb({
  src,
  className,
}: {
  src: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={cn(
        'relative block aspect-[9/16] shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10',
        className
      )}
    >
      {src && !broken ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground">
          <ImageIcon className="size-4" />
        </span>
      )}
    </span>
  );
}
