import React, { useCallback } from 'react';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { fromUtc } from '@vibeschedule/frontend/components/layout/set.timezone';
import { useCalendar } from '@vibeschedule/frontend/components/launches/calendar.context';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { AddEditModal } from '@vibeschedule/frontend/components/new-launch/add.edit.modal';

export const NewPost = () => {
  const fetch = useFetch();
  const modal = useModals();
  const { integrations, reloadCalendarView } = useCalendar();
  const t = useT();

  const createAPost = useCallback(async () => {
    const date = (await (await fetch('/posts/find-slot')).json()).date;

    modal.openModal({
      id: 'add-edit-modal',
      closeOnClickOutside: false,
      removeLayout: true,
      closeOnEscape: false,
      withCloseButton: false,
      askClose: true,
      fullScreen: true,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] text-textColor',
      },
      children: (
        <AddEditModal
          allIntegrations={integrations.map((p) => ({
            ...p,
          }))}
          reopenModal={createAPost}
          mutate={reloadCalendarView}
          integrations={integrations}
          date={fromUtc(date)}
        />
      ),
      size: '80%',
      title: ``,
    });
  }, [integrations]);

  return (
    <button
      onClick={createAPost}
      className="text-surface flex-1 ps-[16px] pe-[20px] group-[.sidebar]:p-0 min-h-[44px] max-h-[44px] rounded-[12px] bg-ink hover:opacity-90 flex justify-center items-center gap-[5px] outline-none"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="21"
        height="20"
        viewBox="0 0 21 20"
        fill="none"
        className="min-w-[21px] min-h-[20px]"
      >
        <path
          d="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex-1 text-start text-[14px] group-[.sidebar]:hidden">
        {t('create_new_post')}
      </div>
    </button>
  );
};
