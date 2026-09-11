'use client';

import { useEffect, useState } from 'react';
import { readThemeMessage, THEME_CHANNEL, THEME_TOKENS } from '@/lib/openquantum-ui-theme.mjs';

/** Follow the owning app without overwriting the standalone appearance preference. */
export function useHostTheme(enabled: boolean) {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_OPENQUANTUM_PARENT_ORIGIN;
    if (!enabled || process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED !== '1' || !origin || window.parent === window) return;
    const root = document.documentElement;
    const receive = (event: MessageEvent) => {
      const message = readThemeMessage(event, window.parent, origin);
      if (!message) return;
      for (const name of Object.keys(THEME_TOKENS)) {
        const value = message.tokens[name];
        if (value) root.style.setProperty(name, value);
        else root.style.removeProperty(name);
      }
      root.dataset.oqHostTheme = message.colorScheme;
      setTheme(message.colorScheme);
    };
    window.addEventListener('message', receive);
    // The listener is ready before the parent sends the initial snapshot.
    window.parent.postMessage({ channel: THEME_CHANNEL, type: 'ready' }, origin);
    return () => {
      window.removeEventListener('message', receive);
      delete root.dataset.oqHostTheme;
      for (const name of Object.keys(THEME_TOKENS)) root.style.removeProperty(name);
    };
  }, [enabled]);
  return theme;
}
