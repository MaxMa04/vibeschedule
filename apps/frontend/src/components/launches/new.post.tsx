'use client';

import React, { FC, useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { PlusIcon } from 'lucide-react';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { fromUtc } from '@vibeschedule/frontend/components/layout/set.timezone';
import { useCalendar } from '@vibeschedule/frontend/components/launches/calendar.context';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { AddEditModal } from '@vibeschedule/frontend/components/new-launch/add.edit.modal';
import { useAddProvider } from '@vibeschedule/frontend/components/launches/add.provider.component';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { cn } from '@vibeschedule/frontend/lib/utils';

export const editorModalOptions = {
  id: 'add-edit-modal',
  closeOnClickOutside: false,
  removeLayout: true,
  closeOnEscape: false,
  withCloseButton: false,
  askClose: true,
  size: 'full',
};

// opens the post editor for a new post, at the date or at the next free slot
export const useCreatePost = () => {
  const fetch = useFetch();
  const modal = useModals();
  const addProvider = useAddProvider();
  const { integrations, reloadCalendarView } = useCalendar();

  const open = useCallback(
    async (options?: { date?: dayjs.Dayjs; channel?: string }) => {
      if (!integrations.length) {
        addProvider();
        return;
      }
      const date =
        options?.date ||
        fromUtc(
          (
            await (
              await fetch(
                options?.channel
                  ? `/posts/find-slot/${options.channel}`
                  : '/posts/find-slot'
              )
            ).json()
          ).date
        );
      modal.openModal({
        ...editorModalOptions,
        children: (
          <AddEditModal
            allIntegrations={integrations.map((p) => ({ ...p }))}
            reopenModal={() => open(options)}
            mutate={reloadCalendarView}
            integrations={integrations.filter((p) => !p.disabled)}
            {...(options?.channel
              ? { selectedChannels: [options.channel] }
              : {})}
            date={date}
          />
        ),
      });
    },
    [integrations, reloadCalendarView, modal, fetch, addProvider]
  );
  return open;
};

export const NewPost: FC<{ className?: string; iconOnly?: boolean }> = ({
  className,
  iconOnly,
}) => {
  const t = useT();
  const create = useCreatePost();
  const [busy, setBusy] = useState(false);
  const click = useCallback(async () => {
    setBusy(true);
    try {
      await create();
    } finally {
      setBusy(false);
    }
  }, [create]);

  return (
    <Button
      onClick={click}
      disabled={busy}
      size={iconOnly ? 'icon' : 'default'}
      aria-label={t('calendar_new_post')}
      className={cn('h-9 md:h-8', iconOnly && 'w-9 md:w-8', className)}
    >
      {busy ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <PlusIcon data-icon="inline-start" />
      )}
      {!iconOnly && t('calendar_new_post')}
    </Button>
  );
};
