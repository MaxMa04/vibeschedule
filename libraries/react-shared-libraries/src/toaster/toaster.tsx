'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Toaster as SonnerToaster } from '@vibeschedule/frontend/components/ui/sonner';
import { modeEmitter } from '@vibeschedule/frontend/components/layout/mode.component';

const currentMode = () =>
  typeof document !== 'undefined' &&
  document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light';

// The app switches dark mode with a class on <html>, not through next-themes.
export const Toaster = () => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    setMode(currentMode());
    const update = (next: 'light' | 'dark') => setMode(next);
    modeEmitter.on('mode', update);
    return () => {
      modeEmitter.off('mode', update);
    };
  }, []);
  return <SonnerToaster theme={mode} position="top-center" />;
};

export const useToaster = () => {
  return {
    show: useCallback((text: string, type?: 'success' | 'warning') => {
      if (type === 'warning') {
        toast.warning(text);
        return;
      }
      toast.success(text);
    }, []),
  };
};
