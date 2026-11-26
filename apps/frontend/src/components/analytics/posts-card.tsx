'use client';

import { useMemo, useState } from 'react';
import { ExternalLinkIcon, FileTextIcon } from 'lucide-react';
import type {
  AnalyticsMetric,
  AnalyticsPost,
} from '@vibeschedule/helpers/utils/analytics.types';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vibeschedule/frontend/components/ui/table';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@vibeschedule/frontend/components/ui/toggle-group';
import {
  Button,
  buttonVariants,
} from '@vibeschedule/frontend/components/ui/button';
import { PostThumb } from '@vibeschedule/frontend/components/analytics/bits';
import {
  formatCount,
  formatDateTime,
  formatInt,
  formatRate,
} from '@vibeschedule/frontend/components/analytics/format';
import { cn } from '@vibeschedule/frontend/lib/utils';

const PAGE = 10;

const postTitle = (post: AnalyticsPost, fallback: string) =>
  post.caption.replace(/#\S+/g, '').replace(/\s+/g, ' ').trim() || fallback;

export function PostsCard({
  posts,
  metrics,
  primary,
}: {
  posts: AnalyticsPost[];
  metrics: AnalyticsMetric[];
  primary: string | null;
}) {
  const t = useT();
  const [sort, setSort] = useState<string>(primary || 'date');
  const [limit, setLimit] = useState(PAGE);

  const sorts = [
    ...(primary
      ? [
          {
            value: primary,
            label: t('analytics_sort_top', {
              label: metrics.find((m) => m.key === primary)?.label,
            }),
          },
        ]
      : []),
    { value: 'date', label: t('analytics_sort_newest') },
    ...(metrics.some((m) => m.reach) && metrics.some((m) => !m.reach)
      ? [{ value: 'engagement', label: t('analytics_engagement') }]
      : []),
  ];

  const sorted = useMemo(() => {
    const key = (p: AnalyticsPost) =>
      sort === 'date'
        ? new Date(p.postedAt).getTime()
        : sort === 'engagement'
        ? p.engagementRate ?? -1
        : p.metrics[sort] ?? 0;
    return [...posts].sort((a, b) => key(b) - key(a));
  }, [posts, sort]);

  const shown = sorted.slice(0, limit);
  const noCaption = t('analytics_post_without_text');

  return (
    <Card className="@container">
      <CardHeader>
        <CardTitle>{t('analytics_posts_title')}</CardTitle>
        <CardDescription>{t('analytics_posts_description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {posts.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileTextIcon />
              </EmptyMedia>
              <EmptyTitle>{t('analytics_no_posts_title')}</EmptyTitle>
              <EmptyDescription>
                {t('analytics_no_posts_description')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="-mx-1 max-w-full overflow-x-auto px-1">
              <ToggleGroup
                value={[sort]}
                onValueChange={(v) => {
                  if (!v.length) return;
                  setSort(String(v[0]));
                  setLimit(PAGE);
                }}
                variant="outline"
                size="sm"
                spacing={0}
                aria-label={t('analytics_sort')}
              >
                {sorts.map((s) => (
                  <ToggleGroupItem
                    key={s.value}
                    value={s.value}
                    className="h-10 px-3 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground md:h-8"
                  >
                    {s.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* narrow: list */}
            <ul className="flex flex-col divide-y rounded-lg border @3xl:hidden">
              {shown.map((post, i) => (
                <li key={post.id}>
                  <PostLink
                    post={post}
                    className="flex w-full items-start gap-3 p-2.5 hover:bg-muted/50"
                  >
                    <span className="w-5 pt-0.5 text-right text-xs text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <PostThumb src={post.thumbnail} className="w-12" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="line-clamp-2 text-sm leading-snug font-medium">
                        {postTitle(post, noCaption)}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {formatDateTime(post.postedAt)}
                        {post.post?.format ? (
                          <Badge variant="outline">{post.post.format.name}</Badge>
                        ) : null}
                      </span>
                      <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                        {metrics
                          .filter((m) => m.key !== primary)
                          .map((m) => (
                            <span key={m.key}>
                              {formatCount(post.metrics[m.key])} {m.label}
                            </span>
                          ))}
                      </span>
                    </span>
                    {primary ? (
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCount(post.metrics[primary])}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {metrics.find((m) => m.key === primary)?.label}
                        </span>
                      </span>
                    ) : null}
                  </PostLink>
                </li>
              ))}
            </ul>

            {/* wide: table */}
            <div className="hidden overflow-hidden rounded-lg border @3xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-right">#</TableHead>
                    <TableHead>{t('analytics_post')}</TableHead>
                    <TableHead>{t('analytics_published')}</TableHead>
                    {metrics.map((m) => (
                      <TableHead key={m.key} className="text-right">
                        {m.label}
                      </TableHead>
                    ))}
                    {sorts.some((s) => s.value === 'engagement') ? (
                      <TableHead className="text-right">
                        {t('analytics_engagement')}
                      </TableHead>
                    ) : null}
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((post, i) => (
                    <TableRow key={post.id}>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {i + 1}
                      </TableCell>
                      <TableCell className="w-[40%] max-w-0">
                        <PostLink
                          post={post}
                          className="flex min-w-0 items-center gap-3 rounded-sm"
                        >
                          <PostThumb src={post.thumbnail} className="w-9" />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium">
                              {postTitle(post, noCaption)}
                            </span>
                            {post.post?.format ? (
                              <span className="truncate text-xs text-muted-foreground">
                                {post.post.format.name}
                              </span>
                            ) : null}
                          </span>
                        </PostLink>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(post.postedAt)}
                      </TableCell>
                      {metrics.map((m) => (
                        <TableCell
                          key={m.key}
                          className={cn(
                            'text-right tabular-nums',
                            m.key === primary && 'font-semibold'
                          )}
                        >
                          {formatInt(post.metrics[m.key])}
                        </TableCell>
                      ))}
                      {sorts.some((s) => s.value === 'engagement') ? (
                        <TableCell className="text-right tabular-nums">
                          {formatRate(post.engagementRate)}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        {post.url ? (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t('analytics_open_post')}
                            className={buttonVariants({
                              variant: 'ghost',
                              size: 'icon-sm',
                            })}
                          >
                            <ExternalLinkIcon />
                          </a>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {sorted.length > limit ? (
              <Button
                variant="outline"
                className="h-10 self-center md:h-8"
                onClick={() => setLimit(limit + PAGE * 2)}
              >
                {t('analytics_show_more', { count: sorted.length - limit })}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PostLink({
  post,
  className,
  children,
}: {
  post: AnalyticsPost;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cn(
    'text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
    className
  );
  return post.url ? (
    <a href={post.url} target="_blank" rel="noreferrer" className={classes}>
      {children}
    </a>
  ) : (
    <span className={classes}>{children}</span>
  );
}
