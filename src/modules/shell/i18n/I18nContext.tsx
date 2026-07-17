/**
 * I18nContext.tsx — React i18n context with hot-swap language support
 *
 * Each language lives in its own small file at /locales/{code}.ini and is
 * fetched only when it's actually selected — instead of one combined
 * data.ini containing every language. The default language (en-US) is
 * inlined into the JS bundle at build time (see scripts/build-locale.mjs),
 * so first load — or switching back to en-US — never needs a network
 * request, and there's no flash of raw i18n keys.
 *
 * Missing keys in any language fall back to en-US, same as before.
 * Fetched languages are cached in memory, so switching back and forth
 * between languages after the first load is instant.
 *
 * Usage:
 *   const { t, tHtml, lang, setLang } = useTranslation();
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import {
  parseIni,
  getTranslation,
  getHtmlTranslation,
  type ParsedLocale,
} from './iniParser';
import { STORAGE_KEYS } from '../../storage/storageKeys';
import {
  DEFAULT_LANG,
  DEFAULT_LOCALE_INI,
} from '../../../l10n/generated/defaultLocale';

interface I18nContextValue {
  /** Get a plain text translation */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Get an HTML translation (null if key has no HTML variant) */
  tHtml: (key: string) => string | null;
  /** Current language code */
  lang: string;
  /** Switch language (hot-swap, no reload) */
  setLang: (lang: string) => void;
  /** Is the locale for the CURRENT `lang` loaded? */
  ready: boolean;
  /** List of available language codes (from /locales/manifest.json) */
  availableLanguages: string[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

// en-US is available synchronously at module-load time — no fetch needed.
const defaultLocale: ParsedLocale = parseIni(DEFAULT_LOCALE_INI, DEFAULT_LANG);

// Module-level caches so switching languages back and forth never refetches
// or reparses anything after the first time.
const rawIniCache = new Map<string, string>();
const parsedLocaleCache = new Map<string, ParsedLocale>([
  [DEFAULT_LANG, defaultLocale],
]);

/** Fill in any key missing from `target` using the en-US locale. */
function mergeWithFallback(target: ParsedLocale): ParsedLocale {
  return {
    strings: { ...defaultLocale.strings, ...target.strings },
    html: { ...defaultLocale.html, ...target.html },
  };
}

async function fetchLangLocale(langCode: string): Promise<ParsedLocale> {
  const cached = parsedLocaleCache.get(langCode);
  if (cached) return cached;

  let raw = rawIniCache.get(langCode);
  if (!raw) {
    const res = await fetch(`/locales/${langCode}.ini`);
    if (!res.ok) {
      throw new Error(`Failed to load locale "${langCode}": ${res.status}`);
    }
    raw = await res.text();
    rawIniCache.set(langCode, raw);
  }

  const parsed = mergeWithFallback(parseIni(raw, langCode));
  parsedLocaleCache.set(langCode, parsed);
  return parsed;
}

async function fetchManifest(): Promise<string[]> {
  try {
    const res = await fetch('/locales/manifest.json');
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as string[];
  } catch (err) {
    console.warn('[i18n] Failed to load language manifest:', err);
    return [DEFAULT_LANG];
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.LANGUAGE) ?? DEFAULT_LANG,
  );
  const [locale, setLocale] = useState<ParsedLocale>(
    () => parsedLocaleCache.get(lang) ?? defaultLocale,
  );
  const [ready, setReady] = useState<boolean>(() =>
    parsedLocaleCache.has(lang),
  );
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([
    DEFAULT_LANG,
  ]);

  // Guards against a slow fetch for a language the user has since switched
  // away from overwriting the (now current) locale when it resolves late.
  const latestRequestedLang = useRef(lang);

  const loadLocale = useCallback(async (targetLang: string) => {
    latestRequestedLang.current = targetLang;

    const alreadyCached = parsedLocaleCache.get(targetLang);
    if (alreadyCached) {
      setLocale(alreadyCached);
      setReady(true);
      return;
    }

    // Keep showing the previous locale (never raw keys) while this loads.
    setReady(false);
    try {
      const parsed = await fetchLangLocale(targetLang);
      if (latestRequestedLang.current !== targetLang) return; // stale response
      setLocale(parsed);
      setReady(true);
    } catch (err) {
      console.warn('[i18n] Failed to load locale, falling back to en-US:', err);
      if (latestRequestedLang.current !== targetLang) return;
      setLocale(defaultLocale);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void loadLocale(lang);
  }, [lang, loadLocale]);

  useEffect(() => {
    void fetchManifest().then(setAvailableLanguages);
  }, []);

  const setLang = useCallback((newLang: string) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
    document.documentElement.setAttribute('lang', newLang);
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
