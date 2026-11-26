'use client';

import Link from 'next/link';
import {
  ChartLineIcon,
  EllipsisVerticalIcon,
  LayersIcon,
  PlusIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
} from 'lucide-react';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import {
  ChannelResponsible,
  useResponsibleSheet,
} from '@vibeschedule/frontend/components/team/responsible';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { cn } from '@vibeschedule/frontend/lib/utils';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import {
  Button,
  buttonVariants,
} from '@vibeschedule/frontend/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@vibeschedule/frontend/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@vibeschedule/frontend/components/ui/tooltip';
import {
  OverviewChannel,
  OverviewFormat,
} from '@vibeschedule/frontend/components/formats/formats.data';
import {
  ChannelAvatar,
  formatCompact,
  formatLongDate,
  formatShortDate,
  Metric,
  StatusBadge,
} from '@vibeschedule/frontend/components/formats/formats.ui';

export const analyticsHref = (channelId: string, days: number) =>
  `/analytics?account=${encodeURIComponent(channelId)}&days=${days}`;

const FormatRow = ({
  format,
  onClick,
}: {
  format: OverviewFormat;
  onClick: () => void;
}) => {
  const t = useT();
  const { stats } = format;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg px-2 py-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 md:grid-cols-[1fr_repeat(3,4.5rem)]"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-medium',
                format.status === 'PAUSED' && 'text-muted-foreground'
              )}
            >
              {format.name}
            </span>
            <StatusBadge status={format.status} />
          </div>
          {format.note ? (
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {format.note}
            </span>
          ) : null}
        </div>
        <Metric
          value={stats.published}
          label={
            stats.scheduled
              ? t('formats_metric_posts_planned', { count: stats.scheduled })
              : t('formats_metric_posts', { count: stats.published })
          }
          className="max-md:hidden"
        />
        <Metric
          value={stats.views}
          label={t('formats_metric_views')}
          className="max-md:hidden"
        />
        <div className="flex flex-col items-end max-md:hidden">
          <span
            className="text-sm tabular-nums"
            title={
              stats.lastPostAt ? formatLongDate(stats.lastPostAt) : undefined
            }
          >
            {stats.lastPostAt ? formatShortDate(stats.lastPostAt) : '–'}
          </span>
          <span className="text-xs text-muted-foreground">
            {t('formats_metric_last_post')}
          </span>
        </div>
        {/* phone: one compact line instead of three columns */}
        <span className="text-xs text-muted-foreground tabular-nums md:hidden">
          {t('formats_metric_compact', {
            count: stats.published,
            views: stats.views != null ? formatCompact(stats.views) : '–',
          })}
        </span>
      </button>
    </li>
  );
};

export const AccountCard = ({
  channel,
  days,
  showApp,
  onAssign,
  onEditAssignment,
  onManageApp,
}: {
  channel: OverviewChannel;
  days: number;
  showApp: boolean;
  onAssign: () => void;
  onEditAssignment: (formatId: string) => void;
  onManageApp: () => void;
}) => {
  const t = useT();
  const me = useUser();
  const setResponsible = useResponsibleSheet();
  const without = channel.feed?.withoutFormat;

  return (
    <Card className={cn(channel.disabled && 'opacity-70')}>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <ChannelAvatar
            name={channel.name}
            picture={channel.picture}
            identifier={channel.identifier}
            className="size-10"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle className="flex min-w-0 items-center gap-2">
              <span className="truncate">{channel.name}</span>
              {showApp && channel.app ? (
                <Badge variant="outline">{channel.app.name}</Badge>
              ) : null}
              {channel.disabled ? (
                <Badge variant="outline" className="text-muted-foreground">
                  {t('formats_disabled')}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription className="truncate">
              {channel.platform}
              {channel.feed
                ? ` · ${t('formats_channel_summary', {
                    count: channel.feed.posts,
                    days,
                  })}${
                    channel.feed.views != null
                      ? ` · ${t('formats_channel_views', {
                          views: formatCompact(channel.feed.views),
                        })}`
                      : ''
                  }`
                : ''}
            </CardDescription>
          </div>
        </div>
        <CardAction className="flex items-center gap-1">
          <ChannelResponsible channelId={channel.id} labelled />
          <Link
            href={analyticsHref(channel.id, days)}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'h-9 max-sm:w-9 max-sm:px-0 md:h-7',
            })}
          >
            <ChartLineIcon data-icon="inline-start" />
            <span className="max-sm:sr-only">
              {t('formats_open_analytics')}
            </span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-9 md:size-7"
                  aria-label={t('formats_account_actions')}
                />
              }
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAssign}>
                <PlusIcon />
                {t('formats_assign_title')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManageApp}>
                <LayersIcon />
                {t('formats_change_app')}
              </DropdownMenuItem>
              {me?.role === 'ADMIN' && (
                <DropdownMenuItem onClick={() => setResponsible(channel)}>
                  <UsersRoundIcon />
                  {t('responsible_set')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1 px-2">
        {channel.formats.length ? (
          <ul className="flex flex-col">
            {channel.formats.map((format) => (
              <FormatRow
                key={format.formatId}
                format={format}
                onClick={() => onEditAssignment(format.formatId)}
              />
            ))}
          </ul>
        ) : (
          <button
            type="button"
            onClick={onAssign}
            className="flex flex-col items-start gap-0.5 rounded-lg border border-dashed px-3 py-3 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="text-sm font-medium">
              {t('formats_account_empty_title')}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('formats_account_empty_description')}
            </span>
          </button>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-2 border-t bg-muted/30 py-2 text-xs text-muted-foreground">
        {channel.feedError ? (
          <Tooltip>
            <TooltipTrigger
              render={<span className="flex items-center gap-1.5" />}
            >
              <TriangleAlertIcon className="size-3.5 text-warning" />
              {t('formats_feed_failed')}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {channel.feedError}
            </TooltipContent>
          </Tooltip>
        ) : without ? (
          <span className="tabular-nums">
            {t('formats_without_format', { count: without.posts })}
            {without.views != null && without.posts
              ? ` · ${t('formats_channel_views', {
                  views: formatCompact(without.views),
                })}`
              : ''}
          </span>
        ) : (
          <span />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 md:h-7"
          onClick={onAssign}
        >
          <PlusIcon data-icon="inline-start" />
          {t('formats_format')}
        </Button>
      </CardFooter>
    </Card>
  );
};
