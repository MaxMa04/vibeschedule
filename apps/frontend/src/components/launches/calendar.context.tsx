'use client';

import 'reflect-metadata';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import dayjs from 'dayjs';
import useSWR from 'swr';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { Post, Integration, Tags } from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { extend } from 'dayjs';
import useCookie from 'react-use-cookie';
import {
  fromUtc,
  newDayjs,
} from '@vibeschedule/frontend/components/layout/set.timezone';
import {
  expandPostsList,
  expandPosts,
} from '@vibeschedule/helpers/utils/posts.list.minify';
extend(isoWeek);
extend(weekOfYear);

export type ListStateFilter = 'all' | 'scheduled' | 'draft' | 'published';
export type CalendarDisplay = 'day' | 'week' | 'month' | 'list';

export type CalendarPost = Post & {
  integration: Integration;
  tags: {
    tag: Tags;
  }[];
};

export interface Integrations {
  name: string;
  id: string;
  disabled?: boolean;
  display: string;
  identifier: string;
  type: string;
  picture: string;
  time: {
    time: number;
  }[];
  app?: {
    id: string;
    name: string;
  } | null;
}

export interface CalendarFilters {
  startDate: string;
  endDate: string;
  display: CalendarDisplay;
  app: string | null;
}

// the range of the view that contains the reference date (today by default)
export const getDateRange = (
  display: CalendarDisplay,
  referenceDate?: string
) => {
  const date = referenceDate ? newDayjs(referenceDate) : newDayjs();
  switch (display) {
    case 'day':
    case 'list':
      return {
        startDate: date.format('YYYY-MM-DD'),
        endDate: date.format('YYYY-MM-DD'),
      };
    case 'month':
      return {
        startDate: date.startOf('month').format('YYYY-MM-DD'),
        endDate: date.endOf('month').format('YYYY-MM-DD'),
      };
    default:
      return {
        startDate: date.startOf('isoWeek').format('YYYY-MM-DD'),
        endDate: date.endOf('isoWeek').format('YYYY-MM-DD'),
      };
  }
};

export const CalendarContext = createContext({
  startDate: newDayjs().startOf('isoWeek').format('YYYY-MM-DD'),
  endDate: newDayjs().endOf('isoWeek').format('YYYY-MM-DD'),
  app: null as string | null,
  loading: true,
  integrations: [] as Integrations[],
  posts: [] as CalendarPost[],
  // the publish date of each post, in the user's timezone
  postDates: new Map<object, dayjs.Dayjs>(),
  reloadCalendarView: () => {
    /** empty **/
  },
  display: 'week' as CalendarDisplay,
  setFilters: (filters: CalendarFilters) => {
    /** empty **/
  },
  // shows the range of the display that contains the date
  goTo: (display: CalendarDisplay, date?: string) => {
    /** empty **/
  },
  changeDate: (id: string, date: dayjs.Dayjs) => {
    /** empty **/
  },
  listPosts: [] as CalendarPost[],
  listPage: 0,
  listTotalPages: 0,
  setListPage: (page: number) => {
    /** empty **/
  },
  listState: 'all' as ListStateFilter,
  setListState: (state: ListStateFilter) => {
    /** empty **/
  },
  selectedChannels: null as string[] | null,
  setSelectedChannels: (channels: string[] | null) => {
    /** empty **/
  },
  currentHour: newDayjs().startOf('hour'),
});

// The current time rounded down to the unit. It checks on every minute, so it
// also catches up within a minute after the computer wakes up from sleep.
export const useNow = (unit: 'minute' | 'hour' = 'minute') => {
  const [now, setNow] = useState(() => newDayjs().startOf(unit).valueOf());
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const tick = () => {
      // same number = no re-render, so the hour clock only renders once an hour
      setNow(newDayjs().startOf(unit).valueOf());
      timeout = setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    tick();
    return () => clearTimeout(timeout);
  }, [unit]);
  return useMemo(() => newDayjs(now), [now]);
};

const isDisplay = (value: string | null): value is CalendarDisplay =>
  value === 'day' || value === 'week' || value === 'month' || value === 'list';

const swrOptions = {
  refreshInterval: 3600000,
  refreshWhenOffline: false,
  refreshWhenHidden: false,
  revalidateOnFocus: false,
};

