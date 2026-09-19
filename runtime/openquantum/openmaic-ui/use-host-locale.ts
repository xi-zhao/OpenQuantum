'use client';

import { useEffect } from 'react';
import { createLocaleMessage, languageFor, readLocaleMessage, LOCALE_CHANNEL } from '@/lib/openquantum-ui-locale.mjs';

export function isEmbedded() {
  return process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED === '1' && typeof window !== 'undefined' && window.parent !== window;
}

/** Harness owns the embedded preference; standalone storage is left intact. */
export function useHostLocale(i18n: { language: string; changeLanguage: (locale: string) => unknown }) {
  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_OPENQUANTUM_PARENT_ORIGIN;
    if (!isEmbedded() || !origin) return;
    const receive = (event: MessageEvent) => {
      const language = readLocaleMessage(event, window.parent, origin);
      if (language && i18n.language !== language.learningLocale) void i18n.changeLanguage(language.learningLocale);
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ channel: LOCALE_CHANNEL, type: 'ready' }, origin);
    return () => window.removeEventListener('message', receive);
  }, [i18n]);
  useEffect(() => {
    const language = languageFor(i18n.language);
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = language?.direction ?? 'ltr';
    document.title = language?.id === 'zh' ? '量子学习通 · OpenQuantum' : 'Quantum Learning · OpenQuantum';
  }, [i18n.language]);
}

export function requestHostLocale(locale: string) {
  const origin = process.env.NEXT_PUBLIC_OPENQUANTUM_PARENT_ORIGIN;
  if (!isEmbedded() || !origin) return false;
  const message = createLocaleMessage(locale, 'select');
  if (message) window.parent.postMessage(message, origin);
  return true;
}
