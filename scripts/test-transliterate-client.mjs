#!/usr/bin/env node
/**
 * test-transliterate-client.mjs — Standalone test client for Google Input Tools API.
 * Validates that inputtools.google.com/request returns proper transliteration
 * candidates before implementing the server proxy (Phase 1) and client module (Phase 2).
 *
 * Usage:
 *   node scripts/test-transliterate-client.mjs                 # Run all tests
 *   node scripts/test-transliterate-client.mjs --lang hi       # Test only Hindi
 *   node scripts/test-transliterate-client.mjs --text namaste  # Custom word
 *   node scripts/test-transliterate-client.mjs --num 8         # Request 8 candidates
 *   node scripts/test-transliterate-client.mjs --verbose       # Show full raw responses
 *
 * No npm dependencies — uses native Node 24 fetch.
 */

const GOOGLE_INPUTTOOLS_URL = 'https://inputtools.google.com/request';

// All 25 languages from TODO.md Phase 0
const TEST_LANGUAGES = [
  { code: 'am-t-i0-und',      name: 'Amharic',             testWord: 'selam',       script: 'Ethiopic' },
  { code: 'ar-t-i0-und',      name: 'Arabic',              testWord: 'marhaba',     script: 'Arabic' },
  { code: 'be-t-i0-und',      name: 'Belarusian',          testWord: 'privet',      script: 'Cyrillic' },
  { code: 'bn-t-i0-und',      name: 'Bengali',             testWord: 'namaskar',    script: 'Bengali' },
  { code: 'bg-t-i0-und',      name: 'Bulgarian',           testWord: 'zdravey',     script: 'Cyrillic' },
  { code: 'yue-hant-t-i0-und', name: 'Chinese (HK)',       testWord: 'neihou',      script: 'Chinese' },
  { code: 'zh-t-i0-pinyin',   name: 'Chinese (Simplified)', testWord: 'nihao',       script: 'Chinese' },
  { code: 'zh-hant-t-i0-pinyin', name: 'Chinese (Traditional)', testWord: 'nihao',     script: 'Chinese' },
  { code: 'el-t-i0-und',      name: 'Greek',               testWord: 'yassou',      script: 'Greek' },
  { code: 'gu-t-i0-und',      name: 'Gujarati',            testWord: 'namaste',     script: 'Gujarati' },
  { code: 'he-t-i0-und',      name: 'Hebrew',              testWord: 'shalom',      script: 'Hebrew' },
  { code: 'hi-t-i0-und',      name: 'Hindi',               testWord: 'namaste',     script: 'Devanagari' },
  { code: 'kn-t-i0-und',      name: 'Kannada',             testWord: 'namaskara',   script: 'Kannada' },
  { code: 'ml-t-i0-und',      name: 'Malayalam',           testWord: 'namaskaram',  script: 'Malayalam' },
  { code: 'mr-t-i0-und',      name: 'Marathi',             testWord: 'namaskar',    script: 'Devanagari' },
  { code: 'ne-t-i0-und',      name: 'Nepali',              testWord: 'namaste',     script: 'Devanagari' },
  { code: 'or-t-i0-und',      name: 'Oriya',               testWord: 'namaskar',    script: 'Odia' },
  { code: 'fa-t-i0-und',      name: 'Persian',             testWord: 'salam',       script: 'Arabic' },
  { code: 'pa-t-i0-und',      name: 'Punjabi',             testWord: 'namaste',     script: 'Gurmukhi' },
  { code: 'ru-t-i0-und',      name: 'Russian',             testWord: 'privet',      script: 'Cyrillic' },
  { code: 'sa-t-i0-und',      name: 'Sanskrit',            testWord: 'namaste',     script: 'Devanagari' },
  { code: 'sr-t-i0-und',      name: 'Serbian',             testWord: 'zdravo',      script: 'Cyrillic' },
  { code: 'si-t-i0-und',      name: 'Sinhalese',           testWord: 'ayubowan',    script: 'Sinhala' },
  { code: 'ta-t-i0-und',      name: 'Tamil',               testWord: 'vanakkam',    script: 'Tamil' },
  { code: 'te-t-i0-und',      name: 'Telugu',              testWord: 'namaskaram',  script: 'Telugu' },
  { code: 'th-t-i0-und',      name: 'Thai',                testWord: 'sawasdee',    script: 'Thai' },
  { code: 'ti-t-i0-und',      name: 'Tigrinya',            testWord: 'selam',       script: 'Ethiopic' },
  { code: 'uk-t-i0-und',      name: 'Ukrainian',           testWord: 'privit',      script: 'Cyrillic' },
  { code: 'ur-t-i0-und',      name: 'Urdu',                testWord: 'salam',       script: 'Arabic' },
];

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const onlyLang = getArg('--lang');      // e.g. "hi" or "hi-t-i0-und"
const customText = getArg('--text');    // e.g. "namaste"
const numResults = parseInt(getArg('--num') || '5', 10);
const verbose = hasFlag('--verbose');
const help = hasFlag('--help') || hasFlag('-h');

