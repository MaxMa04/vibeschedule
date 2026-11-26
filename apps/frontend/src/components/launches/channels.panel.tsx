'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { groupBy, orderBy } from 'lodash';
import { useDrag, useDrop } from 'react-dnd';
import { toast } from 'sonner';
import {
  ChevronDownIcon,
  EllipsisIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PencilIcon,
  RadioTowerIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  Integrations,
  useCalendar,
} from '@vibeschedule/frontend/components/launches/calendar.context';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import { ManualBadge } from '@vibeschedule/frontend/components/launches/manual.badge';
import { UserAvatars } from '@vibeschedule/frontend/components/team/responsible';
import { Menu } from '@vibeschedule/frontend/components/launches/menu/menu';
import {
  AddProviderButton,
  useAddProvider,
} from '@vibeschedule/frontend/components/launches/add.provider.component';
import {
  NameForm,
  useAppRequests,
} from '@vibeschedule/frontend/components/launches/app.modal';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@vibeschedule/frontend/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@vibeschedule/frontend/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@vibeschedule/frontend/components/ui/tooltip';
import { cn } from '@vibeschedule/frontend/lib/utils';

interface ChannelGroup {
  id: string;
  name: string;
  values: Integrations[];
}

export const useChannelGroups = (integrations: Integrations[]) =>
  useMemo<ChannelGroup[]>(
    () =>
      orderBy(
        Object.values(groupBy(integrations, (o) => o.app?.id || '')).map(
          (list) => ({
            id: list[0].app?.id || '',
            name: list[0].app?.name || '',
            values: orderBy(
              list,
              ['disabled', (i) => i.name.toLowerCase()],
              ['asc', 'asc']
            ),
          })
        ),
        // channels without an app come last
        [(g) => (g.id ? 0 : 1), (g) => g.name.toLowerCase()],
        ['asc', 'asc']
      ),
    [integrations]
  );

const ChannelRow: FC<{
  integration: Integrations;
  update: (shouldReload: boolean) => void;
}> = ({ integration, update }) => {
  const t = useT();
  const { selectedChannels, setSelectedChannels } = useCalendar();
  const focused =
    selectedChannels?.length === 1 && selectedChannels[0] === integration.id;
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'channel',
      item: { id: integration.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [integration.id]
  );

  return (
    <div
      ref={(node) => {
        drag(node);
      }}
      role="button"
      tabIndex={0}
      title={t('calendar_channel_focus_hint')}
      onClick={() => setSelectedChannels(focused ? null : [integration.id])}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setSelectedChannels(focused ? null : [integration.id]);
        }
      }}
      className={cn(
        'group/channel flex h-11 cursor-pointer items-center gap-2.5 rounded-lg ps-2 pe-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10',
        focused && 'bg-muted',
        isDragging && 'opacity-40'
      )}
    >
      <ChannelAvatar
        picture={integration.picture}
        identifier={integration.identifier}
        name={integration.name}
        disabled={integration.disabled}
      />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-sm font-medium',
            integration.disabled && 'text-muted-foreground'
          )}
        >
          {integration.name}
        </div>
        {(integration.disabled ||
          (!!integration.display && integration.display !== integration.name)) && (
          <div className="truncate text-xs text-muted-foreground">
            {integration.disabled
              ? t('calendar_channel_disabled')
              : integration.display}
          </div>
        )}
      </div>
      {!!integration.users?.length && (
        <Tooltip>
          <TooltipTrigger render={<span className="flex" />}>
            <UserAvatars users={integration.users} size="xs" max={2} />
          </TooltipTrigger>
          <TooltipContent>
            {t('responsible_names', {
              names: integration.users
                .map((u) => u.name || u.email)
                .join(', '),
            })}
          </TooltipContent>
        </Tooltip>
      )}
      {integration.manualOnly && <ManualBadge variant="icon" />}
      <Menu
        integration={integration}
        onChange={update}
        className="md:opacity-0 md:group-hover/channel:opacity-100 md:has-[[aria-expanded=true]]:opacity-100"
      />
    </div>
  );
};

