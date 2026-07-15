/**
 * transliterationLanguages.ts — Metadata for all languages supported by
 * the phonetic input feature. Single source of truth for the settings
 * dropdown and the corresponding i18n keys.
 */

import type { TransliterationLang } from './transliteration';

export interface TransliterationLanguageMeta {
  code: TransliterationLang;
  /** i18n key, e.g. 'settings-phonetic-lang-hindi' */
  i18nKey: string;
}

export const TRANSLITERATION_LANGUAGES: TransliterationLanguageMeta[] = [
  { code: 'am-t-i0-und', i18nKey: 'settings-phonetic-lang-amharic' },
  { code: 'ar-t-i0-und', i18nKey: 'settings-phonetic-lang-arabic' },
  { code: 'be-t-i0-und', i18nKey: 'settings-phonetic-lang-belarusian' },
  { code: 'bn-t-i0-und', i18nKey: 'settings-phonetic-lang-bengali' },
  { code: 'bg-t-i0-und', i18nKey: 'settings-phonetic-lang-bulgarian' },
  { code: 'yue-hant-t-i0-und', i18nKey: 'settings-phonetic-lang-chinese-hk' },
  {
    code: 'zh-t-i0-pinyin',
    i18nKey: 'settings-phonetic-lang-chinese-simplified',
  },
  {
    code: 'zh-hant-t-i0-pinyin',
    i18nKey: 'settings-phonetic-lang-chinese-traditional',
  },
  { code: 'el-t-i0-und', i18nKey: 'settings-phonetic-lang-greek' },
  { code: 'gu-t-i0-und', i18nKey: 'settings-phonetic-lang-gujarati' },
  { code: 'he-t-i0-und', i18nKey: 'settings-phonetic-lang-hebrew' },
  { code: 'hi-t-i0-und', i18nKey: 'settings-phonetic-lang-hindi' },
  { code: 'kn-t-i0-und', i18nKey: 'settings-phonetic-lang-kannada' },
  { code: 'ml-t-i0-und', i18nKey: 'settings-phonetic-lang-malayalam' },
  { code: 'mr-t-i0-und', i18nKey: 'settings-phonetic-lang-marathi' },
  { code: 'ne-t-i0-und', i18nKey: 'settings-phonetic-lang-nepali' },
  { code: 'or-t-i0-und', i18nKey: 'settings-phonetic-lang-oriya' },
  { code: 'fa-t-i0-und', i18nKey: 'settings-phonetic-lang-persian' },
  { code: 'pa-t-i0-und', i18nKey: 'settings-phonetic-lang-punjabi' },
  { code: 'ru-t-i0-und', i18nKey: 'settings-phonetic-lang-russian' },
  { code: 'sa-t-i0-und', i18nKey: 'settings-phonetic-lang-sanskrit' },
  { code: 'sr-t-i0-und', i18nKey: 'settings-phonetic-lang-serbian' },
  { code: 'si-t-i0-und', i18nKey: 'settings-phonetic-lang-sinhalese' },
  { code: 'ta-t-i0-und', i18nKey: 'settings-phonetic-lang-tamil' },
  { code: 'te-t-i0-und', i18nKey: 'settings-phonetic-lang-telugu' },
  { code: 'th-t-i0-und', i18nKey: 'settings-phonetic-lang-thai' },
  { code: 'ti-t-i0-und', i18nKey: 'settings-phonetic-lang-tigrinya' },
  { code: 'uk-t-i0-und', i18nKey: 'settings-phonetic-lang-ukrainian' },
  { code: 'ur-t-i0-und', i18nKey: 'settings-phonetic-lang-urdu' },
];
