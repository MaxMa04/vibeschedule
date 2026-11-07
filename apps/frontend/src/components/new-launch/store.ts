'use client';

import { create } from 'zustand';
import dayjs from 'dayjs';
import { Integrations } from '@vibeschedule/frontend/components/launches/calendar.context';
import { createRef, RefObject } from 'react';
import { newDayjs } from '@vibeschedule/frontend/components/layout/set.timezone';

export interface Media {
  id: string;
  path: string;
}

// a post has exactly one value per channel, kept as a one-element array
// because the POST /posts payload and the previews take a list
export interface Values {
  id: string;
  content: string;
  media: Media[];
}

export interface Internal {
  integration: Integrations;
  integrationValue: Values[];
}

export interface SelectedIntegrations {
  settings: any;
  integration: Integrations;
  ref?: RefObject<any>;
}

interface StoreState {
  date: dayjs.Dayjs;
  // the other channels of an existing post, each with its own date
  channelDates: Record<string, dayjs.Dayjs>;
  totalChars: number;
  tags: { label: string; value: string }[];
  current: string;
  locked: boolean;
  hide: boolean;
  integrations: Integrations[];
  selectedIntegrations: SelectedIntegrations[];
  global: Values[];
  internal: Internal[];
  chars: Record<string, number>;
  setLocked: (locked: boolean) => void;
  setGlobalValue: (value: Values[]) => void;
  setInternalValue: (integrationId: string, value: Values[]) => void;
  addRemoveInternal: (integrationId: string) => void;
  setGlobalValueText: (content: string) => void;
  setInternalValueText: (integrationId: string, content: string) => void;
  setGlobalValueMedia: (media: Media[]) => void;
  setInternalValueMedia: (integrationId: string, media: Media[]) => void;
  appendGlobalValueMedia: (media: Media[]) => void;
  appendInternalValueMedia: (integrationId: string, media: Media[]) => void;
  setAllIntegrations: (integrations: Integrations[]) => void;
  setCurrent: (current: string) => void;
  addOrRemoveSelectedIntegration: (
    integration: Integrations,
    settings: any
  ) => void;
  reset: () => void;
  setSelectedIntegrations: (
    params: { selectedIntegrations: Integrations; settings: any }[]
  ) => void;
  setHide: (hide: boolean) => void;
  setDate: (date: dayjs.Dayjs) => void;
  setChannelDate: (integrationId: string, date: dayjs.Dayjs) => void;
  setTags: (tags: { label: string; value: string }[]) => void;
  setTotalChars: (totalChars: number) => void;
  setChars: (id: string, chars: number) => void;
}

const initialState = {
  date: newDayjs(),
  channelDates: {} as Record<string, dayjs.Dayjs>,
  tags: [] as { label: string; value: string }[],
  totalChars: 0,
  current: 'global',
  locked: false,
  hide: false,
  integrations: [] as Integrations[],
  selectedIntegrations: [] as SelectedIntegrations[],
  global: [] as Values[],
  internal: [] as Internal[],
  chars: {} as Record<string, number>,
};

const updateFirst = (values: Values[], update: Partial<Values>) =>
  values.map((value, index) => (index === 0 ? { ...value, ...update } : value));

const updateInternal = (
  internal: Internal[],
  integrationId: string,
  update: (values: Values[]) => Values[]
) =>
  internal.map((item) =>
    item.integration.id === integrationId
      ? { ...item, integrationValue: update(item.integrationValue) }
      : item
  );

export const useLaunchStore = create<StoreState>()((set) => ({
  ...initialState,
  setCurrent: (current) => set({ current }),
  addOrRemoveSelectedIntegration: (integration, settings) => {
    set((state) => {
      const existing = state.selectedIntegrations.find(
        (i) => i.integration.id === integration.id
      );

      if (existing) {
        const selectedList = state.selectedIntegrations.filter(
          (s) => s.integration.id !== existing.integration.id
        );

        return {
          ...(existing.integration.id === state.current ||
          selectedList.length === 0
            ? { current: 'global' }
            : {}),
          selectedIntegrations: selectedList,
        };
      }

      return {
        selectedIntegrations: [
          ...state.selectedIntegrations,
          { integration, settings, ref: createRef() },
        ],
      };
    });
  },
  addRemoveInternal: (integrationId) =>
    set((state) => {
      if (state.internal.some((i) => i.integration.id === integrationId)) {
        return {
          internal: state.internal.filter(
            (i) => i.integration.id !== integrationId
          ),
        };
      }

      const integration = state.selectedIntegrations.find(
        (i) => i.integration.id === integrationId
      )!.integration;

      return {
        internal: [
          ...state.internal,
          { integration, integrationValue: state.global.slice(0) },
        ],
      };
    }),
  setGlobalValue: (global) => set({ global }),
  setInternalValue: (integrationId, value) =>
    set((state) => ({
      internal: updateInternal(state.internal, integrationId, () => value),
    })),
  setGlobalValueText: (content) =>
    set((state) => ({ global: updateFirst(state.global, { content }) })),
  setInternalValueText: (integrationId, content) =>
    set((state) => ({
      internal: updateInternal(state.internal, integrationId, (values) =>
        updateFirst(values, { content })
      ),
    })),
  setGlobalValueMedia: (media) =>
    set((state) => ({ global: updateFirst(state.global, { media }) })),
  setInternalValueMedia: (integrationId, media) =>
    set((state) => ({
      internal: updateInternal(state.internal, integrationId, (values) =>
        updateFirst(values, { media })
      ),
    })),
  appendGlobalValueMedia: (media) =>
    set((state) => ({
      global: updateFirst(state.global, {
        media: [...state.global[0].media, ...media],
      }),
    })),
  appendInternalValueMedia: (integrationId, media) =>
    set((state) => ({
      internal: updateInternal(state.internal, integrationId, (values) =>
        updateFirst(values, { media: [...values[0].media, ...media] })
      ),
    })),
  reset: () => set(initialState),
  setAllIntegrations: (integrations) => set({ integrations }),
  setLocked: (locked) => set({ locked }),
  setHide: (hide) => set({ hide }),
  setDate: (date) => set({ date }),
  setChannelDate: (integrationId, date) =>
    set((state) => ({
      channelDates: { ...state.channelDates, [integrationId]: date },
    })),
  setTags: (tags) => set({ tags }),
  setSelectedIntegrations: (params) =>
    set({
      selectedIntegrations: params.map((p) => ({
        integration: p.selectedIntegrations,
        settings: p.settings,
        ref: createRef(),
      })),
    }),
  setTotalChars: (totalChars) => set({ totalChars }),
  setChars: (id, chars) =>
    set((state) => ({ chars: { ...state.chars, [id]: chars } })),
}));