const GroupHeader: FC<{
  group: ChannelGroup;
  open: boolean;
  toggle: () => void;
  update: (shouldReload: boolean) => void;
}> = ({ group, open, toggle, update }) => {
  const t = useT();
  const modal = useModals();
  const { rename, remove } = useAppRequests();

  const renameApp = useCallback(() => {
    modal.openModal({
      title: t('calendar_rename_app'),
      variant: 'sheet',
      children: (close) => (
        <NameForm
          label={t('calendar_app_name')}
          initial={group.name}
          close={close}
          save={async (name) => {
            const failed = await rename(group.id, name);
            if (!failed) {
              toast.success(t('calendar_app_saved'));
              update(false);
            }
            return failed;
          }}
        />
      ),
    });
  }, [modal, t, group, rename, update]);

  const deleteApp = useCallback(async () => {
    if (
      !(await deleteDialog(
        t('calendar_delete_app_description', { name: group.name }),
        t('calendar_delete_app')
      ))
    ) {
      return;
    }
    if (await remove(group.id)) {
      toast.success(t('calendar_app_deleted'));
      update(false);
    }
  }, [t, group, remove, update]);

  return (
    <div className="group/header flex h-8 items-center gap-1 ps-1">
      <button
        type="button"
        onClick={toggle}
        className="flex min-w-0 flex-1 items-center gap-1 rounded-md text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronDownIcon
          className={cn('size-3.5 transition-transform', !open && '-rotate-90')}
        />
        <span className="truncate">{group.name || t('calendar_no_app')}</span>
        <span className="tabular-nums">· {group.values.length}</span>
      </button>
      {!!group.id && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('calendar_app_menu')}
                className="text-muted-foreground md:opacity-0 md:group-hover/header:opacity-100 md:aria-expanded:opacity-100"
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={renameApp}>
              <PencilIcon />
              {t('calendar_rename_app')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={deleteApp}>
              <Trash2Icon />
              {t('calendar_delete_app')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

// a group of channels; dropping a channel on it moves the channel to this app
const Group: FC<{
  group: ChannelGroup;
  update: (shouldReload: boolean) => void;
}> = ({ group, update }) => {
  const t = useT();
  const storageKey = `calendar-group-${group.id || 'none'}`;
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== '0';
    } catch {
      return true;
    }
  });
  const { assign } = useAppRequests();
  const [{ over }, drop] = useDrop(
    () => ({
      accept: 'channel',
      canDrop: (item: { id: string }) =>
        !group.values.some((v) => v.id === item.id),
      drop: async (item: { id: string }) => {
        if (await assign(item.id, group.id || null)) {
          toast.success(
            group.id ? t('calendar_app_assigned') : t('calendar_app_removed')
          );
          update(false);
        }
      },
      collect: (monitor) => ({ over: monitor.isOver() && monitor.canDrop() }),
    }),
    [group, assign, update, t]
  );

  const toggle = useCallback(() => {
    setOpen((value) => {
      try {
        localStorage.setItem(storageKey, value ? '0' : '1');
      } catch {
        /* private mode */
      }
      return !value;
    });
  }, [storageKey]);

  return (
    <div
      ref={(node) => {
        drop(node);
      }}
      className={cn(
        'flex flex-col gap-0.5 rounded-lg',
        over && 'bg-primary/5 ring-2 ring-primary/30'
      )}
    >
      <GroupHeader group={group} open={open} toggle={toggle} update={update} />
      {open &&
        group.values.map((integration) => (
          <ChannelRow
            key={integration.id}
            integration={integration}
            update={update}
          />
        ))}
    </div>
  );
};

const NoChannels: FC = () => {
  const t = useT();
  const add = useAddProvider();
  return (
    <Empty className="border border-dashed p-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RadioTowerIcon />
        </EmptyMedia>
        <EmptyTitle>{t('no_channels')}</EmptyTitle>
        <EmptyDescription>{t('connect_your_accounts')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={add}>{t('add_channel')}</Button>
      </EmptyContent>
    </Empty>
  );
};

export const ChannelList: FC<{
  update: (shouldReload: boolean) => void;
}> = ({ update }) => {
  const t = useT();
  const { integrations, channels } = useCalendar();
  const groups = useChannelGroups(channels);
  if (!integrations.length) {
    return <NoChannels />;
  }
  if (!channels.length) {
    return (
      <p className="px-2 py-4 text-sm text-muted-foreground">
        {t('calendar_no_channels_filtered')}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <Group key={group.id || 'none'} group={group} update={update} />
      ))}
    </div>
  );
};