if (help) {
  console.log(`
Usage: node scripts/test-transliterate-client.mjs [options]

Options:
  --lang <code>    Test only one language (partial match, e.g. "hi" matches "hi-t-i0-und")
  --text <word>    Custom word to transliterate (overrides per-language test word)
  --num <n>        Number of candidates to request (default: 5)
  --verbose        Show full raw API response
  -h, --help       Show this help
`);
  process.exit(0);
}

// ── Core fetch function ───────────────────────────────────────────────────────
async function fetchTransliteration(text, lang, num = 5) {
  const url =
    `${GOOGLE_INPUTTOOLS_URL}?text=${encodeURIComponent(text)}` +
    `&itc=${lang}&num=${num}&cp=0&cs=1&ie=utf-8&oe=utf-8&app=otranscribe`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const raw = await res.json();
    const candidates = extractCandidates(raw);

    return {
      ok: res.ok,
      status: res.status,
      candidates,
      raw,
      latencyMs: null, // set by caller
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: 0,
      candidates: [],
      raw: null,
      error: err.name === 'AbortError' ? 'TIMEOUT (10s)' : err.message,
      latencyMs: null,
    };
  }
}

/**
 * Extract candidates from Google's undocumented response format:
 * [status, [[sourceText, [candidate1, candidate2, ...]]]]
 */
function extractCandidates(data) {
  try {
    const arr = data;
    const inner = arr[1];       // [[sourceText, [candidates]]]
    const entry = inner[0];     // [sourceText, [candidates]]
    const list = entry[1];      // [candidate1, candidate2, ...]
    return list.filter((c) => typeof c === 'string');
  } catch {
    return [];
  }
}

// ── Test runner ───────────────────────────────────────────────────────────────
async function runTest(lang) {
  const text = customText || lang.testWord;

  const start = performance.now();
  const result = await fetchTransliteration(text, lang.code, numResults);
  const latencyMs = Math.round(performance.now() - start);
  result.latencyMs = latencyMs;

  return { lang, text, result };
}

function printResult({ lang, text, result }, idx, total) {
  const prefix = `[${idx + 1}/${total}]`;
  const status = result.ok ? '✅' : '❌';

  console.log(`${status} ${prefix} ${lang.name} (${lang.code}) — "${text}"`);

  if (result.error) {
    console.log(`     ERROR: ${result.error}`);
    return;
  }

  if (result.candidates.length === 0) {
    console.log(`     WARNING: No candidates returned (status ${result.status})`);
    if (verbose && result.raw) {
      console.log(`     Raw: ${JSON.stringify(result.raw)}`);
    }
    return;
  }

  console.log(`     Candidates (${result.candidates.length}): ${result.candidates.join(', ')}`);
  console.log(`     Latency: ${result.latencyMs}ms | Status: ${result.status}`);

  if (verbose && result.raw) {
    console.log(`     Raw: ${JSON.stringify(result.raw)}`);
  }
}

