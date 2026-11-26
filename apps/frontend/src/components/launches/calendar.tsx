'use client';

import React, {
  FC,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { extend } from 'dayjs';
import { useDrag, useDrop } from 'react-dnd';
import { groupBy, sortBy } from 'lodash';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  BarChart3Icon,
  CalendarClockIcon,
  CopyIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import { State } from '@prisma/client';
import {
  CalendarPost,
  useCalendar,
  useNow,
} from '@vibeschedule/frontend/components/launches/calendar.context';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { ExistingDataContextProvider } from '@vibeschedule/frontend/components/launches/helpers/use.existing.data';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { AddEditModal } from '@vibeschedule/frontend/components/new-launch/add.edit.modal';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { stripHtmlValidation } from '@vibeschedule/helpers/utils/strip.html.validation';
import {
  fromUtc,
  newDayjs,
} from '@vibeschedule/frontend/components/layout/set.timezone';
import { RenderAnalytics } from '@vibeschedule/frontend/components/platform-analytics/render.analytics';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import {
  editorModalOptions,
  useCreatePost,
} from '@vibeschedule/frontend/components/launches/new.post';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@vibeschedule/frontend/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import {
  Alert,
  AlertDescription,
} from '@vibeschedule/frontend/components/ui/alert';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { cn } from '@vibeschedule/frontend/lib/utils';

extend(isSameOrAfter);
extend(isSameOrBefore);
extend(localizedFormat);
dayjs.locale('de');

export const hours = Array.from({ length: 24 }, (_, i) => i);

const statusMeta: Record<
  State,
  { label: string; dot: string; accent: string; badge: string; chip: string }
> = {
  QUEUE: {
    label: 'scheduled',
    dot: 'bg-sky-500',
    accent: 'before:bg-sky-500',
    badge: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400',
    chip: 'bg-card',
  },
  PUBLISHED: {
    label: 'published',
    dot: 'bg-emerald-500',
    accent: 'before:bg-emerald-500',
    badge:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    chip: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950',
  },
  ERROR: {
    label: 'calendar_status_error',
    dot: 'bg-destructive',
    accent: 'before:bg-destructive',
    badge: 'border-destructive/40 bg-destructive/10 text-destructive',
    chip: 'border-destructive/40 bg-red-50 dark:bg-red-950',
  },
  DRAFT: {
    label: 'draft',
    dot: 'bg-muted-foreground/50',
    accent: 'before:bg-muted-foreground/50',
    badge: 'text-muted-foreground',
    chip: 'border-dashed bg-muted',
  },
};

export const StatusBadge: FC<{ state: State; className?: string }> = ({
  state,
  className,
}) => {
  const t = useT();
  const meta = statusMeta[state] || statusMeta.QUEUE;
  return (
    <Badge variant="outline" className={cn(meta.badge, className)}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} />
      {t(meta.label)}
    </Badge>
  );
};

const postText = (post: CalendarPost) =>
  stripHtmlValidation('none', post.content || '', false, true, false).trim();

// the hour slot a click creates a post in; the current hour starts a bit from now
const slotDate = (cell: dayjs.Dayjs, now: dayjs.Dayjs) =>
  cell.isSame(now, 'hour')
    ? now.add(15, 'minute').startOf('minute')
    : cell.startOf('hour');

