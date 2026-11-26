'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BoxesIcon, LayersIcon, PlusIcon, UsersIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import {
  Button,
  buttonVariants,
} from '@vibeschedule/frontend/components/ui/button';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@vibeschedule/frontend/components/ui/alert';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vibeschedule/frontend/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@vibeschedule/frontend/components/ui/toggle-group';
import {
  NO_APP,
  OverviewChannel,
  PERIODS,
  useApps,
  useFormats,
  useOverview,
} from '@vibeschedule/frontend/components/formats/formats.data';
import { AccountCard } from '@vibeschedule/frontend/components/formats/account.card';
import { FormatCard } from '@vibeschedule/frontend/components/formats/format.card';
import {
  AppsSheet,
  AssignSheet,
  AssignSheetState,
  FormatSheet,
  FormatSheetState,
} from '@vibeschedule/frontend/components/formats/formats.sheets';

const ALL = 'all';
type View = 'accounts' | 'formats';

const channelRef = (channel: OverviewChannel) => ({
  id: channel.id,
  name: channel.name,
  picture: channel.picture,
  identifier: channel.identifier,
});

const useQueryState = () => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const days = Number(params.get('days'));
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };
  return {
    app: params.get('app'),
    days: PERIODS.includes(days) ? days : 30,
    view: (params.get('view') === 'formats' ? 'formats' : 'accounts') as View,
    setApp: (app: string | null) => set('app', app),
    setDays: (value: number) =>
      set('days', value === 30 ? null : String(value)),
    setView: (view: View) => set('view', view === 'accounts' ? null : view),
  };
};

const LoadingGrid = () => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
    {Array.from({ length: 4 }, (_, i) => (
      <Skeleton key={i} className="h-56 rounded-xl" />
    ))}
  </div>
);

