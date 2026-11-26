'use client';

import Link from 'next/link';
import { ChartLineIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
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
  Format,
  OverviewChannel,
  OverviewFormat,
} from '@vibeschedule/frontend/components/formats/formats.data';
import {
  ChannelAvatar,
  formatCompact,
  Metric,
  StatusBadge,
} from '@vibeschedule/frontend/components/formats/formats.ui';
import { analyticsHref } from '@vibeschedule/frontend/components/formats/account.card';

export const FormatCard = ({
  format,
  channels,
  days,
  showApp,
  onEdit,
  onEditAssignment,
  onAssign,
}: {
  format: Format;
  /** the accounts in the current filter */
  channels: OverviewChannel[];
  days: number;
  showApp: boolean;
  onEdit: () => void;
  onEditAssignment: (channel: OverviewChannel) => void;
  onAssign: (channel: OverviewChannel) => void;
}) => {
  const t = useT();
  const rows = channels
    .map((channel) => ({
      channel,
      entry: channel.formats.find((f) => f.formatId === format.id),
    }))
    .filter((row): row is { channel: OverviewChannel; entry: OverviewFormat } =>
      Boolean(row.entry)
    );
  const others = channels.filter(
    (channel) => !rows.some((row) => row.channel.id === channel.id)
  );
  const published = rows.reduce((sum, r) => sum + r.entry.stats.published, 0);
  const views = rows.some((r) => r.entry.stats.views != null)
    ? rows.reduce((sum, r) => sum + (r.entry.stats.views || 0), 0)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">{format.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {format.description || t('formats_no_description')}
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 md:size-7"
            onClick={onEdit}
            aria-label={t('formats_edit_title')}
          >
            <PencilIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-2">
        {rows.length ? (
          <ul className="flex flex-col">
            {rows.map(({ channel, entry }) => (
              <li key={channel.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditAssignment(channel)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ChannelAvatar
                    name={channel.name}
                    picture={channel.picture}
                    identifier={channel.identifier}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {channel.name}
                      </span>
                      <StatusBadge status={entry.status} />
                      {showApp && channel.app ? (
                        <Badge variant="outline" className="max-sm:hidden">
                          {channel.app.name}
                        </Badge>
                      ) : null}
                    </div>
                    {entry.note ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {entry.note}
                      </span>
                    ) : null}
                  </div>
                  <Metric
                    value={entry.stats.published}
                    label={t('formats_metric_posts', {
                      count: entry.stats.published,
                    })}
                    className="max-sm:hidden"
                  />
                  <Metric
                    value={entry.stats.views}
                    label={t('formats_metric_views')}
                  />
                </button>
                <Link
                  href={analyticsHref(channel.id, days)}
                  className={buttonVariants({
                    variant: 'ghost',
                    size: 'icon-sm',
                    className: 'size-9 md:size-7',
                  })}
                  aria-label={t('formats_open_analytics')}
                  title={t('formats_open_analytics')}
                >
                  <ChartLineIcon />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-2 text-sm text-muted-foreground">
            {t('formats_format_runs_nowhere')}
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-2 border-t bg-muted/30 py-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {t('formats_format_summary', { count: published })}
          {views != null
            ? ` · ${t('formats_channel_views', {
                views: formatCompact(views),
              })}`
            : ''}
        </span>
        {others.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="h-9 md:h-7" />
              }
            >
              <PlusIcon data-icon="inline-start" />
              {t('formats_add_account')}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {others.map((channel) => (
                <DropdownMenuItem
                  key={channel.id}
                  onClick={() => onAssign(channel)}
                >
                  <ChannelAvatar
                    name={channel.name}
                    picture={channel.picture}
                    identifier={channel.identifier}
                    className="size-5"
                  />
                  {channel.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardFooter>
    </Card>
  );
};
