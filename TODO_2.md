# Ulepszenia po MVP: fonetyczne wpisywanie (transliteracja)

Dokument uzupełniający `TODO.md`. Zawiera ulepszenia do wdrożenia w kolejnym PR po stabilnym MVP. Nie blokują mergu, ale znacząco podnoszą UX i odporność.

---

## A. Dropdown wyboru kandydata

Zamiast automatycznie wstawiać pierwszego kandydata, pokaż popover z listą (np. 3-5 wyników), żeby użytkownik mógł wybrać właściwą transliterację. Wzorzec: `Tooltip.tsx` (floating UI, positioned relative to cursor).

**Zmiana w `PhoneticInputExtension.ts`:**

- Zamiast `candidates[0]` → pokaż popover z `candidates`
- Po wyborze (klik/Enter) → podmień słowo
- Po Escape → anuluj, zostaw łaciński tekst
- Timeout na popover: 5s → auto-escape, zostaw oryginał

**Tech debt do rozwiązania przy implementacji:**

- Cache key w serwerze nie uwzględnia `num` — dziś klient zawsze woła z `num=5`, ale dropdown może chcieć różnych `num` dla różnych kontekstów UI. Zmienić klucz na `${lang}:${num}:${text}`.

---

## B. Cache w IndexedDB po stronie klienta

Serwerowy `Map` cache jest tracony po restarcie serwera. Cache w `IndexedDB` po stronie klienta daje trwałość między sesjami (kluczowe dla PWA offline-first).

**Podejście:**

- Nowy moduł `src/modules/storage/transliterationCache.ts` (wzorzec: `vimeoCache.ts`)
- Klucz: `lang:text` → wartość: `string[]` kandydatów
- TTL: 7 dni (transliteracje się nie zmieniają)
- Limit: 5000 wpisów (~200 KB)
- Hit w cache → pomija request do serwera entirely
- Miss → fetch do `/api/transliterate` → zapis w cache

**Integracja w `transliteration.ts`:**

```ts
export async function transliterate(word, lang) {
  const cached = await getCachedCandidates(word, lang);
  if (cached) return cached;

  const result = await fetchFromServer(word, lang);
  if (result.length > 0) await setCachedCandidates(word, lang, result);
  return result;
}
```

---

## ✅ C. Rate-limiting na `/api/transliterate`

**Wdrożone w Fazie 1 MVP** — per-IP rate limiter (30 req/min) z `setInterval` cleanup i `.unref()`. Klient otrzymuje 429 przy przekroczeniu limitu. Nie wymaga dalszej pracy.
