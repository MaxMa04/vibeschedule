'use client';

import { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { GlobeIcon } from 'lucide-react';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import { useExistingData } from '@vibeschedule/frontend/components/launches/helpers/use.existing.data';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import { cn } from '@vibeschedule/frontend/lib/utils';

const tabClass = (active: boolean) =>
  cn(
    'inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
    active
      ? 'border-foreground/15 bg-muted text-foreground'
      : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
  );

// which text is being edited: the shared one or a channel's own
export const SelectCurrent: FC = () => {
  const t = useT();
  const existingData = useExistingData();
  const { selectedIntegrations, current, setCurrent, internal, errors } =
    useLaunchStore(
      useShallow((state) => ({
        selectedIntegrations: state.selectedIntegrations,
        current: state.current,
        setCurrent: state.setCurrent,
        internal: state.internal,
        errors: state.errors,
      }))
    );

  if (!selectedIntegrations.length) {
    return null;
  }

  return (
    <div
      role="tablist"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
    >
      {/* an existing post opens on its channels, without the shared text */}
      {!existingData.integration && (
        <button
          type="button"
          role="tab"
          aria-selected={current === 'global'}
          onClick={() => setCurrent('global')}
          className={tabClass(current === 'global')}
        >
          <GlobeIcon className="size-4" />
          {t('global_edit')}
          {!!errors.global && (
            <span className="size-1.5 rounded-full bg-destructive" />
          )}
        </button>
      )}
      {selectedIntegrations.map(({ integration }) => {
        const custom = internal.some((p) => p.integration.id === integration.id);
        return (
          <button
            type="button"
            role="tab"
            key={integration.id}
            aria-selected={current === integration.id}
            onClick={() => setCurrent(integration.id)}
            className={tabClass(current === integration.id)}
          >
            <ChannelAvatar
              picture={integration.picture}
              identifier={integration.identifier}
              name={integration.name}
              size="xs"
            />
            <span className="max-w-32 truncate">{integration.name}</span>
            {!!errors[integration.id] ? (
              <span className="size-1.5 rounded-full bg-destructive" />
            ) : (
              custom &&
              !existingData.integration && (
                <span
                  title={t('no_longer_global_mode')}
                  className="size-1.5 rounded-full bg-primary"
                />
              )
            )}
          </button>
        );
      })}
    </div>
  );
};
