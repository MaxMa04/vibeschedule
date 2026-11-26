'use client';

import { FC, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useShallow } from 'zustand/react/shallow';
import { CheckIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import { Integrations } from '@vibeschedule/frontend/components/launches/calendar.context';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@vibeschedule/frontend/components/ui/toggle-group';
import { cn } from '@vibeschedule/frontend/lib/utils';

interface App {
  id: string;
  name: string;
}

const NO_APP = 'none';
const ALL_APPS = 'all';

const useApps = () => {
  const fetch = useFetch();
  return useSWR<App[]>('/apps', async (path: string) => {
    const response = await fetch(path);
    return response.ok ? response.json() : [];
  });
};

const ChannelChip: FC<{
  integration: Integrations;
  selected: boolean;
  onClick: () => void;
}> = ({ integration, selected, onClick }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={cn(
      'flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border p-2 text-start transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
      selected
        ? 'border-primary bg-primary/5'
        : 'hover:border-foreground/20 hover:bg-muted/50'
    )}
  >
    <ChannelAvatar
      picture={integration.picture}
      identifier={integration.identifier}
      name={integration.name}
      size="md"
    />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm font-medium">{integration.name}</span>
      {!!integration.display && integration.display !== integration.name && (
        <span className="truncate text-xs text-muted-foreground">
          {integration.display}
        </span>
      )}
    </span>
    <span
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input'
      )}
    >
      {selected && <CheckIcon className="size-3" />}
    </span>
  </button>
);

// the channels to post on, grouped by app
export const PicksSocialsComponent: FC = () => {
  const t = useT();
  const { data: apps = [] } = useApps();
  const [appFilter, setAppFilter] = useState(ALL_APPS);
  const {
    integrations,
    selectedIntegrations,
    addOrRemoveSelectedIntegration,
    locked,
    clearError,
  } = useLaunchStore(
    useShallow((state) => ({
      integrations: state.integrations,
      selectedIntegrations: state.selectedIntegrations,
      addOrRemoveSelectedIntegration: state.addOrRemoveSelectedIntegration,
      locked: state.locked,
      clearError: state.clearError,
    }))
  );

  const toggle = (integration: Integrations) => {
    clearError('form');
    addOrRemoveSelectedIntegration(integration, {});
  };

  const isSelected = (id: string) =>
    selectedIntegrations.some((p) => p.integration.id === id);

  const groups = useMemo(() => {
    const available = integrations.filter((p) => !p.disabled);
    const appOf = (integration: Integrations) =>
      integration.app?.id || NO_APP;
    return [
      ...apps.map((app) => ({ id: app.id, name: app.name })),
      { id: NO_APP, name: t('editor_without_app') },
    ]
      .map((group) => ({
        ...group,
        channels: available.filter((p) => appOf(p) === group.id),
      }))
      .filter((group) => group.channels.length > 0);
  }, [integrations, apps]);

  const visibleGroups =
    appFilter === ALL_APPS
      ? groups
      : groups.filter((group) => group.id === appFilter);

  const toggleGroup = (channels: Integrations[]) => {
    const allSelected = channels.every((p) => isSelected(p.id));
    for (const channel of channels) {
      if (allSelected || !isSelected(channel.id)) {
        toggle(channel);
      }
    }
  };

  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('editor_no_channels')}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        locked && 'pointer-events-none opacity-50'
      )}
    >
      {groups.length > 1 && (
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={1}
          className="flex-wrap"
          value={[appFilter]}
          onValueChange={(value) => setAppFilter(value[0] ?? ALL_APPS)}
        >
          <ToggleGroupItem value={ALL_APPS}>{t('all')}</ToggleGroupItem>
          {groups.map((group) => (
            <ToggleGroupItem key={group.id} value={group.id}>
              {group.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {visibleGroups.map((group) => {
        const selectedCount = group.channels.filter((p) =>
          isSelected(p.id)
        ).length;
        return (
          <div key={group.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{group.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {selectedCount}/{group.channels.length}
              </span>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="ms-auto"
                onClick={() => toggleGroup(group.channels)}
              >
                {selectedCount === group.channels.length
                  ? t('editor_select_none')
                  : t('editor_select_all')}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {group.channels.map((integration) => (
                <ChannelChip
                  key={integration.id}
                  integration={integration}
                  selected={isSelected(integration.id)}
                  onClick={() => toggle(integration)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