const Section = ({
  title,
  count,
  children,
}: {
  title?: string;
  count?: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    {title ? (
      <h2 className="text-sm font-semibold">
        {title}{' '}
        <span className="font-normal text-muted-foreground tabular-nums">
          · {count}
        </span>
      </h2>
    ) : null}
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>
  </section>
);

export const FormatsPage = () => {
  const t = useT();
  const { app, days, view, setApp, setDays, setView } = useQueryState();
  const { data: apps } = useApps();
  const { data: formats } = useFormats();
  const overview = useOverview(app, days);
  const channels = overview.data?.channels;

  const [formatSheet, setFormatSheet] = useState<FormatSheetState | null>(null);
  const [assignSheet, setAssignSheet] = useState<AssignSheetState | null>(null);
  const [appsOpen, setAppsOpen] = useState(false);

  const appItems = useMemo(
    () => [
      { value: ALL, label: t('formats_all_apps') },
      ...(apps || []).map((a) => ({ value: a.id, label: a.name })),
      { value: NO_APP, label: t('formats_no_app') },
    ],
    [apps, t]
  );
  const periodItems = PERIODS.map((d) => ({
    value: String(d),
    label: t('last_days', { days: d }),
  }));

  // "Alle": one section per app, accounts without an app last
  const groups = useMemo(() => {
    if (!channels) return [];
    if (app) return [{ key: app, title: undefined, channels }];
    const byApp = (apps || []).map((a) => ({
      key: a.id,
      title: a.name as string | undefined,
      channels: channels.filter((c) => c.app?.id === a.id),
    }));
    return [
      ...byApp,
      {
        key: NO_APP,
        title: t('formats_no_app') as string | undefined,
        channels: channels.filter((c) => !c.app),
      },
    ].filter((g) => g.channels.length);
  }, [channels, apps, app, t]);

  const openAssign = (channel: OverviewChannel, formatId?: string) =>
    setAssignSheet({ channel: channelRef(channel), formatId });

  const noApps = apps && !apps.length;
  const noFormats = formats && !formats.length;

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        value={[app || ALL]}
        onValueChange={(v) =>
          v.length && setApp(v[0] === ALL ? null : String(v[0]))
        }
        variant="outline"
        spacing={0}
        className="max-md:hidden"
        aria-label={t('formats_filter_app')}
      >
        {appItems.map((item) => (
          <ToggleGroupItem
            key={item.value}
            value={item.value}
            className="h-8 px-3 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
          >
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Select
        value={app || ALL}
        items={appItems}
        onValueChange={(v) => setApp(!v || v === ALL ? null : String(v))}
      >
        <SelectTrigger
          className="min-w-0 flex-1 data-[size=default]:h-10 md:hidden"
          aria-label={t('formats_filter_app')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {appItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        value={String(days)}
        items={periodItems}
        onValueChange={(v) => v && setDays(Number(v))}
      >
        <SelectTrigger
          className="data-[size=default]:h-10 md:data-[size=default]:h-8"
          aria-label={t('formats_period')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {periodItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <ToggleGroup
        value={[view]}
        onValueChange={(v) => v.length && setView(v[0] as View)}
        variant="outline"
        spacing={0}
        className="md:ml-auto max-md:w-full"
        aria-label={t('formats_view')}
      >
        <ToggleGroupItem
          value="accounts"
          className="h-10 px-3 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground max-md:flex-1 md:h-8"
        >
          <UsersIcon data-icon="inline-start" />
          {t('formats_view_accounts')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="formats"
          className="h-10 px-3 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground max-md:flex-1 md:h-8"
        >
          <LayersIcon data-icon="inline-start" />
          {t('formats_view_formats')}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  const hint = noApps ? (
    <Alert>
      <BoxesIcon />
      <AlertTitle>{t('formats_hint_apps_title')}</AlertTitle>
      <AlertDescription>{t('formats_hint_apps_description')}</AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline" onClick={() => setAppsOpen(true)}>
          {t('formats_hint_apps_action')}
        </Button>
      </AlertAction>
    </Alert>
  ) : noFormats ? (
    <Alert>
      <LayersIcon />
      <AlertTitle>{t('formats_hint_formats_title')}</AlertTitle>
      <AlertDescription>
        {t('formats_hint_formats_description')}
      </AlertDescription>
      <AlertAction>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFormatSheet({ mode: 'create' })}
        >
          {t('formats_new_title')}
        </Button>
      </AlertAction>
    </Alert>
  ) : null;

  const content = () => {
    if (overview.error) {
      return (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t('formats_load_failed')}</EmptyTitle>
            <EmptyDescription>{overview.error.message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => overview.mutate()}>
              {t('formats_retry')}
            </Button>
          </EmptyContent>
        </Empty>
      );
    }
    if (!channels) return <LoadingGrid />;
    if (!channels.length) {
      return app ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>{t('formats_empty_filter_title')}</EmptyTitle>
            <EmptyDescription>
              {t('formats_empty_filter_description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => setAppsOpen(true)}>
              {t('formats_manage_apps')}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>{t('formats_empty_accounts_title')}</EmptyTitle>
            <EmptyDescription>
              {t('formats_empty_accounts_description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/launches" className={buttonVariants()}>
              {t('formats_empty_accounts_action')}
            </Link>
          </EmptyContent>
        </Empty>
      );
    }

    if (view === 'formats') {
      if (!formats) return <LoadingGrid />;
      if (!formats.length) {
        return (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayersIcon />
              </EmptyMedia>
              <EmptyTitle>{t('formats_hint_formats_title')}</EmptyTitle>
              <EmptyDescription>
                {t('formats_hint_formats_description')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setFormatSheet({ mode: 'create' })}>
                <PlusIcon data-icon="inline-start" />
                {t('formats_new_title')}
              </Button>
            </EmptyContent>
          </Empty>
        );
      }
      const runsHere = (id: string) =>
        channels.some((c) => c.formats.some((f) => f.formatId === id));
      // with an app filter, formats of other apps would only be noise
      const shown = app ? formats.filter((f) => runsHere(f.id)) : formats;
      const idle = app ? formats.filter((f) => !runsHere(f.id)) : [];
      return (
        <div className="flex flex-col gap-6">
          {!shown.length ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <LayersIcon />
                </EmptyMedia>
                <EmptyTitle>{t('formats_empty_view_title')}</EmptyTitle>
                <EmptyDescription>
                  {t('formats_empty_view_description')}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => setView('accounts')}>
                  {t('formats_view_accounts')}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Section>
              {shown.map((format) => (
                <FormatCard
                  key={format.id}
                  format={format}
                  channels={channels}
                  days={days}
                  showApp={!app}
                  onEdit={() =>
                    setFormatSheet({ mode: 'edit', formatId: format.id })
                  }
                  onEditAssignment={(channel) => openAssign(channel, format.id)}
                  onAssign={(channel) =>
                    setAssignSheet({
                      channel: channelRef(channel),
                      presetFormatId: format.id,
                    })
                  }
                />
              ))}
            </Section>
          )}
          {idle.length ? (
            <p className="text-sm text-muted-foreground">
              {t('formats_idle_in_app', { count: idle.length })}{' '}
              {idle.map((f, i) => (
                <span key={f.id}>
                  {i ? ', ' : ''}
                  <button
                    type="button"
                    className="underline-offset-4 hover:underline"
                    onClick={() =>
                      setFormatSheet({ mode: 'edit', formatId: f.id })
                    }
                  >
                    {f.name}
                  </button>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <Section
            key={group.key}
            title={group.title}
            count={t('formats_accounts_count', {
              count: group.channels.length,
            })}
          >
            {group.channels.map((channel) => (
              <AccountCard
                key={channel.id}
                channel={channel}
                days={overview.data!.days}
                showApp={false}
                onAssign={() => openAssign(channel)}
                onEditAssignment={(formatId) => openAssign(channel, formatId)}
                onManageApp={() => setAppsOpen(true)}
              />
            ))}
          </Section>
        ))}
      </div>
    );
  };

  return (
    <PageBody>
      <PageHeader
        title={t('formats')}
        description={t('formats_page_description')}
        actions={
          <>
            <Button
              variant="outline"
              className="h-10 md:h-8"
              onClick={() => setAppsOpen(true)}
            >
              <BoxesIcon data-icon="inline-start" />
              {t('formats_apps')}
            </Button>
            <Button
              className="h-10 md:h-8"
              onClick={() => setFormatSheet({ mode: 'create' })}
            >
              <PlusIcon data-icon="inline-start" />
              {t('formats_new_title')}
            </Button>
          </>
        }
      />
      {filterBar}
      {hint}
      {content()}
      <FormatSheet state={formatSheet} onClose={() => setFormatSheet(null)} />
      <AssignSheet
        state={assignSheet}
        onClose={() => setAssignSheet(null)}
        onEditFormat={(formatId) => {
          setAssignSheet(null);
          setFormatSheet({ mode: 'edit', formatId });
        }}
      />
      <AppsSheet open={appsOpen} onClose={() => setAppsOpen(false)} />
    </PageBody>
  );
};
