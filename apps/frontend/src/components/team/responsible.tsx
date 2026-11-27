'use client';

import { FC, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import {
  CheckIcon,
  ScissorsIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import {
  ME,
  NO_CLIPPERS,
  TeamUser,
} from '@vibeschedule/helpers/channels/channel.filter';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  CHANNELS_KEY,
  useChannelList,
  useTeamList,
} from '@vibeschedule/frontend/lib/shared-data';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import {
  initials,
  useRoleLabel,
} from '@vibeschedule/frontend/components/settings/profile.component';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@vibeschedule/frontend/components/ui/avatar';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Checkbox } from '@vibeschedule/frontend/components/ui/checkbox';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import {
  Alert,
  AlertDescription,
} from '@vibeschedule/frontend/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@vibeschedule/frontend/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@vibeschedule/frontend/components/ui/tooltip';
import { cn } from '@vibeschedule/frontend/lib/utils';

const ALL = '__all';

const displayName = (user: Pick<TeamUser, 'name' | 'email'>) =>
  user.name || user.email;

interface ChannelWithUsers {
  id: string;
  name: string;
  manualOnly?: boolean;
  users?: TeamUser[];
}

/** The team, for everyone but clippers (the API is closed for them) */
export const useTeam = () => {
  const me = useUser();
  return useTeamList(!!me && me.role !== 'CLIPPER');
};

const avatarSizes = {
  xs: 'size-6 text-xs',
  sm: 'size-7 text-xs',
};

/** The people responsible for a channel, as a row of initials */
export const UserAvatars: FC<{
  users: TeamUser[];
  size?: keyof typeof avatarSizes;
  max?: number;
  className?: string;
}> = ({ users, size = 'sm', max = 3, className }) => {
  if (!users.length) return null;
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <AvatarGroup className={cn('-space-x-1.5', className)}>
      {shown.map((user) => (
        <Avatar key={user.id} className={avatarSizes[size]}>
          <AvatarFallback className="text-inherit">
            {initials(displayName(user))}
          </AvatarFallback>
        </Avatar>
      ))}
      {rest > 0 && (
        <AvatarGroupCount className={avatarSizes[size]}>+{rest}</AvatarGroupCount>
      )}
    </AvatarGroup>
  );
};

/** The sheet to set who is responsible for a channel */
export const useResponsibleSheet = () => {
  const t = useT();
  const modals = useModals();
  return useCallback(
    (channel: { id: string; name: string }) =>
      modals.openModal({
        variant: 'sheet',
        title: t('responsible_set'),
        description: channel.name,
        children: (close) => (
          <ResponsibleForm channelId={channel.id} close={close} />
        ),
      }),
    [modals, t]
  );
};

// everything filtered by responsible users reloads after a change
const touched = (key: unknown) =>
  typeof key === 'string' &&
  (key === CHANNELS_KEY ||
    key === '/settings/team' ||
    key.startsWith('/formats/overview') ||
    key.startsWith('/analytics/overview') ||
    key.startsWith('/posts'));

