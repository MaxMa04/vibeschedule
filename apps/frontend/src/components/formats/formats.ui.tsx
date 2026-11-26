'use client';

import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { cn } from '@vibeschedule/frontend/lib/utils';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@vibeschedule/frontend/components/ui/avatar';
import { FormatStatus } from '@vibeschedule/frontend/components/formats/formats.data';

export const statusLabelKey: Record<FormatStatus, string> = {
  ACTIVE: 'formats_status_active',
  TESTING: 'formats_status_testing',
  PAUSED: 'formats_status_paused',
};

const statusDot: Record<FormatStatus, string> = {
  ACTIVE: 'bg-primary',
  TESTING: 'bg-warning',
  PAUSED: 'bg-muted-foreground/40',
};

export const StatusBadge = ({
  status,
  className,
}: {
  status: FormatStatus | null;
  className?: string;
}) => {
  const t = useT();
  if (!status) {
    return (
      <Badge
        variant="outline"
        className={cn('border-dashed text-muted-foreground', className)}
      >
        {t('formats_status_unassigned')}
      </Badge>
    );
  }
  return (
    <Badge
      variant={status === 'ACTIVE' ? 'secondary' : 'outline'}
      className={cn(status === 'PAUSED' && 'text-muted-foreground', className)}
    >
      <span className={cn('size-1.5 rounded-full', statusDot[status])} />
      {t(statusLabelKey[status])}
    </Badge>
  );
};

export const ChannelAvatar = ({
  name,
  picture,
  identifier,
  className,
}: {
  name: string;
  picture: string | null;
  identifier: string;
  className?: string;
}) => (
  <Avatar className={className}>
    {picture ? <AvatarImage src={picture} alt="" /> : null}
    <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
    <AvatarBadge className="bg-background p-px">
      <img
        src={`/icons/platforms/${identifier}.png`}
        alt=""
        className="size-full rounded-full"
      />
    </AvatarBadge>
  </Avatar>
);

const oneDecimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const full = new Intl.NumberFormat('de-DE');
const shortDate = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'short',
});
const longDate = new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' });

// German compact notation leaves thousands unabbreviated, so do it by hand
export const formatCompact = (value: number) =>
  value >= 1_000_000
    ? `${oneDecimal.format(value / 1_000_000)} Mio.`
    : value >= 10_000
    ? `${oneDecimal.format(
        value >= 100_000 ? Math.round(value / 1000) : value / 1000
      )} Tsd.`
    : full.format(value);
export const formatFull = (value: number) => full.format(value);
export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));
export const formatLongDate = (iso: string) => longDate.format(new Date(iso));

/** A number with its label, `–` when the platform has no such metric */
export const Metric = ({
  value,
  label,
  className,
}: {
  value: number | null | undefined;
  label: string;
  className?: string;
}) => (
  <div className={cn('flex flex-col items-end', className)}>
    <span
      className="text-sm font-medium tabular-nums"
      title={value != null ? formatFull(value) : undefined}
    >
      {value != null ? formatCompact(value) : '–'}
    </span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);
