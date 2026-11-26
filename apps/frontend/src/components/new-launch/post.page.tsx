'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useIntegrationList } from '@vibeschedule/frontend/components/launches/helpers/use.integration.list';
import { fromUtc } from '@vibeschedule/frontend/components/layout/set.timezone';
import { AddEditModal } from '@vibeschedule/frontend/components/new-launch/add.edit.modal';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';

const Loading: FC = () => (
  <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
    <div className="flex flex-col gap-4">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  </div>
);

// the Posten tab: the post editor as a page, with the next free slot as date
export const PostPage: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const [round, setRound] = useState(0);
  const { data: integrations, isLoading } = useIntegrationList();
  const { data: slot, mutate: reloadSlot } = useSWR(
    '/posts/find-slot',
    async (path: string) => (await (await fetch(path)).json()).date as string,
    { revalidateOnFocus: false }
  );

  // the old editor goes away with the store, before the new one starts
  const startOver = useCallback(async () => {
    useLaunchStore.getState().reset();
    await reloadSlot();
    setRound((value) => value + 1);
  }, [reloadSlot]);

  if (isLoading || !slot) {
    return (
      <PageBody>
        <PageHeader
          title={t('compose')}
          description={t('editor_page_description')}
        />
        <Loading />
      </PageBody>
    );
  }

  if (!integrations?.length) {
    return (
      <PageBody>
        <PageHeader title={t('compose')} />
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{t('editor_no_channels_title')}</EmptyTitle>
            <EmptyDescription>{t('editor_no_channels')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PageBody>
    );
  }

  return (
    <AddEditModal
      key={round}
      variant="page"
      date={fromUtc(slot)}
      integrations={integrations}
      allIntegrations={integrations}
      mutate={() => undefined}
      reopenModal={() => undefined}
      onSaved={startOver}
    />
  );
};
