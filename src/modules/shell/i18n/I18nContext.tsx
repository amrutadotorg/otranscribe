/**
 * I18nContext.tsx — React i18n context with hot-swap language support
 *
 * Loads .ini file from /data.ini, parses for the selected language.
 * Language change is instant (no page reload) — see PLAN.md section 7.
 *
 * Usage:
 *   const { t, tHtml, lang, setLang } = useTranslation();
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  parseIni,
  getTranslation,
  getHtmlTranslation,
  getAvailableLanguages,
  type ParsedLocale,
} from './iniParser';
import { STORAGE_KEYS } from '../../storage/storageKeys';

interface I18nContextValue {
  /** Get a plain text translation */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Get an HTML translation (null if key has no HTML variant) */
  tHtml: (key: string) => string | null;
  /** Current language code */
  lang: string;
  /** Switch language (hot-swap, no reload) */
  setLang: (lang: string) => void;
  /** Is the locale loaded? */
  ready: boolean;
  /** List of available language codes from data.ini */
  availableLanguages: string[];
}

const FALLBACK_LANG = 'en-US';

const I18nContext = createContext<I18nContextValue | null>(null);

let cachedIniContent: string | null = null;

async function loadIniFile(): Promise<string> {
  if (cachedIniContent !== null) return cachedIniContent;
  const res = await fetch('/data.ini');
  if (!res.ok) throw new Error(`Failed to load locale file: ${res.status}`);
  cachedIniContent = await res.text();
  return cachedIniContent;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.LANGUAGE) ?? FALLBACK_LANG,
  );
  const [locale, setLocale] = useState<ParsedLocale>({ strings: {}, html: {} });
  const [ready, setReady] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([
    'en-US',
  ]);

  const loadLocale = useCallback(async (targetLang: string) => {
    try {
      const iniContent = await loadIniFile();
      setAvailableLanguages(getAvailableLanguages(iniContent));
      const parsed = parseIni(iniContent, targetLang);
      setLocale(parsed);
      setReady(true);
    } catch (err) {
      console.warn('[i18n] Failed to load locale:', err);
      setReady(true); // App should still work with key fallbacks
    }
  }, []);

  useEffect(() => {
    void loadLocale(lang);
  }, [lang, loadLocale]);

  const setLang = useCallback((newLang: string) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
    document.documentElement.setAttribute('lang', newLang);
    // Invalidate cache so new lang is re-parsed
    cachedIniContent = null;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      getTranslation(locale, key, vars),
    [locale],
  );

  const tHtml = useCallback(
    (key: string) => getHtmlTranslation(locale, key),
    [locale],
  );

  return (
    <I18nContext.Provider
      value={{ t, tHtml, lang, setLang, ready, availableLanguages }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx)
    throw new Error('useTranslation must be used inside <I18nProvider>');
  return ctx;
}
