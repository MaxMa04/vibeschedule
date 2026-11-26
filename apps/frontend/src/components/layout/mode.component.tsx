'use client';

import { useCallback } from 'react';
import useCookie from 'react-use-cookie';
import EventEmitter from 'events';

export const modeEmitter = new EventEmitter();

// The server renders the class from the "mode" cookie onto <html>.
export const useThemeMode = () => {
  const [mode, setMode] = useCookie('mode', 'light');

  const toggle = useCallback(() => {
    const next = mode === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(next);
    setMode(next, { days: 365 });
    modeEmitter.emit('mode', next);
  }, [mode]);

  return { mode: mode === 'dark' ? 'dark' : 'light', toggle } as const;
};