const ResponsibleForm: FC<{ channelId: string; close: () => void }> = ({
  channelId,
  close,
}) => {
  const t = useT();
  const fetch = useFetch();
  const roleLabel = useRoleLabel();
  const { mutate } = useSWRConfig();
  const { data: team, isLoading } = useTeam();
  const { data: channels } = useChannelList<ChannelWithUsers>();
  const channel = channels?.find((c) => c.id === channelId);
  const [selected, setSelected] = useState<string[]>(
    () => channel?.users?.map((u) => u.id) ?? []
  );
  const [saving, setSaving] = useState(false);

  const before = useMemo(
    () => new Set(channel?.users?.map((u) => u.id) ?? []),
    [channel]
  );
  // a clipper only posts by hand, so it turns the channel manual-only
  const addsClipper =
    !channel?.manualOnly &&
    (team ?? []).some(
      (u) => u.role === 'CLIPPER' && selected.includes(u.id) && !before.has(u.id)
    );

  const toggle = (id: string) =>
    setSelected((list) =>
      list.includes(id) ? list.filter((s) => s !== id) : [...list, id]
    );

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(`/integrations/${channelId}/users`, {
      method: 'PUT',
      body: JSON.stringify({ userIds: selected }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error(t('responsible_failed'));
      return;
    }
    toast.success(t('responsible_saved'));
    mutate(touched);
    close();
  };

  return (
    <form onSubmit={save} className="flex flex-1 flex-col gap-4" noValidate>
      <p className="text-sm text-muted-foreground">
        {t('responsible_description')}
      </p>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !team?.length ? (
        <p className="text-sm text-muted-foreground">{t('responsible_no_team')}</p>
      ) : (
        <div className="flex flex-col divide-y overflow-hidden rounded-lg border">
          {team.map((user) => (
            <label
              key={user.id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 has-data-checked:bg-primary/5"
            >
              <Checkbox
                checked={selected.includes(user.id)}
                onCheckedChange={() => toggle(user.id)}
              />
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {initials(displayName(user))}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {displayName(user)}
                </span>
                {!!user.name && (
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                )}
              </span>
              {user.role !== 'USER' && (
                <Badge variant="outline">{roleLabel(user.role)}</Badge>
              )}
            </label>
          ))}
        </div>
      )}
      {addsClipper && (
        <Alert>
          <TriangleAlertIcon />
          <AlertDescription>{t('responsible_clipper_hint')}</AlertDescription>
        </Alert>
      )}
      <div className="mt-auto flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          className="h-10 md:h-8"
          type="button"
          onClick={close}
        >
          {t('cancel')}
        </Button>
        <Button className="h-10 md:h-8" type="submit" disabled={saving || !team}>
          {saving && <Spinner data-icon="inline-start" />}
          {t('save')}
        </Button>
      </div>
    </form>
  );
};

/**
 * Who is responsible for a channel. Admins click it to change that, everyone
 * else only sees it.
 */
export const ChannelResponsible: FC<{
  channelId: string;
  /** shows "Zuständig" next to the avatars and a button when nobody is set */
  labelled?: boolean;
  size?: keyof typeof avatarSizes;
  className?: string;
}> = ({ channelId, labelled, size = 'sm', className }) => {
  const t = useT();
  const me = useUser();
  const open = useResponsibleSheet();
  const { data: channels } = useChannelList<ChannelWithUsers>();
  const channel = channels?.find((c) => c.id === channelId);
  const users = channel?.users ?? [];
  const editable = me?.role === 'ADMIN' && !!channel;

  if (!users.length && !(labelled && editable)) return null;

  const names = users.map(displayName).join(', ');
  const content = users.length ? (
    <>
      {labelled && (
        <span className="text-xs text-muted-foreground max-sm:sr-only">
          {t('responsible')}
        </span>
      )}
      <UserAvatars users={users} size={size} />
    </>
  ) : (
    <>
      <UserPlusIcon data-icon="inline-start" />
      <span className="max-sm:sr-only">{t('responsible')}</span>
    </>
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          editable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t('responsible_set')}
              onClick={(e) => {
                e.stopPropagation();
                open(channel);
              }}
              className={cn(
                'h-9 gap-1.5 px-1.5 text-muted-foreground md:h-7',
                className
              )}
            />
          ) : (
            <span
              className={cn('inline-flex items-center gap-1.5', className)}
            />
          )
        }
      >
        {content}
      </TooltipTrigger>
      <TooltipContent>
        {users.length
          ? t('responsible_names', { names })
          : t('responsible_set')}
      </TooltipContent>
    </Tooltip>
  );
};

const WITH_CLIPPERS = 'yes';

interface FilterItem {
  value: string;
  label: string;
}

