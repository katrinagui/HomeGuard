// Locale state + translation helpers. The locale persists to localStorage and
// defaults from the browser language. Components call translate()/tMsg() with
// the current locale; data layers only ever carry Msg objects (key + params).

import { create } from 'zustand';
import { STRINGS } from './strings';

export type Locale = 'zh' | 'en';

export interface Msg {
  key: string;
  params?: Record<string, string | number>;
}

export function translate(
  key: string,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  const dict = STRINGS[locale] as Record<string, string>;
  const fallback = STRINGS.zh as Record<string, string>;
  let s = dict[key] ?? fallback[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

/** Resolve a data-layer message (or pass a plain string through). */
export function tMsg(msg: Msg | string | null | undefined, locale: Locale): string {
  if (msg === null || msg === undefined || msg === '') return '';
  if (typeof msg === 'string') return msg;
  return translate(msg.key, locale, msg.params);
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem('homeguard.locale');
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {
    // storage unavailable — fall through to browser language
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const initialLocale = detectLocale();

export const useLocale = create<LocaleState>((set) => ({
  locale: initialLocale,
  setLocale: (locale) => {
    try {
      localStorage.setItem('homeguard.locale', locale);
    } catch {
      // private mode etc. — the toggle still works for this page view
    }
    applyDocumentLanguage(locale);
    set({ locale });
  },
}));

function applyDocumentLanguage(locale: Locale): void {
  document.title = translate('app.title', locale);
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
}

applyDocumentLanguage(initialLocale);