// edit, duplicate, delete, preview and statistics of a post
const usePostActions = () => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const { integrations, reloadCalendarView } = useCalendar();

  const edit = useCallback(
    async (post: CalendarPost, isDuplicate?: boolean) => {
      const data = await (await fetch(`/posts/group/${post.group}`)).json();
      if (!data?.posts?.length) {
        toast.error(t('post_not_found'));
        reloadCalendarView();
        return;
      }
      const date = isDuplicate
        ? (await (await fetch('/posts/find-slot')).json()).date
        : null;
      const publishDate = fromUtc(date || data.posts[0].publishDate);
      const Wrapper = isDuplicate ? Fragment : ExistingDataContextProvider;
      modal.openModal({
        ...editorModalOptions,
        children: (
          <Wrapper value={data}>
            <AddEditModal
              {...(isDuplicate
                ? {
                    onlyValues: data.posts.map(
                      ({ image, settings, content }: any) => ({
                        image,
                        settings,
                        content,
                      })
                    ),
                  }
                : {})}
              allIntegrations={integrations.map((p) => ({ ...p }))}
              reopenModal={() => edit(post, isDuplicate)}
              mutate={reloadCalendarView}
              integrations={
                isDuplicate
                  ? integrations.filter((p) => !p.disabled)
                  : integrations
                      .filter((f) => f.id === data.integration)
                      .map((p) => ({
                        ...p,
                        picture: data.integrationPicture,
                      }))
              }
              date={publishDate}
            />
          </Wrapper>
        ),
      });
    },
    [fetch, integrations, modal, reloadCalendarView, t]
  );

  const remove = useCallback(
    async (post: CalendarPost) => {
      if (
        !(await deleteDialog(
          t('are_you_sure_you_want_to_delete_post'),
          t('delete_post')
        ))
      ) {
        return;
      }
      await fetch(`/posts/${post.group}`, { method: 'DELETE' });
      toast.success(t('post_deleted_successfully'));
      reloadCalendarView();
    },
    [fetch, reloadCalendarView, t]
  );

  const statistics = useCallback(
    (post: CalendarPost) => {
      modal.openModal({
        title: t('post_statistics'),
        size: 'xl',
        children: <RenderAnalytics url={`/analytics/post/${post.id}`} />,
      });
    },
    [modal, t]
  );

  const preview = useCallback(
    (post: CalendarPost) => {
      modal.openModal({
        title: t('calendar_preview'),
        size: 'lg',
        children: (close) => (
          <PostPreview
            post={post}
            onEdit={() => {
              close();
              edit(post);
            }}
          />
        ),
      });
    },
    [modal, t, edit]
  );

  return { edit, remove, statistics, preview };
};

const PostPreview: FC<{ post: CalendarPost; onEdit: () => void }> = ({
  post,
  onEdit,
}) => {
  const t = useT();
  const fetch = useFetch();
  const { data, isLoading } = useSWR(`/posts/group/${post.group}`, async (u) =>
    (await fetch(u)).json()
  );
  const first = data?.posts?.[0];
  const media: { path: string }[] = first?.image || [];
  const text = first
    ? stripHtmlValidation('normal', first.content || '', false, true, false)
    : '';
  const date = fromUtc(post.publishDate);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ChannelAvatar
          size="md"
          picture={post.integration.picture}
          identifier={post.integration.providerIdentifier}
          name={post.integration.name}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{post.integration.name}</div>
          <div className="text-sm text-muted-foreground">
            {date.format('dddd, D. MMMM YYYY · HH:mm')}
          </div>
        </div>
        <StatusBadge state={post.state} />
      </div>
      {post.state === 'ERROR' && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>
            {post.error || t('post_publish_error')}
          </AlertDescription>
        </Alert>
      )}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-40 w-40" />
        </div>
      ) : (
        <>
          <p className="text-sm whitespace-pre-wrap break-words">
            {text.trim() || (
              <span className="text-muted-foreground">{t('no_content')}</span>
            )}
          </p>
          {!!media.length && (
            <div className="grid grid-cols-3 gap-2">
              {media.map((m) =>
                /\.(mp4|mov|webm)(\?|$)/i.test(m.path) ? (
                  <video
                    key={m.path}
                    src={m.path}
                    muted
                    controls
                    className="aspect-[9/16] w-full rounded-lg border bg-muted object-cover"
                  />
                ) : (
                  <img
                    key={m.path}
                    src={m.path}
                    alt=""
                    className="aspect-square w-full rounded-lg border bg-muted object-cover"
                  />
                )
              )}
            </div>
          )}
        </>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {post.state === 'PUBLISHED' && post.releaseURL?.startsWith('http') && (
          <Button
            variant="outline"
            className="h-10 md:h-8"
            nativeButton={false}
            render={<a href={post.releaseURL} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            {t('open_post')}
          </Button>
        )}
        <Button className="h-10 md:h-8" onClick={onEdit}>
          <PencilIcon data-icon="inline-start" />
          {t('calendar_edit')}
        </Button>
      </div>
    </div>
  );
};

