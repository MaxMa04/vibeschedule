'use client';

import XProvider from '@vibeschedule/frontend/components/new-launch/providers/x/x.provider';
import LinkedinProvider from '@vibeschedule/frontend/components/new-launch/providers/linkedin/linkedin.provider';
import FacebookProvider from '@vibeschedule/frontend/components/new-launch/providers/facebook/facebook.provider';
import InstagramProvider from '@vibeschedule/frontend/components/new-launch/providers/instagram/instagram.collaborators';
import YoutubeProvider from '@vibeschedule/frontend/components/new-launch/providers/youtube/youtube.provider';
import TiktokProvider from '@vibeschedule/frontend/components/new-launch/providers/tiktok/tiktok.provider';
import PinterestProvider from '@vibeschedule/frontend/components/new-launch/providers/pinterest/pinterest.provider';
import ThreadsProvider from '@vibeschedule/frontend/components/new-launch/providers/threads/threads.provider';
import BlueskyProvider from '@vibeschedule/frontend/components/new-launch/providers/bluesky/bluesky.provider';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import React, { FC, forwardRef, useImperativeHandle } from 'react';
import { GeneralPreviewComponent } from '@vibeschedule/frontend/components/launches/general.preview.component';
import { IntegrationContext } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

// keyed by PfM platform
export const Providers = [
  { identifier: 'x', component: XProvider },
  { identifier: 'linkedin', component: LinkedinProvider },
  { identifier: 'facebook', component: FacebookProvider },
  { identifier: 'instagram', component: InstagramProvider },
  { identifier: 'youtube', component: YoutubeProvider },
  { identifier: 'tiktok', component: TiktokProvider },
  { identifier: 'tiktok_business', component: TiktokProvider },
  { identifier: 'pinterest', component: PinterestProvider },
  { identifier: 'threads', component: ThreadsProvider },
  { identifier: 'bluesky', component: BlueskyProvider },
];

export const ShowAllProviders = forwardRef((props, ref) => {
  const { date, current, global, selectedIntegrations, allIntegrations } =
    useLaunchStore(
      useShallow((state) => ({
        date: state.date,
        selectedIntegrations: state.selectedIntegrations,
        allIntegrations: state.integrations,
        current: state.current,
        global: state.global,
      }))
    );

  const t = useT();

  useImperativeHandle(ref, () => ({
    checkAllValid: async () => {
      return Promise.all(
        selectedIntegrations.map(async (p) => await p.ref?.current.isValid())
      );
    },
    getAllValues: async () => {
      return Promise.all(
        selectedIntegrations.map(async (p) => await p.ref?.current.getValues())
      );
    },
    triggerAll: () => {
      return selectedIntegrations.map(
        async (p) => await p.ref?.current.trigger()
      );
    },
  }));

  return (
    <div className="w-full flex flex-col flex-1">
      {current === 'global' && (
        <IntegrationContext.Provider
          value={{
            date,
            integration:
              selectedIntegrations?.[0]?.integration || allIntegrations?.[0],
            allIntegrations: selectedIntegrations.map((p) => p.integration),
            value: global.map((p) => ({
              id: p.id,
              content: p.content,
              image: p.media,
            })),
          }}
        >
          {global?.[0]?.content?.length === 0 ? (
            <div>{t('start_writing_your_post')}</div>
          ) : (
            <div className="border border-borderPreview rounded-[20px] shadow-previewShadow">
              <GeneralPreviewComponent maximumCharacters={100000000} />
            </div>
          )}
        </IntegrationContext.Provider>
      )}
      {selectedIntegrations.map((integration) => {
        const { component: ProviderComponent } = Providers.find(
          (provider) =>
            provider.identifier === integration.integration.identifier
        ) || {
          component: Empty,
        };

        return (
          <ProviderComponent
            ref={integration.ref}
            key={integration.integration.id}
            id={integration.integration.id}
          />
        );
      })}
    </div>
  );
});

export const Empty: FC = () => {
  return null;
};