export const CalendarWeekProvider: FC<{
  children: ReactNode;
  integrations: Integrations[];
}> = ({ children, integrations }) => {
  const fetch = useFetch();
  const [internalData, setInternalData] = useState<CalendarPost[]>([]);
  const searchParams = useSearchParams();
  // a 7-column week needs sideways scrolling on a phone, so phones start with the day
  const [displaySaved, setDisplaySaved] = useCookie(
    'calendar-display',
    typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches
      ? 'day'
      : 'week'
  );
  const urlDisplay = searchParams.get('display');
  const display: CalendarDisplay = isDisplay(urlDisplay)
    ? urlDisplay
    : isDisplay(displaySaved)
    ? displaySaved
    : 'week';

  const [listPage, setListPage] = useState(0);
  const [listState, setListStateRaw] = useState<ListStateFilter>('all');
  const setListState = useCallback((next: ListStateFilter) => {
    setListStateRaw(next);
    setListPage(0);
  }, []);

  const initStartDate = searchParams.get('startDate');
  const initEndDate = searchParams.get('endDate');
  const initialRange =
    initStartDate && initEndDate
      ? { startDate: initStartDate, endDate: initEndDate }
      : getDateRange(display);

  const [selectedChannels, setSelectedChannelsRaw] = useState<string[] | null>(
    null
  );
  const setSelectedChannels = useCallback((next: string[] | null) => {
    setSelectedChannelsRaw(next);
    setListPage(0);
  }, []);

  const [filters, setFiltersState] = useState<CalendarFilters>({
    startDate: initialRange.startDate,
    endDate: initialRange.endDate,
    app: searchParams.get('app') || null,
    display,
  });

  useEffect(() => {
    setSelectedChannels(null);
  }, [filters.app]);

  const loadData = useCallback(async () => {
    const params = new URLSearchParams({
      display: filters.display,
      app: filters.app || '',
      startDate: newDayjs(filters.startDate).startOf('day').utc().format(),
      endDate: newDayjs(filters.endDate).endOf('day').utc().format(),
    }).toString();
    const data = await (await fetch(`/posts?${params}`)).json();
    return expandPosts(data);
  }, [filters]);

  const listParams = useMemo(() => {
    return new URLSearchParams({
      page: listPage.toString(),
      limit: '100',
      app: filters.app || '',
      state: listState,
      ...(selectedChannels ? { integrations: selectedChannels.join(',') } : {}),
    }).toString();
  }, [listPage, filters.app, listState, selectedChannels]);

  const loadListData = useCallback(async () => {
    const response = await fetch(`/posts/list?${listParams}`);
    return expandPostsList(await response.json());
  }, [listParams]);

  const calendarKey =
    filters.display !== 'list'
      ? `/posts-${filters.display}-${filters.startDate}-${filters.endDate}-${
          filters.app || ''
        }`
      : null;
  const {
    data: calendarData,
    isLoading: calendarIsLoading,
    mutate: mutateCalendar,
  } = useSWR(calendarKey, loadData, swrOptions);

  const {
    data: listData,
    isLoading: listIsLoading,
    mutate: mutateList,
  } = useSWR(
    filters.display === 'list' ? `/posts-list-${listParams}` : null,
    loadListData,
    swrOptions
  );

  const setFilters = useCallback((next: CalendarFilters) => {
    setDisplaySaved(next.display);
    setFiltersState(next);
    if (next.display === 'list') {
      setListPage(0);
    }
    const path = new URLSearchParams({
      startDate: next.startDate,
      endDate: next.endDate,
      display: next.display,
      ...(next.app ? { app: next.app } : {}),
    });
    window.history.replaceState(null, '', `/launches?${path.toString()}`);
  }, []);

  const goTo = useCallback(
    (nextDisplay: CalendarDisplay, date?: string) => {
      setFilters({
        ...getDateRange(nextDisplay, date),
        display: nextDisplay,
        app: filters.app,
      });
    },
    [filters.app, setFilters]
  );

  const filterByChannels = useCallback(
    (list: CalendarPost[]) =>
      selectedChannels
        ? list.filter((p) => selectedChannels.includes(p.integration.id))
        : list,
    [selectedChannels]
  );

  const posts = useMemo<CalendarPost[]>(
    () => calendarData?.posts || [],
    [calendarData?.posts]
  );
  const listPosts = useMemo<CalendarPost[]>(
    () => listData?.posts || [],
    [listData?.posts]
  );
  const listTotalPages = Math.ceil((listData?.total || 0) / 100);

  // moves the post right away, the server call follows
  const changeDate = useCallback((id: string, date: dayjs.Dayjs) => {
    setInternalData((d) =>
      d.map((post) =>
        post.id === id
          ? ({
              ...post,
              publishDate: date.utc().format('YYYY-MM-DDTHH:mm:ss'),
            } as unknown as CalendarPost)
          : post
      )
    );
  }, []);

  useEffect(() => {
    setInternalData(posts);
  }, [posts]);

  const reloadCalendarView = useCallback(() => {
    mutateCalendar();
    mutateList();
  }, [mutateCalendar, mutateList]);

  const loading =
    filters.display === 'list' ? listIsLoading : calendarIsLoading;

  // one clock for every calendar cell, instead of a timer per cell
  const currentHour = useNow('hour');

  // every calendar cell looks for its posts in the whole list, so the dates
  // are parsed once here instead of in each cell
  const postDates = useMemo(
    () =>
      new Map<object, dayjs.Dayjs>(
        internalData.map((post) => [post, fromUtc(post.publishDate)])
      ),
    [internalData]
  );

  const visiblePosts = useMemo(
    () => (calendarIsLoading ? [] : filterByChannels(internalData)),
    [calendarIsLoading, filterByChannels, internalData]
  );
  const visibleListPosts = useMemo(
    () => filterByChannels(listPosts),
    [filterByChannels, listPosts]
  );

  return (
    <CalendarContext.Provider
      value={{
        reloadCalendarView,
        ...filters,
        posts: visiblePosts,
        postDates,
        loading,
        integrations,
        setFilters,
        goTo,
        changeDate,
        listPosts: visibleListPosts,
        listPage,
        listTotalPages,
        setListPage,
        listState,
        setListState,
        selectedChannels,
        setSelectedChannels,
        currentHour,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);
