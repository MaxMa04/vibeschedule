'use client';

import { useCallback } from 'react';
import { create } from 'zustand';

// Each channel's provider component owns its settings form and renders the
// form and the preview into these places of the editor layout.
interface SlotsState {
  settings: Record<string, HTMLElement>;
  preview: HTMLElement | null;
  previewId: string | null;
  setSettings: (id: string, element: HTMLElement | null) => void;
  setPreview: (element: HTMLElement | null) => void;
  setPreviewId: (id: string | null) => void;
}

export const useEditorSlots = create<SlotsState>()((set) => ({
  settings: {},
  preview: null,
  previewId: null,
  setSettings: (id, element) =>
    set((state) => {
      if (element) {
        return state.settings[id] === element
          ? state
          : { settings: { ...state.settings, [id]: element } };
      }
      if (!state.settings[id]) {
        return state;
      }
      return {
        settings: Object.fromEntries(
          Object.entries(state.settings).filter(([key]) => key !== id)
        ),
      };
    }),
  setPreview: (preview) =>
    set((state) => (state.preview === preview ? state : { preview })),
  setPreviewId: (previewId) => set({ previewId }),
}));

export const useSettingsSlotRef = (id: string) => {
  const setSettings = useEditorSlots((state) => state.setSettings);
  return useCallback(
    (element: HTMLElement | null) => setSettings(id, element),
    [id, setSettings]
  );
};

export const usePreviewSlotRef = () => {
  const setPreview = useEditorSlots((state) => state.setPreview);
  return useCallback(
    (element: HTMLElement | null) => setPreview(element),
    [setPreview]
  );
};