// ── Multi-word test for Hindi (common transliteration scenario) ───────────────
async function runHindiPhraseTest() {
  console.log('\n─ Hindi phrase test: "namaste duniya" ─');
  const words = ['namaste', 'duniya'];
  const results = [];

  for (const word of words) {
    const start = performance.now();
    const result = await fetchTransliteration(word, 'hi-t-i0-und', 5);
    result.latencyMs = Math.round(performance.now() - start);
    results.push({ word, ...result });
  }

  for (const r of results) {
    console.log(`  "${r.word}" → ${r.candidates.length > 0 ? r.candidates[0] : '(empty)'} (${r.latencyMs}ms)`);
  }

  // Test compound word
  console.log('\n─ Compound word test: "mumbaitik" (should fail gracefully) ─');
  const compound = await fetchTransliteration('mumbaitik', 'hi-t-i0-und', 5);
  if (compound.candidates.length > 0) {
    console.log(`  Result: ${compound.candidates.join(', ')}`);
  } else {
    console.log('  No candidates (expected for non-word)');
  }
}

// ── Boundary tests ────────────────────────────────────────────────────────────
async function runBoundaryTests() {
  console.log('\n─ Boundary tests ─');

  // Empty text
  const empty = await fetchTransliteration('', 'hi-t-i0-und', 5);
  console.log(`  Empty text: status=${empty.status}, ok=${empty.ok}, candidates=${empty.candidates.length}`);

  // Very long text (> 64 chars — server limit)
  const longText = 'a'.repeat(100);
  const long = await fetchTransliteration(longText, 'hi-t-i0-und', 5);
  console.log(`  100-char text: status=${long.status}, ok=${long.ok}`);

  // Invalid language code
  const invalidLang = await fetchTransliteration('test', 'xx-invalid-xx', 5);
  console.log(`  Invalid lang: status=${invalidLang.status}, ok=${invalidLang.ok}`);

  // num=1 vs num=8
  const num1 = await fetchTransliteration('namaste', 'hi-t-i0-und', 1);
  const num8 = await fetchTransliteration('namaste', 'hi-t-i0-und', 8);
  console.log(`  num=1: ${num1.candidates.length} candidates`);
  console.log(`  num=8: ${num8.candidates.length} candidates`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Google Input Tools API — Transliteration Test Client   ║');
  console.log('║  Endpoint: inputtools.google.com/request                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Node: ${process.version}`);
  console.log(`  Mode: ${onlyLang ? `single lang (${onlyLang})` : 'all languages'}`);
  console.log(`  Word: ${customText || '(per-language defaults)'}`);
  console.log(`  Num:  ${numResults}`);
  console.log('');

  // Filter languages if --lang specified
  let langs = TEST_LANGUAGES;
  if (onlyLang) {
    langs = TEST_LANGUAGES.filter(
      (l) => l.code.includes(onlyLang) || l.name.toLowerCase().includes(onlyLang.toLowerCase()),
    );
    if (langs.length === 0) {
      console.error(`No language matching "${onlyLang}". Available codes:`);
      TEST_LANGUAGES.forEach((l) => console.log(`  ${l.code} — ${l.name}`));
      process.exit(1);
    }
  }

  // Run transliteration tests
  console.log('─ Transliteration tests ─');
  const results = [];
  for (const lang of langs) {
    results.push(await runTest(lang));
    // Small delay between requests to avoid rate limiting
    if (langs.length > 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log('');
  results.forEach((r, i) => printResult(r, i, results.length));

  // Summary
  const passed = results.filter((r) => r.result.ok && r.result.candidates.length > 0).length;
  const failed = results.length - passed;
  console.log(`\n── Summary ──`);
  console.log(`  Total:   ${results.length}`);
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);

  if (failed > 0) {
    console.log('\nFailed languages:');
    results
      .filter((r) => !r.result.ok || r.result.candidates.length === 0)
      .forEach((r) => {
        const reason = r.result.error || `empty candidates (status ${r.result.status})`;
        console.log(`  ❌ ${r.lang.name} (${r.lang.code}): ${reason}`);
      });
  }

  // Extra tests
  if (!onlyLang || langs.length === TEST_LANGUAGES.length) {
    await runBoundaryTests();
    await runHindiPhraseTest();
  }

  // Final verdict
  console.log('\n── Verdict ──');
  if (failed === 0) {
    console.log('  ✅ All languages return valid transliteration candidates.');
    console.log('  → Phase 1 (server proxy) and Phase 2 (client module) assumptions are VALID.');
  } else {
    console.log(`  ⚠️  ${failed} language(s) failed — review before proceeding.`);
    console.log('  → Check if API is down or if specific language codes need adjustment.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