const PostActionsMenu: FC<{ post: CalendarPost; className?: string }> = ({
  post,
  className,
}) => {
  const t = useT();
  const { edit, remove, statistics, preview } = usePostActions();
  return (
    // clicks inside the portaled menu still bubble through React to the post
    <div onClick={(e) => e.stopPropagation()} className={cn('flex', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('calendar_post_actions')}
              className="text-muted-foreground"
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => preview(post)}>
            <EyeIcon />
            {t('calendar_preview')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => edit(post)}>
            <PencilIcon />
            {t('calendar_edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => edit(post, true)}>
            <CopyIcon />
            {t('duplicate_post')}
          </DropdownMenuItem>
          {post.state === 'PUBLISHED' && (
            <DropdownMenuItem onClick={() => statistics(post)}>
              <BarChart3Icon />
              {t('post_statistics')}
            </DropdownMenuItem>
          )}
          {post.state === 'PUBLISHED' && post.releaseURL?.startsWith('http') && (
            <DropdownMenuItem
              render={
                <a href={post.releaseURL} target="_blank" rel="noreferrer" />
              }
            >
              <ExternalLinkIcon />
              {t('open_post')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => remove(post)}>
            <Trash2Icon />
            {t('delete_post')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

type ChipVariant = 'week' | 'day' | 'month';

// a post in a calendar cell: channel, time, text and status, draggable unless published
const PostChip: FC<{
  post: CalendarPost;
  date: dayjs.Dayjs;
  variant: ChipVariant;
}> = memo(({ post, date, variant }) => {
  const t = useT();
  const { edit } = usePostActions();
  const meta = statusMeta[post.state] || statusMeta.QUEUE;
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'post',
      canDrag: post.state !== 'PUBLISHED',
      item: { id: post.id, date },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [post.id, post.state, date]
  );
  const text = postText(post);

  return (
    <div
      ref={(node) => {
        drag(node);
      }}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        edit(post);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          edit(post);
        }
      }}
      className={cn(
        'group/post relative w-full min-w-0 overflow-hidden rounded-md border py-0.5 ps-2 pe-1 text-xs shadow-xs transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
        'before:absolute before:inset-y-1 before:start-0.5 before:w-0.5 before:rounded-full',
        meta.chip,
        meta.accent,
        post.state !== 'PUBLISHED' && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        variant === 'week'
          ? 'flex flex-col gap-0.5 py-1'
          : 'flex items-center gap-1.5',
        variant === 'month' && 'max-md:justify-center max-md:p-0.5'
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <ChannelAvatar
          size="xs"
          picture={post.integration.picture}
          identifier={
            variant === 'day' ? post.integration.providerIdentifier : null
          }
          name={post.integration.name}
        />
        <span
          className={cn(
            'shrink-0 font-medium tabular-nums',
            variant === 'month' && 'max-md:hidden'
          )}
        >
          {fromUtc(post.publishDate).format('HH:mm')}
        </span>
        {post.state === 'ERROR' && (
          <TriangleAlertIcon
            className={cn(
              'size-3 shrink-0 text-destructive',
              variant === 'month' && 'max-md:hidden'
            )}
          />
        )}
        {variant === 'week' && (
          <span className="min-w-0 truncate text-muted-foreground">
            {post.integration.name}
          </span>
        )}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          variant === 'week' ? 'text-foreground' : 'text-muted-foreground',
          variant === 'month' && 'max-md:hidden'
        )}
      >
        {variant === 'day' && (
          <span className="me-1.5 font-medium text-foreground max-md:hidden">
            {post.integration.name}
          </span>
        )}
        {post.state === 'DRAFT' && `${t('draft')}: `}
        {text || t('no_content')}
      </span>
      {variant === 'day' && <StatusBadge state={post.state} />}
      <PostActionsMenu
        post={post}
        className={cn(
          variant === 'day'
            ? 'md:opacity-0 md:group-hover/post:opacity-100 md:has-[[aria-expanded=true]]:opacity-100'
            : 'absolute end-0.5 top-0.5 rounded-md bg-card opacity-0 shadow-xs group-hover/post:opacity-100 has-[[aria-expanded=true]]:opacity-100 max-md:hidden'
        )}
      />
    </div>
  );
});
PostChip.displayName = 'PostChip';

// a cell takes dropped posts, they keep their time of day or minute
const useCellDrop = (target: (date: dayjs.Dayjs) => dayjs.Dayjs) => {
  const fetch = useFetch();
  const t = useT();
  const { changeDate, reloadCalendarView } = useCalendar();
  return useDrop(
    () => ({
      accept: 'post',
      canDrop: (item: { id: string; date: dayjs.Dayjs }) =>
        target(item.date).isAfter(newDayjs()),
      drop: async (item: { id: string; date: dayjs.Dayjs }) => {
        const date = target(item.date);
        changeDate(item.id, date);
        const response = await fetch(`/posts/${item.id}/date`, {
          method: 'PUT',
          body: JSON.stringify({
            date: date.utc().format('YYYY-MM-DDTHH:mm:ss'),
            action: 'schedule',
          }),
        });
        if (!response.ok) {
          toast.error(t('calendar_move_failed'));
        }
        reloadCalendarView();
      },
      collect: (monitor) => ({
        over: monitor.isOver() && monitor.canDrop(),
      }),
    }),
    [target, changeDate, fetch, reloadCalendarView, t]
  );
};

// the red line at the current minute, inside the current hour's cell
const NowLine: FC = () => {
  const now = useNow();
  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex h-0 items-center"
      style={{ top: `${(now.minute() / 60) * 100}%` }}
    >
      <span className="-ms-1 size-2 rounded-full bg-destructive" />
      <span className="h-0.5 flex-1 bg-destructive" />
    </div>
  );
};

const VISIBLE_IN_CELL = 3;

const HourCell: FC<{
  date: dayjs.Dayjs;
  posts: CalendarPost[];
  variant: 'week' | 'day';
}> = memo(({ date, posts, variant }) => {
  const t = useT();
  const { currentHour } = useCalendar();
  const create = useCreatePost();
  const [showAll, setShowAll] = useState(false);
  const isPast = date.isBefore(currentHour);
  const isNow = date.isSame(currentHour, 'hour');
  const target = useCallback(
    (from: dayjs.Dayjs) => date.minute(from.minute()),
    [date]
  );
  const [{ over }, drop] = useCellDrop(target);
  const limit = variant === 'day' ? Infinity : VISIBLE_IN_CELL;
  const list = showAll ? posts : posts.slice(0, limit);

  return (
    <div
      ref={(node) => {
        drop(node);
      }}
      onClick={
        isPast ? undefined : () => create({ date: slotDate(date, newDayjs()) })
      }
      className={cn(
        'group/cell relative flex min-h-14 min-w-0 flex-col gap-0.5 border-e border-b p-0.5',
        isPast ? 'bg-muted/40' : 'cursor-pointer hover:bg-muted/40',
        over && 'bg-primary/5 ring-2 ring-primary/40 ring-inset'
      )}
    >
      {isNow && <NowLine />}
      {list.map((post) => (
        <PostChip
          key={post.id}
          post={post}
          date={fromUtc(post.publishDate)}
          variant={variant}
        />
      ))}
      {posts.length > limit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowAll((v) => !v);
          }}
          className="rounded px-1 text-start text-xs text-muted-foreground hover:text-foreground"
        >
          {showAll
            ? t('show_less')
            : t('calendar_more', { count: posts.length - limit })}
        </button>
      )}
      {!isPast && (
        <PlusIcon className="pointer-events-none absolute end-1.5 bottom-1.5 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/cell:opacity-100" />
      )}
    </div>
  );
});
HourCell.displayName = 'HourCell';

