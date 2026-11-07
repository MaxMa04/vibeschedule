'use client';
import 'reflect-metadata';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import dayjs from 'dayjs';
import { FC, useEffect } from 'react';
import { makeId } from '@vibeschedule/nestjs-libraries/services/make.is';
import { ManageModal } from '@vibeschedule/frontend/components/new-launch/manage.modal';
import { Integrations } from '@vibeschedule/frontend/components/launches/calendar.context';
import { useShallow } from 'zustand/react/shallow';
import {
  fromUtc,
  newDayjs,
} from '@vibeschedule/frontend/components/layout/set.timezone';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  ExistingPost,
  useExistingData,
} from '@vibeschedule/frontend/components/launches/helpers/use.existing.data';

export interface AddEditModalProps {
  date: dayjs.Dayjs;
  integrations: Integrations[];
  allIntegrations?: Integrations[];
  selectedChannels?: string[];
  reopenModal: () => void;
  mutate: () => void;
  onlyValues?: Array<{
    content: string;
    image?: Array<{
      id: string;
      path: string;
    }>;
  }>;
}

// the editor works on html paragraphs, older or API posts can be plain text
const toHtml = (content: string) =>
  /<p[\s>]/i.test(content)
    ? content
    : content
        .split('\n')
        .map((line) => `<p>${line}</p>`)
        .join('');

const postValues = (posts: ExistingPost[]) =>
  posts.slice(0, 1).map((post) => ({
    id: post.id,
    content: toHtml(post.content),
    media: post.image,
  }));

export const AddEditModal: FC<AddEditModalProps> = (props) => {
  const { setAllIntegrations, setDate } = useLaunchStore(
    useShallow((state) => ({
      setAllIntegrations: state.setAllIntegrations,
      setDate: state.setDate,
    }))
  );

  const integrations = useLaunchStore((state) => state.integrations);
  useEffect(() => {
    setDate(props.date || newDayjs());
    setAllIntegrations(props.allIntegrations || []);
  }, []);

  if (!integrations.length) {
    return null;
  }

  return <AddEditModalInner {...props} />;
};

const AddEditModalInner: FC<AddEditModalProps> = (props) => {
  const existingData = useExistingData();
  const modal = useModals();
  const toaster = useToaster();
  const t = useT();
  const { addOrRemoveSelectedIntegration, selectedIntegrations, integrations } =
    useLaunchStore(
      useShallow((state) => ({
        integrations: state.integrations,
        selectedIntegrations: state.selectedIntegrations,
        addOrRemoveSelectedIntegration: state.addOrRemoveSelectedIntegration,
      }))
    );

  useEffect(() => {
    if (existingData.integration) {
      const integration = integrations.find(
        (i) => i.id === existingData.integration
      );
      if (!integration) {
        toaster.show(
          t('we_are_experiencing_some_difficulty_try_to_refresh_the_page'),
          'warning'
        );
        modal.closeAll();
        return;
      }
      addOrRemoveSelectedIntegration(integration, existingData.settings);

      // the other channels the post was created with
      for (const sibling of existingData.siblings || []) {
        const siblingIntegration = integrations.find(
          (i) => i.id === sibling.integration
        );
        if (siblingIntegration) {
          addOrRemoveSelectedIntegration(siblingIntegration, sibling.settings);
        }
      }
    }

    for (const channel of props.selectedChannels || []) {
      const integration = integrations.find((i) => i.id === channel);
      if (integration) {
        addOrRemoveSelectedIntegration(integration, {});
      }
    }
  }, []);

  if (existingData.integration && selectedIntegrations.length === 0) {
    return null;
  }

  return <AddEditModalValues {...props} />;
};

const AddEditModalValues: FC<AddEditModalProps> = (props) => {
  const existingData = useExistingData();
  const {
    reset,
    setGlobalValue,
    addRemoveInternal,
    setInternalValue,
    global,
    setCurrent,
    internal,
    setTags,
    selectedIntegrations,
    setChannelDate,
  } = useLaunchStore(
    useShallow((state) => ({
      reset: state.reset,
      setGlobalValue: state.setGlobalValue,
      addRemoveInternal: state.addRemoveInternal,
      setInternalValue: state.setInternalValue,
      setCurrent: state.setCurrent,
      global: state.global,
      internal: state.internal,
      setTags: state.setTags,
      selectedIntegrations: state.selectedIntegrations,
      setChannelDate: state.setChannelDate,
    }))
  );

  useEffect(() => {
    const first = props.onlyValues?.[0];
    setGlobalValue([
      {
        id: makeId(10),
        content: first ? toHtml(first.content) : '',
        media: first?.image || [],
      },
    ]);

    if (existingData.integration) {
      setTags(
        // @ts-ignore
        existingData.posts[0]?.tags?.map((p: any) => ({
          label: p.tag.name,
          value: p.tag.name,
        })) || []
      );

      addRemoveInternal(existingData.integration);
      setInternalValue(
        existingData.integration,
        postValues(existingData.posts)
      );

      // the other channels the post was created with, each with its own
      // content and date
      for (const sibling of existingData.siblings || []) {
        if (
          selectedIntegrations.some(
            (p) => p.integration.id === sibling.integration
          )
        ) {
          addRemoveInternal(sibling.integration);
          setInternalValue(sibling.integration, postValues(sibling.posts));
          setChannelDate(
            sibling.integration,
            fromUtc(sibling.posts[0].publishDate)
          );
        }
      }
      setCurrent(existingData.integration);
    }

    return () => {
      reset();
    };
  }, []);

  if (!global.length && !internal.length) {
    return null;
  }

  return <ManageModal {...props} />;
};
