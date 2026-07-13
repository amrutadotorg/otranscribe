/**
 * iniParser.ts — Parser for .ini locale files
 *
 * Replaces webl10n. Supports:
 * - Sections: [lang]
 * - Key=value pairs
 * - Keys with .innerHTML suffix (unsafe HTML values)
 * - Comments (lines starting with #)
 * - Multiple-value entries (last wins within section)
 *
 * See PLAN.md Faza 7, Risk R5
 */

export interface ParsedLocale {
  /** Plain text translations */
  strings: Record<string, string>;
  /** HTML translations (keys with .innerHTML suffix) */
  html: Record<string, string>;
}

/**
 * Parse a .ini file content for a specific language code.
 * Falls back to [en-US] if target lang section not found.
 */
export function parseIni(content: string, targetLang: string): ParsedLocale {
  const strings: Record<string, string> = {};
  const html: Record<string, string> = {};

  const lines = content.split('\n');
  let inTargetSection = false;
  let inEnSection = false;

  // We do two passes: collect English as fallback, then target lang
  const enStrings: Record<string, string> = {};
  const enHtml: Record<string, string> = {};

  let currentSection = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Comments and empty lines
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    // Section header [lang]
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1).trim();
      inTargetSection = currentSection === targetLang;
      inEnSection = currentSection === 'en-US' || currentSection === 'en';
      continue;
    }

    // Key=value
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();

    if (inTargetSection) {
      if (key.endsWith('.innerHTML')) {
        html[key.slice(0, -10)] = value;
      } else {
        strings[key] = value;
      }
    } else if (inEnSection) {
      if (key.endsWith('.innerHTML')) {
        enHtml[key.slice(0, -10)] = value;
      } else {
        enStrings[key] = value;
      }
    }
  }

  // Merge: target lang overrides English fallback
  return {
    strings: { ...enStrings, ...strings },
    html: { ...enHtml, ...html },
  };
}

/** Get a translation string with optional variable substitution */
export function getTranslation(
  locale: ParsedLocale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let val = locale.strings[key] ?? key; // Fall back to key if not found
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      val = val.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return val;
}

export function getHtmlTranslation(
  locale: ParsedLocale,
  key: string,
): string | null {
  return locale.html[key] ?? null;
}

/** Extract all language codes (section headers) from the ini content */
export function getAvailableLanguages(content: string): string[] {
  const langs = new Set<string>();
  const lines = content.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('[') && line.endsWith(']')) {
      langs.add(line.slice(1, -1).trim());
    }
  }
  return Array.from(langs);
}