const usePostsBy = (format: string) => {
  const { posts, postDates } = useCalendar();
  return useMemo(() => {
    const sorted = sortBy(posts, (p) => postDates.get(p)?.valueOf());
    return groupBy(sorted, (p) => postDates.get(p)?.format(format));
  }, [posts, postDates, format]);
};

const DayHeader: FC<{ day: dayjs.Dayjs; today: dayjs.Dayjs }> = ({
  day,
  today,
}) => {
  const isToday = day.isSame(today, 'day');
  return (
    <div
      data-today={isToday || undefined}
      className="sticky top-0 z-20 flex flex-col items-center justify-center gap-0.5 border-e border-b bg-card py-2"
    >
      <span
        className={cn(
          'text-xs text-muted-foreground uppercase',
          isToday && 'font-medium text-foreground'
        )}
      >
        {day.format('dd')}
      </span>
      <span
        className={cn(
          'flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
          isToday && 'bg-primary text-primary-foreground'
        )}
      >
        {day.date()}
      </span>
    </div>
  );
};

// week and day: hours down, days across. Phones scroll the week sideways.
const TimeGrid: FC<{ days: dayjs.Dayjs[] }> = ({ days }) => {
  const { currentHour, display, startDate, loading, posts, postDates } =
    useCalendar();
  const postsByHour = usePostsBy('YYYY-MM-DD HH');
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef('');
  const variant = days.length === 1 ? 'day' : 'week';

  // once per range: today starts at the hour before now, other ranges at the
  // first post or the morning
  useEffect(() => {
    const key = `${display}-${startDate}`;
    if (loading || scrolledFor.current === key) {
      return;
    }
    scrolledFor.current = key;
    const now = newDayjs();
    const hasToday = days.some((day) => day.isSame(now, 'day'));
    const firstPost = posts.length
      ? Math.min(...posts.map((p) => postDates.get(p)?.hour() ?? 24))
      : 8;
    const hour = hasToday ? now.hour() - 1 : Math.min(firstPost, 8);
    const scroller = scrollRef.current;
    const row = scroller?.querySelector<HTMLElement>(
      `[data-hour="${Math.max(0, hour)}"]`
    );
    const header = scroller?.querySelector<HTMLElement>('[data-header]');
    if (scroller && row) {
      scroller.scrollTop = row.offsetTop - (header?.offsetHeight || 0);
    }
    // narrow screens scroll the week sideways until today is in view
    const today = scroller?.querySelector<HTMLElement>('[data-today]');
    if (
      scroller &&
      today &&
      today.offsetLeft + today.offsetWidth > scroller.clientWidth
    ) {
      scroller.scrollLeft = today.offsetLeft - (header?.offsetWidth || 0);
    }
  }, [display, startDate, loading, days, posts, postDates]);

  return (
    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
      <div
        className={cn(
          'grid',
          variant === 'week'
            ? 'min-w-[48rem] grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]'
            : 'grid-cols-[3.25rem_minmax(0,1fr)]'
        )}
      >
        <div
          data-header
          className="sticky start-0 top-0 z-30 border-e border-b bg-card"
        />
        {days.map((day) => (
          <DayHeader key={day.valueOf()} day={day} today={currentHour} />
        ))}
        {hours.map((hour) => (
          <Fragment key={hour}>
            <div
              data-hour={hour}
              className="sticky start-0 z-10 border-e border-b bg-card pe-2 pt-1 text-end text-xs text-muted-foreground tabular-nums"
            >
              {String(hour).padStart(2, '0')}:00
            </div>
            {days.map((day) => {
              const date = day.hour(hour).startOf('hour');
              return (
                <HourCell
                  key={date.valueOf()}
                  date={date}
                  variant={variant}
                  posts={postsByHour[date.format('YYYY-MM-DD HH')] || []}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export const WeekView = () => {
  const { startDate } = useCalendar();
  const days = useMemo(() => {
    const start = newDayjs(startDate).startOf('day');
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  }, [startDate]);
  return <TimeGrid days={days} />;
};

export const DayView = () => {
  const { startDate } = useCalendar();
  const days = useMemo(() => [newDayjs(startDate).startOf('day')], [startDate]);
  return <TimeGrid days={days} />;
};

const MonthCell: FC<{
  day: dayjs.Dayjs;
  inMonth: boolean;
  posts: CalendarPost[];
}> = memo(({ day, inMonth, posts }) => {
  const t = useT();
  const { currentHour } = useCalendar();
  const create = useCreatePost();
  const [showAll, setShowAll] = useState(false);
  const isPast = day.endOf('day').isBefore(currentHour);
  const isToday = day.isSame(currentHour, 'day');
  const target = useCallback(
    (from: dayjs.Dayjs) => day.hour(from.hour()).minute(from.minute()),
    [day]
  );
  const [{ over }, drop] = useCellDrop(target);
  const list = showAll ? posts : posts.slice(0, VISIBLE_IN_CELL);

  const createAt = useCallback(() => {
    const now = newDayjs();
    create({
      date: isToday
        ? now.add(1, 'hour').startOf('hour')
        : day.hour(10).startOf('hour'),
    });
  }, [create, day, isToday]);

  return (
    <div
      ref={(node) => {
        drop(node);
      }}
      onClick={isPast ? undefined : createAt}
      className={cn(
        'group/cell relative flex min-h-18 min-w-0 flex-col gap-0.5 border-e border-b p-1 md:min-h-24',
        !inMonth && 'bg-muted/30',
        isPast ? 'cursor-default' : 'cursor-pointer hover:bg-muted/40',
        over && 'bg-primary/5 ring-2 ring-primary/40 ring-inset'
      )}
    >
      <div className="flex items-center justify-between px-0.5">
        <span
          className={cn(
            'flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums',
            !inMonth && 'text-muted-foreground',
            isPast && inMonth && 'text-muted-foreground',
            isToday && 'bg-primary text-primary-foreground'
          )}
        >
          {day.date()}
        </span>
        {!isPast && (
          <PlusIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/cell:opacity-100" />
        )}
      </div>
      <div className="flex flex-wrap gap-0.5 md:flex-col md:flex-nowrap">
        {list.map((post) => (
          <div key={post.id} className="min-w-0 md:w-full">
            <PostChip
              post={post}
              date={fromUtc(post.publishDate)}
              variant="month"
            />
          </div>
        ))}
      </div>
      {posts.length > VISIBLE_IN_CELL && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowAll((v) => !v);
          }}
          className="rounded px-1 text-start text-xs text-muted-foreground hover:text-foreground"
        >
          {showAll ? (
            <>
              <span className="md:hidden">−</span>
              <span className="max-md:hidden">{t('show_less')}</span>
            </>
          ) : (
            <>
              <span className="md:hidden">
                +{posts.length - VISIBLE_IN_CELL}
              </span>
              <span className="max-md:hidden">
                {t('calendar_more', {
                  count: posts.length - VISIBLE_IN_CELL,
                })}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
});
MonthCell.displayName = 'MonthCell';

export const MonthView = () => {
  const { startDate } = useCalendar();
  const postsByDay = usePostsBy('YYYY-MM-DD');

  const weeks = useMemo(() => {
    const monthStart = newDayjs(startDate).startOf('month');
    const first = monthStart.startOf('isoWeek');
    const last = monthStart.endOf('month').endOf('isoWeek');
    const count = Math.round(last.diff(first, 'day', true));
    return Array.from({ length: count }, (_, i) => first.add(i, 'day'));
  }, [startDate]);

  const month = newDayjs(startDate).month();
  const weekdays = weeks.slice(0, 7);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="sticky top-0 z-20 grid grid-cols-7 bg-card">
        {weekdays.map((d) => (
          <div
            key={d.valueOf()}
            className="border-e border-b py-2 text-center text-xs text-muted-foreground uppercase"
          >
            {d.format('dd')}
          </div>
        ))}
      </div>
      <div
        className="grid flex-1 grid-cols-7 [--row:4.5rem] md:[--row:6rem]"
        style={{
          gridTemplateRows: `repeat(${weeks.length / 7}, minmax(var(--row), auto))`,
        }}
      >
        {weeks.map((day) => (
          <MonthCell
            key={day.valueOf()}
            day={day}
            inMonth={day.month() === month}
            posts={postsByDay[day.format('YYYY-MM-DD')] || []}
          />
        ))}
      </div>
    </div>
  );
};

const PostRow: FC<{ post: CalendarPost }> = ({ post }) => {
  const t = useT();
  const { edit } = usePostActions();
  const text = postText(post);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => edit(post)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          edit(post);
        }
      }}
      className="flex cursor-pointer items-start gap-3 px-3 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 md:items-center md:px-4"
    >
      <span className="w-11 shrink-0 pt-0.5 text-sm font-medium tabular-nums md:pt-0">
        {fromUtc(post.publishDate).format('HH:mm')}
      </span>
      <ChannelAvatar
        picture={post.integration.picture}
        identifier={post.integration.providerIdentifier}
        name={post.integration.name}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {post.integration.name}
          </div>
          <div className="line-clamp-2 text-sm text-muted-foreground md:line-clamp-1">
            {text || t('no_content')}
          </div>
          {post.state === 'ERROR' && !!post.error && (
            <div className="mt-0.5 line-clamp-1 text-xs text-destructive">
              {post.error}
            </div>
          )}
        </div>
        <StatusBadge state={post.state} />
      </div>
      <PostActionsMenu post={post} />
    </div>
  );
};

export const ListView = () => {
  const t = useT();
  const { loading, listPosts, listState } = useCalendar();

  const grouped = useMemo(() => {
    const groups = groupBy(
      sortBy(listPosts, (p) => fromUtc(p.publishDate).valueOf()),
      (p) => fromUtc(p.publishDate).format('YYYY-MM-DD')
    );
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [listPosts]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!listPosts.length) {
    const emptyMessage =
      listState === 'scheduled'
        ? t('no_upcoming_posts')
        : listState === 'draft'
        ? t('no_draft_posts')
        : listState === 'published'
        ? t('no_published_posts')
        : t('no_posts');
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarClockIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyMessage}</EmptyTitle>
          <EmptyDescription>{t('calendar_list_empty_hint')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const today = newDayjs();
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {grouped.map(([dateKey, posts]) => {
        const day = newDayjs(dateKey);
        return (
          <section key={dateKey}>
            <h3 className="sticky top-0 z-10 flex items-baseline gap-2 border-b bg-card/95 px-3 py-2 text-sm font-semibold backdrop-blur md:px-4">
              {day.format('dddd, D. MMMM YYYY')}
              {day.isSame(today, 'day') && (
                <span className="text-xs font-normal text-muted-foreground">
                  {t('today')}
                </span>
              )}
              <span className="ms-auto text-xs font-normal text-muted-foreground">
                {t('calendar_post_count', { count: posts.length })}
              </span>
            </h3>
            <div className="divide-y border-b">
              {posts.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export const Calendar = () => {
  const { display } = useCalendar();
  return display === 'list' ? (
    <ListView />
  ) : display === 'day' ? (
    <DayView />
  ) : display === 'month' ? (
    <MonthView />
  ) : (
    <WeekView />
  );
};