// desktop: a column next to the calendar that collapses to the avatars
export const ChannelPanel: FC<{
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  update: (shouldReload: boolean) => void;
}> = ({ collapsed, setCollapsed, update }) => {
  const t = useT();
  const { integrations, channels, selectedChannels, setSelectedChannels } =
    useCalendar();
  const sorted = useChannelGroups(channels).flatMap((g) => g.values);

  if (collapsed) {
    return (
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-2 border-e bg-card py-3 md:flex">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(false)}
                aria-label={t('calendar_show_channels')}
              />
            }
          >
            <PanelLeftOpenIcon />
          </TooltipTrigger>
          <TooltipContent side="right">
            {t('calendar_show_channels')}
          </TooltipContent>
        </Tooltip>
        <div className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto">
          {sorted.map((integration) => {
            const focused =
              selectedChannels?.length === 1 &&
              selectedChannels[0] === integration.id;
            return (
              <Tooltip key={integration.id}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedChannels(focused ? null : [integration.id])
                      }
                      className={cn(
                        'rounded-full p-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                        focused && 'bg-muted ring-2 ring-primary/30'
                      )}
                    />
                  }
                >
                  <ChannelAvatar
                    picture={integration.picture}
                    identifier={integration.identifier}
                    name={integration.name}
                    disabled={integration.disabled}
                  />
                </TooltipTrigger>
                <TooltipContent side="right">{integration.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e bg-card md:flex">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <h2 className="flex-1 text-sm font-semibold">
          {t('channels')}{' '}
          <span className="font-normal text-muted-foreground tabular-nums">
            {channels.length === integrations.length
              ? integrations.length
              : `${channels.length}/${integrations.length}`}
          </span>
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(true)}
          aria-label={t('calendar_hide_channels')}
        >
          <PanelLeftCloseIcon />
        </Button>
      </div>
      <div className="px-3 pb-3">
        <AddProviderButton update={() => update(false)} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <ChannelList update={update} />
      </div>
    </aside>
  );
};

// phones: a button with the first avatars that opens the channels in a sheet
export const ChannelsSheetButton: FC<{
  update: (shouldReload: boolean) => void;
}> = ({ update }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { channels: integrations, selectedChannels } = useCalendar();
  return (
    <>
      <Button
        variant="outline"
        className={cn('h-9 gap-2 px-2 md:hidden', selectedChannels && 'bg-muted')}
        onClick={() => setOpen(true)}
        aria-label={t('channels')}
      >
        {integrations.length ? (
          <span className="flex -space-x-2">
            {integrations.slice(0, 3).map((integration) => (
              <ChannelAvatar
                key={integration.id}
                size="xs"
                picture={integration.picture}
                name={integration.name}
                className="rounded-full ring-2 ring-background"
              />
            ))}
          </span>
        ) : (
          <RadioTowerIcon />
        )}
        <span className="tabular-nums">{integrations.length}</span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-80 gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>{t('channels')}</SheetTitle>
            <SheetDescription>{t('calendar_channels_description')}</SheetDescription>
          </SheetHeader>
          <div className="p-3">
            <AddProviderButton update={() => update(false)} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            <ChannelList update={update} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
