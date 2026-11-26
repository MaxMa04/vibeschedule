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
import { ProviderHandle } from '@vibeschedule/frontend/components/new-launch/providers/high.order.provider';
import React, { forwardRef, useImperativeHandle } from 'react';

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

export const providerFor = (identifier?: string) =>
  Providers.find((provider) => provider.identifier === identifier)?.component;

export interface ShowAllProvidersHandle {
  checkAllValid: () => Promise<Awaited<ReturnType<ProviderHandle['isValid']>>[]>;
}

// one settings form per selected channel; the forms render their settings
// and the preview into the editor layout (see slots.ts)
export const ShowAllProviders = forwardRef<ShowAllProvidersHandle>(
  (_props, ref) => {
    const selectedIntegrations = useLaunchStore(
      (state) => state.selectedIntegrations
    );

    useImperativeHandle(ref, () => ({
      checkAllValid: () =>
        Promise.all(
          selectedIntegrations.map((p) => p.ref!.current.isValid())
        ),
    }));

    return (
      <>
        {selectedIntegrations.map((integration) => {
          const ProviderComponent = providerFor(
            integration.integration.identifier
          );
          if (!ProviderComponent) {
            return null;
          }

          return (
            <ProviderComponent
              ref={integration.ref}
              key={integration.integration.id}
              id={integration.integration.id}
            />
          );
        })}
      </>
    );
  }
);
