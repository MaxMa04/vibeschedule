'use client';

import React, { FC, useCallback } from 'react';
import { toast } from 'sonner';
import copy from 'copy-to-clipboard';
import {
  BoxIcon,
  ClockIcon,
  CopyIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
  SmartphoneIcon,
  UnplugIcon,
  UsersRoundIcon,
  ZapIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { TimeTable } from '@vibeschedule/frontend/components/launches/time.table';
import { Integrations } from '@vibeschedule/frontend/components/launches/calendar.context';
import {
  AppAssignForm,
  NameForm,
} from '@vibeschedule/frontend/components/launches/app.modal';
import { useCreatePost } from '@vibeschedule/frontend/components/launches/new.post';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useResponsibleSheet } from '@vibeschedule/frontend/components/team/responsible';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@vibeschedule/frontend/components/ui/dropdown-menu';
import { cn } from '@vibeschedule/frontend/lib/utils';

export const Menu: FC<{
  integration: Integrations;
  // true when the channel is gone and the list should reload with a spinner
  onChange: (shouldReload: boolean) => void;
  className?: string;
}> = ({ integration, onChange, className }) => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const createPost = useCreatePost();
  const user = useUser();
  const setResponsible = useResponsibleSheet();
  const { id, disabled, manualOnly } = integration;
  const reload = useCallback(() => onChange(false), [onChange]);

  const preferences = useCallback(() => {
    modal.openModal({
      title: t('calendar_channel_preferences'),
      description: t('calendar_channel_preferences_description'),
      variant: 'sheet',
      children: (close) => (
        <NameForm
          label={t('calendar_channel_name')}
          initial={integration.name}
          placeholder={integration.display}
          hint={t('calendar_channel_name_hint')}
          allowEmpty
          close={close}
          save={async (name) => {
            const response = await fetch(`/integrations/${id}/custom-name`, {
              method: 'PUT',
              body: JSON.stringify({ name }),
            });
            if (!response.ok) {
              return t('calendar_save_failed');
            }
            toast.success(t('calendar_channel_saved'));
            reload();
            return null;
          }}
        />
      ),
    });
  }, [modal, t, integration, fetch, id, reload]);

  const postingTimes = useCallback(() => {
    modal.openModal({
      title: t('time_table_slots'),
      description: t('calendar_times_description'),
      variant: 'sheet',
      children: (close) => (
        <TimeTable integration={integration} mutate={reload} close={close} />
      ),
    });
  }, [modal, t, integration, reload]);

  const assignApp = useCallback(() => {
    modal.openModal({
      title: t('calendar_assign_app'),
      description: t('calendar_assign_app_description'),
      variant: 'sheet',
      children: (close) => (
        <AppAssignForm integration={integration} close={close} onSaved={reload} />
      ),
    });
  }, [modal, t, integration, reload]);

  const setEnabled = useCallback(
    (enable: boolean) => async () => {
      if (
        !enable &&
        !(await deleteDialog(
          t('are_you_sure_disable_channel'),
          t('disable_channel'),
          t('disable_channel_title')
        ))
      ) {
        return;
      }
      await fetch(enable ? '/integrations/enable' : '/integrations/disable', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      toast.success(enable ? t('channel_enabled') : t('channel_disabled'));
      reload();
    },
    [fetch, id, reload, t]
  );

  const disconnect = useCallback(async () => {
    if (
      !(await deleteDialog(
        t('calendar_disconnect_description', { name: integration.name }),
        t('calendar_disconnect'),
        t('calendar_disconnect_title')
      ))
    ) {
      return;
    }
    const response = await fetch('/integrations', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      toast.error(t('calendar_disconnect_failed'));
      return;
    }
    toast.success(t('channel_deleted'));
    onChange(true);
  }, [fetch, id, integration.name, onChange, t]);

  // A manual-only channel never sends anything to PfM. Turning it on takes
  // back what is scheduled there.
  const toggleManualOnly = useCallback(async () => {
    const next = !manualOnly;
    if (
      next &&
      !(await deleteDialog(
        t('manual_only_confirm'),
        t('manual_only_enable'),
        t('manual_only_title')
      ))
    ) {
      return;
    }
    const response = await fetch(`/integrations/${id}/manual-only`, {
      method: 'PUT',
      body: JSON.stringify({ manualOnly: next }),
    });
    if (!response.ok) {
      toast.error(t('manual_only_failed'));
      return;
    }
    toast.success(next ? t('manual_only_enabled') : t('manual_only_disabled'));
    onChange(true);
  }, [fetch, id, manualOnly, onChange, t]);

  const copyId = useCallback(() => {
    copy(id);
    toast.success(t('channel_id_copied'));
  }, [id, t]);

  return (
    // clicks inside the portaled menu still bubble through React to the row
    <div onClick={(e) => e.stopPropagation()} className={cn('flex', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('calendar_channel_menu')}
              className="text-muted-foreground"
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {!disabled && (
            <>
              <DropdownMenuItem onClick={() => createPost({ channel: id })}>
                <PlusIcon />
                {t('calendar_new_post_for_channel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={preferences}>
              <PencilIcon />
              {t('calendar_channel_preferences')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={postingTimes}>
              <ClockIcon />
              {t('edit_time_slots')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={assignApp}>
              <BoxIcon />
              {t('calendar_assign_app')}
            </DropdownMenuItem>
            {user?.role === 'ADMIN' && (
              <DropdownMenuItem onClick={() => setResponsible(integration)}>
                <UsersRoundIcon />
                {t('responsible_set')}
              </DropdownMenuItem>
            )}
            {user?.role === 'ADMIN' && (
              <DropdownMenuItem onClick={toggleManualOnly}>
                {manualOnly ? <ZapIcon /> : <SmartphoneIcon />}
                {manualOnly
                  ? t('manual_only_turn_off')
                  : t('manual_only_turn_on')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={copyId}>
              <CopyIcon />
              {t('copy_id')}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {disabled ? (
            <DropdownMenuItem onClick={setEnabled(true)}>
              <PowerIcon />
              {t('enable_channel')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={setEnabled(false)}>
              <PowerOffIcon />
              {t('disable_channel')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={disconnect}>
            <UnplugIcon />
            {t('calendar_disconnect')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