/** One filter as a list of rows, for the mobile filter sheet */
const FilterList: FC<{
  label: string;
  items: FilterItem[];
  current: string;
  onPick: (value: string) => void;
  icon: typeof UserRoundIcon;
}> = ({ label, items, current, onPick, icon: Icon }) => (
  <div className="flex flex-col gap-1">
    <div className="px-1 text-xs font-medium text-muted-foreground">
      {label}
    </div>
    {items.map((item) => {
      const selected = current === item.value;
      return (
        <button
          key={item.value}
          type="button"
          onClick={() => onPick(item.value)}
          className={cn(
            'flex h-10 items-center gap-2 rounded-lg px-2 text-start text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
            selected && 'bg-muted font-medium'
          )}
        >
          <Icon className="size-4 text-muted-foreground" />
          <span className="flex-1 truncate">{item.label}</span>
          {selected && <CheckIcon className="size-4" />}
        </button>
      );
    })}
  </div>
);

/**
 * The "Zuständig" filter: everyone, me or one team member, and whether the
 * channels of clippers count (`clippers`, see `NO_CLIPPERS`). With them, a
 * person also covers the channels of the clippers they look after. A saved
 * member who left the team falls back to everyone.
 */
export const ResponsibleFilter: FC<{
  value: string | null;
  onChange: (value: string | null) => void;
  clippers: string | null;
  onClippersChange: (value: string | null) => void;
  list?: boolean;
  className?: string;
}> = ({ value, onChange, clippers, onClippersChange, list, className }) => {
  const t = useT();
  const me = useUser();
  const { data: team } = useTeam();
  const others = useMemo(
    () =>
      (team ?? [])
        .filter((u) => u.id !== me?.id)
        .sort((a, b) => displayName(a).localeCompare(displayName(b), 'de')),
    [team, me?.id]
  );
  const items = useMemo(
    () => [
      { value: ALL, label: t('filter_all') },
      { value: ME, label: t('responsible_me') },
      ...others.map((u) => ({ value: u.id, label: displayName(u) })),
    ],
    [others, t]
  );
  const clipperItems = useMemo(
    () => [
      { value: WITH_CLIPPERS, label: t('yes') },
      { value: NO_CLIPPERS, label: t('no') },
    ],
    [t]
  );

  useEffect(() => {
    if (team && value && value !== ME && !team.some((u) => u.id === value)) {
      onChange(null);
    }
  }, [team, value, onChange]);

  const current = value || ALL;
  const pick = (next: string) => onChange(next === ALL ? null : next);
  const currentClippers =
    clippers === NO_CLIPPERS ? NO_CLIPPERS : WITH_CLIPPERS;
  const pickClippers = (next: string) =>
    onClippersChange(next === NO_CLIPPERS ? NO_CLIPPERS : null);

  if (list) {
    return (
      <div className={cn('flex flex-col gap-5', className)}>
        <FilterList
          label={t('responsible')}
          items={items}
          current={current}
          onPick={pick}
          icon={UserRoundIcon}
        />
        <FilterList
          label={t('responsible_clippers_filter')}
          items={clipperItems}
          current={currentClippers}
          onPick={pickClippers}
          icon={ScissorsIcon}
        />
      </div>
    );
  }

  return (
    <>
      <Select
        items={items}
        value={current}
        onValueChange={(next) => pick(next ? String(next) : ALL)}
      >
        <SelectTrigger
          className={cn(
            'h-9 min-w-36 md:h-8',
            value && 'border-primary/40 bg-muted',
            className
          )}
          aria-label={t('responsible_filter')}
        >
          <UserRoundIcon className="text-muted-foreground" />
          <span className="text-muted-foreground max-sm:hidden">
            {t('responsible')}:
          </span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.slice(0, 2).map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
          {others.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                {items.slice(2).map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
      <Select
        items={clipperItems}
        value={currentClippers}
        onValueChange={(next) =>
          pickClippers(next ? String(next) : WITH_CLIPPERS)
        }
      >
        <SelectTrigger
          className={cn(
            'h-9 md:h-8',
            currentClippers === NO_CLIPPERS && 'border-primary/40 bg-muted',
            className
          )}
          aria-label={t('responsible_clippers_filter')}
        >
          <ScissorsIcon className="text-muted-foreground" />
          <span className="text-muted-foreground max-sm:hidden">
            {t('responsible_clippers')}:
          </span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {clipperItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
};
