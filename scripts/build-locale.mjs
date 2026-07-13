#!/usr/bin/env node
/**
 * build-locale.mjs — Merge all l10n .ini files into a single data.ini
 *
 * Maps original [en] / [de] / etc. section names to BCP-47 codes
 * used by the new iniParser. Output: transcribe-new/public/data.ini
 *
 * Run: node scripts/build-locale.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const L10N_DIR = path.resolve(__dirname, '../../transcribe/src/l10n');
const OUT_FILE = path.resolve(__dirname, '../public/data.ini');

// Map filename → BCP-47 language code used as [section] in combined file
const FILE_MAP = {
  '_english.ini': 'en-US',
  'arabic.ini': 'ar',
  'catalan.ini': 'ca',
  'chinese-simplified.ini': 'zh-CN',
  'chinese-traditional.ini': 'zh-TW',
  'danish.ini': 'da',
  'dutch.ini': 'nl',
  'filipino.ini': 'fil',
  'french.ini': 'fr',
  'german.ini': 'de',
  'greek.ini': 'el',
  'hindi.ini': 'hi',
  'indonesian.ini': 'id',
  'italian.ini': 'it',
  'japanese.ini': 'ja',
  'marathi.ini': 'mr',
  'norwegian.ini': 'no',
  'polish.ini': 'pl',
  'portuguese-br.ini': 'pt-BR',
  'portuguese.ini': 'pt',
  'romanian.ini': 'ro',
  'russian.ini': 'ru',
  'spanish.ini': 'es',
  'swedish.ini': 'sv',
  'tibetan.ini': 'bo',
  'turkish.ini': 'tr',
  'ukrainian.ini': 'uk',
  'vietnamese.ini': 'vi',
};

const sections = [];

for (const [filename, langCode] of Object.entries(FILE_MAP)) {
  const filePath = path.join(L10N_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[build-locale] Missing: ${filename}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace the original [lang] section header with BCP-47 code
  // Original files may have [en], [de], [fr] etc.
  content = content.replace(/^\[[^\]]+\]/m, `[${langCode}]`);

  sections.push(content.trim());
  console.log(`[build-locale] ✓ ${filename} → [${langCode}]`);
}

const output = sections.join('\n\n') + '\n';
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, output, 'utf8');

console.log(
  `\n[build-locale] Written ${sections.length} locales to ${OUT_FILE}`,
);
console.log(
  `[build-locale] Total size: ${(output.length / 1024).toFixed(1)} KB`,
);
