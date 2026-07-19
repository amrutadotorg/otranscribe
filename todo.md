# Audyt techniczny — `amrutadotorg/otranscribe`

**Data audytu:** 19 lipca 2026
**Zakres:** pełne repozytorium (branch `main`, stan na dzień klonowania)
**Metoda:** analiza statyczna kodu + faktyczne uruchomienie narzędzi projektu w izolowanym środowisku (`npm ci`, `npm run lint`, `npm run format:check`, `tsc -b`, `vitest run`, `npm run build`, `npm audit`, `npm outdated`, próba `knip`). Żaden plik źródłowy nie został zmieniony — poniżej wyłącznie ustalenia i rekomendacje.

---

## 0. Uwaga metodologiczna — ważne przed lekturą

Zlecenie audytu zakładało typowy, długo łatany backend Node.js (MVC, zapytania SQL rozsiane po kodzie, `moment` vs `dayjs`, itp.). **Rzeczywisty projekt ma inny profil** i część punktów z brief-u z tego powodu nie ma zastosowania — zamiast pomijać je milczeniem, zaznaczam to explicite, żeby raport był wiarygodny, a nie "dopasowany na siłę" do założeń:

- To jest aplikacja **React 19 + TypeScript 6 (SPA/PWA) budowana Vite 8**, z **niewielkim serwerem Express 5** pełniącym rolę: (a) serwowania zbudowanej paczki statycznej, (b) middleware SSO (weryfikacja podpisanego ciasteczka z WordPressa), (c) dwóch proxy do zewnętrznych API (Vimeo, Google Input Tools).
- **Nie ma bazy danych** — trwałość danych to `localStorage` i `IndexedDB` w przeglądarce. Sekcje dot. SQL/NoSQL injection, N+1, indeksów, migracji DB — nie dotyczą tego projektu.
- Wersja `3.0.0` w `package.json` oraz README wprost mówią, że to **przepisanie od zera na nowoczesnym stacku** ("rewritten from scratch"), a nie organicznie narosły przez lata monolit. Historia commitów w klonowanym repo jest płytka (`--depth 1`), więc nie oceniałem tempa/rodzaju zmian w czasie — wnioski o "wielokrotnym łataniu" opierają się wyłącznie na śladach widocznych w obecnym stanie kodu (patrz sekcja 3).
- Projekt ma **wyjątkowo dojrzałe DX jak na ten rozmiar**: `AGENTS.md` ze szczegółowymi konwencjami, CI z lintem/testami/buildem/Dockerem, Dependabot, `knip` do martwego kodu. To podnosi ogólną ocenę względem "typowego" audytowanego projektu — ale nie zwalnia z rygoru audytu; poniżej i tak znalazłem konkretne, weryfikowalne problemy, w tym jeden realny problem bezpieczeństwa.

Jedno zastrzeżenie środowiskowe: `npx knip` **nie uruchomił się** w moim środowisku (natywny moduł `oxc-parser` rzuca `RangeError: Array buffer allocation failed` — najpewniej niezgodność ABI, bo sandbox ma Node 22, a projekt wymaga Node ≥24). CI repozytorium uruchamia `knip` na Node z `.nvmrc` (24.18.0) i best wiedza mówi, że przechodzi — nie mogłem tego jednak niezależnie zweryfikować i warto to potraktować jako lukę w moim pokryciu, nie w projekcie.

---

## 1. Rozpoznanie projektu

|                                |                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework/runtime              | React 19 + TypeScript 6, Vite 8 (frontend); Express 5 (mikro-serwer)                                                                                                                                                                                                                                                                                       |
| Wzorzec architektoniczny       | Moduły domenowe (`src/modules/*`) + komponenty prezentacyjne (`src/components/*`) + Context API do stanu globalnego. Brak Reduxa/Zustand — zgodnie z deklaracją w `AGENTS.md`. Serwer: kilka pojedynczych handlerów Express, bez warstwy service/repository (nie jest potrzebna przy tej skali — brak logiki biznesowej wymagającej takiego rozdzielenia). |
| Uruchamianie                   | `npm run dev` (Vite) + `npm run dev:server` (Express) osobno; produkcyjnie: `tsc -b && vite build` → `dist/`, `tsc --project tsconfig.node.json` → `dist-server/`, serwowane przez `node dist-server/index.js` w kontenerze Docker za nginx.                                                                                                               |
| Główne domeny                  | odtwarzacz audio/wideo (`audio-engine`), edytor tekstu z osią czasu (`editor`, TipTap), import/eksport `.otr` (`file-io`), ustawienia (`settings`), backup/autosave/cache (`storage`), i18n (`shell/i18n`), proxy serwerowe (`server`).                                                                                                                    |
| Zgodność z zamierzonym wzorcem | **W dużej mierze tak.** Jest to jeden z niewielu projektów w tej wielkości, gdzie kod faktycznie trzyma się opisanych w dokumentacji konwencji (funkcyjne komponenty, `Props` interfejsy, `import type`, brak `enum`, centralne `STORAGE_KEYS`). Odstępstwa opisane w sekcjach 2–4 poniżej.                                                                |

---

## 2. Architektura i struktura kodu

**[PRIORYTET: Średni] `StartView.tsx` jako komponent-molocha łączący 4 niezależne przepływy**
Lokalizacja: `src/components/StartView.tsx` (684 linii — największy plik w repo, jedyny przekraczający 500 linii)
Opis: Komponent obsługuje w jednym pliku cztery w pełni odrębne przepływy ładowania mediów (plik lokalny, YouTube, Vimeo z pobieraniem i progresem, import `.otr`), każdy z własnym stanem błędu, handlerem i logiką nawigacji między widokami. Skutkuje to dużą liczbą blisko niepowiązanych ze sobą `useState`/`useCallback` w jednym miejscu i utrudnia zmianę jednego przepływu bez ryzyka wpłynięcia na pozostałe.
Rekomendacja: Wydzielić każdy przepływ do osobnego hooka (`useLocalFileLoader`, `useYouTubeLoader`, `useVimeoLoader`, `useOtrImport`) zwracającego `{ load, loading, error }`, a `StartView` sprowadzić do warstwy prezentacyjnej, która je składa. Nie zmienia to zachowania, więc jest bezpieczne przy dobrym pokryciu testami e2e (patrz sekcja 7).
Szacowany nakład: M

**[PRIORYTET: Średni] Systemowe użycie inline `style={{...}}` sprzeczne z własną konwencją stylowania**
Lokalizacja: całościowo, głównie `src/components/StartView.tsx` (21 wystąpień), `SettingsPanel.tsx` (18), `BackupPanel.tsx` (13) — łącznie 81 wystąpień `style={{` w komponentach
Opis: `AGENTS.md` jasno definiuje konwencję: _"Plain CSS with CSS Custom Properties (...) Inline styles used sparingly for dynamic values"_. W praktyce spora część UI (statyczne przyciski, banery, obramowania, paddingi) jest stylowana inline'owymi obiektami referencującymi te same zmienne CSS (`var(--color-danger)`, `var(--radius-sm)` itd.), które równie dobrze mogłyby być klasami w `index.css`. To typowy ślad rozwoju iteracyjnego "dodaj UI szybko" — działa, ale rozjeżdża się z deklarowaną architekturą i utrudnia spójne zmiany wizualne (np. zmiana promienia zaokrąglenia przycisków wymaga edycji w kilkunastu miejscach zamiast jednej klasy).
Rekomendacja: Przenieść statyczne style do klas w `index.css` (BEM-podobnie, zgodnie z resztą pliku), zostawiając inline wyłącznie dla wartości faktycznie dynamicznych (szerokość paska postępu, kolor zależny od stanu). Robić to stopniowo, plik po pliku, z testem wizualnym/e2e jako siatką bezpieczeństwa.
Szacowany nakład: M

**[PRIORYTET: Niski] Martwy, pusty warunek bez efektu**
Lokalizacja: `src/modules/file-io/importFile.ts:20-22`
Opis:

```ts
if (!file.name.endsWith('.otr') && file.type !== 'application/json') {
  // Accept anyway — .otr is just JSON
}
```

Warunek jest sprawdzany, ale ciało bloku jest puste — kod nie ma żadnego efektu runtime. To pozostałość po wcześniejszej walidacji, którą ktoś świadomie wyłączył, nie usuwając struktury `if`. Mylące dla kolejnego developera (wygląda jak niedokończona walidacja).
Rekomendacja: Usunąć cały blok `if` i zostawić samo zdanie w komentarzu nad `FileReader`, np. `// .otr files are plain JSON — no MIME/extension check needed`.
Szacowany nakład: S

Pozytywnie: brak wykrytych zależności cyklicznych, brak "bożych obiektów" poza `StartView.tsx`, brak duplikatów logiki typu `foo`/`fooV2`/`foo_old` (patrz też sekcja 3) — podział na moduły domenowe jest w większości spójny i przestrzegany.

---

## 3. Ślady wielokrotnych poprawek ("łatania")

W kodzie źródłowym (`src/**/*.ts(x)`) **nie znalazłem ani jednego** `TODO`, `FIXME`, `HACK`, `XXX`, zakomentowanego bloku kodu, użycia `eslint-disable` ani `as any`/`: any`. To nietypowo czysty wynik i sam w sobie jest wartościową informacją o kulturze inżynierskiej repo (albo o tym, że dług jest sprzątany na bieżąco, a nie odkładany za komentarzem). Ślady iteracyjnego rozwoju widać za to w **dokumentacji i konfiguracji**, a nie w logice:

**[PRIORYTET: Niski] `knip.json` odwołuje się do nieistniejącego pliku**
Lokalizacja: `knip.json` (`"ignore": [..., "scripts/test-transliterate-client.mjs"]`)
Opis: Plik `scripts/test-transliterate-client.mjs` nie istnieje w repozytorium (katalog `scripts/` zawiera wyłącznie `build-locale.mjs`). To ślad tymczasowego skryptu do ręcznego testowania funkcji transliteracji (wspomnianej w `TODO_2.md`/`AGENTS.md` jako "Faza 0-5"), który został usunięty, ale wpis w konfiguracji `knip` nie został posprzątany.
Rekomendacja: Usunąć martwy wpis z `knip.json`.
Szacowany nakład: S

**[PRIORYTET: Niski] Dokumentacja opisuje plik, którego już nie ma**
Lokalizacja: `AGENTS.md` (sekcja "Directory Structure": `src/App.css # (Legacy styles, mostly moved to index.css)`)
Opis: `src/App.css` nie istnieje — style zostały w całości scalone do `src/index.css` (889 linii). Dokumentacja nie została zaktualizowana po tej konsolidacji.
Rekomendacja: Usunąć linię z `AGENTS.md`.
Szacowany nakład: S

**[PRIORYTET: Niski] Dokumentacja odwołuje się do plików `.env.example` i `docker-compose.yml`, których nie ma w repo**
Lokalizacja: `README.md` (`cp .env.example .env`, `docker compose build/up`), `AGENTS.md` (te same polecenia)
Opis: Ani `.env.example`, ani `docker-compose.yml`/`.yaml` nie znajdują się w repozytorium. Możliwe, że `docker-compose.yml` celowo żyje w osobnym, prywatnym repo infrastruktury (co byłoby rozsądne), ale wtedy README nie powinno sugerować, że jest on lokalnie dostępny — to realnie blokuje nowego developera podczas onboardingu (sekcja 10).
Rekomendacja: Dodać `.env.example` z pustymi/przykładowymi wartościami trzech zmiennych z sekcji "Environment Variables" w `AGENTS.md`; doprecyzować w README, gdzie faktycznie żyje `docker-compose.yml`, jeśli nie w tym repo.
Szacowany nakład: S

**[PRIORYTET: Średni] Podniesiony limit ostrzeżenia o rozmiarze chunku zamiast realnego code-splittingu**
Lokalizacja: `vite.config.ts` (`chunkSizeWarningLimit: 1000`, z komentarzem "Silence chunk size warning — TipTap is large but loaded once")
Opis: Komentarz wprost mówi, że limit podniesiono, żeby wyciszyć ostrzeżenie Vite, zamiast adresować przyczynę. Jednocześnie `AGENTS.md` zaleca: _"Use dynamic imports for large optional features (e.g., YouTube iframe API)"_ — a w całym `src/` nie ma ani jednego `import()`. Build produkuje jeden bundle JS **719 KB (227 KB gzip)**, mimo że TipTap, ikony Tabler i YouTube API są potrzebne tylko w części przepływów (edycja, konkretne źródło mediów). Widać rozjazd między udokumentowaną intencją a stanem faktycznym — klasyczny ślad "naprawiliśmy objaw (ostrzeżenie), nie przyczynę".
Rekomendacja: patrz sekcja 8 (Wydajność) — to ten sam problem z perspektywy wydajności.
Szacowany nakład: M

---

## 4. Jakość kodu i utrzymywalność

- **Linter/formatter:** ESLint (flat config, `typescript-eslint` recommended + Prettier) i Prettier są skonfigurowane **i faktycznie egzekwowane** — `npm run lint` oraz `npm run format:check` przechodzą bez ostrzeżeń na obecnym stanie kodu, a oba są krokami blokującymi w CI. To rzadkość i zasługuje na uznanie.
- **Obsługa błędów:** spójna na poziomie modułów — każdy handler serwerowy ma własny `try/catch` z sensownym kodem HTTP i logiem; strona kliencka konsekwentnie łapie błędy per-akcja (`setLoadError` + `console.error`) zamiast połykać je cicho. Brak globalnego error-boundary w React (`ErrorBoundary`) — pojedynczy nieobsłużony wyjątek renderowania może wybielić cały ekran zamiast pokazać komunikat.
- **Asynchroniczność:** poprawne użycie `async/await`, brak wykrytych "wiszących" Promise. Warto odnotować świadome, dobrze udokumentowane użycie `flushSync` w `PlayerContext.tsx` do zapobiegania race condition przy montowaniu playera — to niestandardowe, ale opisane wprost w `AGENTS.md` jako celowe ("Do not remove").
- **Walidacja danych wejściowych:** ad-hoc, ręczna, ale konsekwentna — bez biblioteki typu Zod/Joi. Przy obecnych 2 endpointach to nie problem; przy wzroście liczby endpointów warto rozważyć wspólny schemat walidacji (patrz niżej).
- **Typowanie:** TypeScript strict mode włączony (`tsconfig.app.json`, `tsconfig.node.json`), **zero wystąpień `any`** w całym `src/`. `tsc -b` przechodzi bez błędów.

**[PRIORYTET: Niski] Reguła `no-explicit-any` jako `warn`, nie `error`**
Lokalizacja: `eslint.config.js`
Opis: Reguła jest ustawiona na `'warn'`, więc CI (`npm run lint`) jej nie zablokuje, jeśli ktoś doda `any` w przyszłości — obecny stan (0 wystąpień) to efekt dyscypliny zespołu, nie wymuszenia narzędziowego.
Rekomendacja: Podnieść do `'error'`, skoro projekt i tak deklaruje w `AGENTS.md` zasadę "no `any`".
Szacowany nakład: S

**[PRIORYTET: Niski] `scripts/**` wyłączone z lintowania**
Lokalizacja: `eslint.config.js` (`ignores: [..., 'scripts/**']`)
Opis: `scripts/build-locale.mjs` generuje pliki lokalizacji trafiające do produkcyjnego builda (`public/locales/*.ini`), ale nie jest objęty lintem/formatowaniem.
Rekomendacja: Usunąć `scripts/**` z listy ignorowanych albo świadomie udokumentować powód wyłączenia (jeśli to np. inny styl modułów Node).
Szacowany nakład: S

**[PRIORYTET: Średni] Brak scentralizowanej, deklaratywnej walidacji wejścia na serwerze**
Lokalizacja: `src/server/transliterateProxy.ts`, `src/server/vimeoProxy.ts`
Opis: Każdy handler waliduje ręcznie (`typeof`, długość, allow-list, regex) — działa poprawnie dziś, ale przy dodaniu kolejnych endpointów łatwo o niespójność (np. jeden endpoint zapomni sprawdzić typ parametru). To bezpośrednio ryzyko wskazane w brief-ie audytu ("czy walidacja jest systematyczna czy ad-hoc") — tutaj jest ad-hoc, choć obecnie kompletna.
Rekomendacja: Przy kolejnym endpoincie rozważyć lekki schemat walidacji (np. Zod, które i tak dobrze integruje się z TypeScript) dla parametrów `query`/`body`.
Szacowany nakład: M

---

## 5. Bezpieczeństwo

**[PRIORYTET: Wysoki] Rate limiter per-IP można ominąć przez spoofing `X-Forwarded-For`**
Lokalizacja: `src/server/transliterateProxy.ts:84-90`

```ts
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown'
  );
}
```

Opis: Kod bierze **pierwszy** adres z nagłówka `X-Forwarded-For`, ale Express nigdzie nie ma ustawionego `app.set('trust proxy', ...)` (sprawdziłem `src/server/index.ts` — brak). W standardowym łańcuchu `klient → nginx → Express`, nginx zwykle _dopisuje_ realny adres klienta na końcu listy (`proxy_add_x_forwarded_for`), nie nadpisując wartości przychodzącej od klienta — czyli **pierwszy element listy pozostaje w pełni kontrolowany przez atakującego**. Każdy klient może więc wysyłać losowy fałszywy adres w tym nagłówku przy każdym żądaniu i całkowicie ominąć limit 30 żądań/minutę, który został specjalnie zaprojektowany (LRU cache + circuit breaker + rate limiter — dobrze przemyślany kod) właśnie po to, by chronić przed banem adresu serwera przez Google i przed nadużyciem. Efekt: mechanizm ochronny istnieje, ale w obecnej konfiguracji sieciowej można go trywialnie obejść.
Rekomendacja: Ustawić `app.set('trust proxy', N)` z liczbą odpowiadającą realnej topologii (liczba proxy przed Express — zwykle `1` dla pojedynczego nginx) i używać wbudowanego `req.ip` (Express poprawnie parsuje wtedy `X-Forwarded-For` od końca listy, licząc zaufane hopy), zamiast ręcznego `split(',')[0]`. Bez `trust proxy` bezpieczniej byłoby użyć samego `req.socket.remoteAddress` (adresu bezpośredniego połączenia TCP, którego nie da się podrobić) niż ufać jakiemukolwiek nagłówkowi.
Szacowany nakład: S

**[PRIORYTET: Średni] Brak rate limitingu na `/api/vimeo/download`**
Lokalizacja: `src/server/vimeoProxy.ts` (cały plik), `src/server/index.ts:31`
Opis: W przeciwieństwie do `/api/transliterate`, endpoint pobierania z Vimeo nie ma żadnego ograniczenia częstotliwości. Jest wprawdzie chroniony przez SSO (middleware globalny w `index.ts`), więc wymaga ważnego ciasteczka WordPressa — ale zalogowany użytkownik (albo ktoś, kto przejmie/odtworzy ciasteczko) może wywoływać ten endpoint dowolnie często, co zużywa limity API Vimeo oraz pasmo serwera przy streamowaniu dużych plików wideo.
Rekomendacja: Dodać prosty rate limiter analogiczny do tego w `transliterateProxy.ts` (ten sam wzorzec kodu można wyekstrahować do wspólnego modułu — patrz też rekomendacja w sekcji 2 o duplikacji).
Szacowany nakład: S

**[PRIORYTET: Średni] `deepMerge` w ustawieniach nie filtruje niebezpiecznych kluczy (`__proto__`, `constructor`, `prototype`)**
Lokalizacja: `src/modules/settings/useSettings.ts:27-49`
Opis: Funkcja rekurencyjnie scala klucze z zewnętrznego JSON-a (`localStorage`, a pośrednio też dane z importowanego pliku, jeśli kiedykolwiek trafią przez ten sam mechanizm) z domyślnymi ustawieniami, bez pomijania kluczy specjalnych. Zweryfikowałem, że w tej konkretnej implementacji (`result[key] = ...` na zwykłym obiekcie) efekt ogranicza się do nadpisania prototypu _lokalnie tworzonego_ obiektu ustawień, a nie do globalnego zanieczyszczenia `Object.prototype` — więc realny wpływ jest ograniczony (raczej błąd/dziwne zachowanie configu niż eskalacja poza aplikację). Niemniej to dokładnie ten kształt funkcji, który w innych kontekstach bywa źródłem klasycznych podatności "prototype pollution", i skoro dane wejściowe pochodzą z zewnątrz (plik można edytować ręcznie / przywrócić z eksportu), warto to zamknąć na wszelki wypadek.
Rekomendacja: W pętli `for (const key of Object.keys(overrides))` pomijać `__proto__`, `constructor`, `prototype`. To dwie-trzy linijki zmiany.
Szacowany nakład: S

**[PRIORYTET: Niski] Brak jawnych nagłówków bezpieczeństwa (CSP, X-Frame-Options itp.) na poziomie Express**
Lokalizacja: `src/server/index.ts` — całościowo
Opis: Brak `helmet` lub ręcznie ustawianych nagłówków bezpieczeństwa w aplikacji. `AGENTS.md` wspomina, że przed aplikacją stoi nginx (osobny, niewidoczny w tym repo config) — możliwe, że nagłówki są ustawiane tam. Nie mogłem tego zweryfikować, bo config nginx nie jest częścią repozytorium.
Rekomendacja: Potwierdzić, że CSP/HSTS/X-Content-Type-Options/X-Frame-Options są ustawiane na warstwie nginx; jeśli nie — dodać `helmet` w Express jako zabezpieczenie niezależne od warstwy infra.
Szacowany nakład: S

**[PRIORYTET: Niski] `.env.example` brakujący w repo mimo że dokumentacja go zakłada**
Lokalizacja: patrz sekcja 3 (F: dokumentacja) — powtórzone tu, bo to też realna luka bezpieczeństwa/DX: bez tego pliku nowy developer nie ma czytelnego wzorca, jakie zmienne środowiskowe są wymagane, i może np. odpalić serwer bez `SSO_SALT` (co zresztą jest bezpiecznie obsłużone — `sso.ts:124-127` loguje błąd i blokuje dostęp zamiast fail-open, co jest dobrą praktyką).
Szacowany nakład: S

**Pozytywnie:** brak twardo zakodowanych sekretów/kluczy w repo (zweryfikowane grepem po całym drzewie), `.gitignore` poprawnie wyklucza `.env*` poza `.env.example`, `npm audit` zwraca **0 podatności**, SSO fail-closed (brak sekretu = odmowa dostępu, nie przepuszczenie), a walidacja URL/ID w `vimeoProxy.ts` (ekstrakcja samego ID przez regex, budowanie własnego URL-a do Vimeo API) skutecznie zamyka wektor SSRF przez dowolny URL od użytkownika.

---

## 6. Zależności i środowisko

- `engines.node: ">=24"` w `package.json` jest spójne z `.nvmrc` (`24.18.0`) i z `Dockerfile` (`node:24.18.0-slim`) — brak rozjazdu, dobra praktyka.
- `npm ci` instaluje się deterministycznie z `package-lock.json` (lockfile spójny z `package.json` — zweryfikowane przez samo wykonanie `npm ci`).
- `npm audit`: **0 vulnerabilities** (638 pakietów).
- `npm outdated`: tylko dwa pakiety nie są na najnowszej wersji:

**[PRIORYTET: Niski] TypeScript 6.x → dostępny 7.x (major)**
Lokalizacja: `package.json` (`"typescript": "~6.0.2"`)
Opis: TypeScript 7 to nowy, przepisany na Go kompilator — poważna zmiana, sensownie jest poczekać, aż ekosystem (typescript-eslint, Vite, ts-plugin dla edytorów) się ustabilizuje, zanim się migruje. To rozsądne, świadome opóźnienie, nie zaniedbanie.
Rekomendacja: Zaplanować ocenę migracji do TS 7 jako osobne zadanie w Q3/Q4, nie pilne.
Szacowany nakład: S (do samej oceny; migracja sama w sobie może być większa)

**[PRIORYTET: Niski] `@types/node` lekko w tyle za najnowszym majorem**
Lokalizacja: `package.json` (`"@types/node": "^24.13.2"`, dostępne `26.1.1`)
Opis: Nieszkodliwe — Dependabot i tak obsłuży to w ramach cotygodniowych PR-ów zgrupowanych po typie zmiany.
Szacowany nakład: S

- **Brak nadmiarowych/sprzecznych zależności** — nie znalazłem dwóch bibliotek o tym samym przeznaczeniu (np. dat: nie ma ani `moment`, ani `dayjs` — projekt w ogóle nie operuje na datach w sposób wymagający takiej biblioteki). Lista zależności (`express`, `react`, `react-dom`, TipTap, `@floating-ui/react`, `@tabler/icons-react`, `turndown`) jest oszczędna i każda pozycja ma jasne uzasadnienie funkcjonalne.
- Dependabot skonfigurowany poprawnie (npm + docker, grupowanie patch/minor, osobne PR dla majorów) — CI uruchamia pełny pipeline łącznie z `docker build` na każdym PR Dependabota, co daje realną gwarancję "zielone CI = bezpieczne do mergowania", zgodnie z tym, co deklaruje `AGENTS.md`.

---

## 7. Testy

**[PRIORYTET: Wysoki] Testy end-to-end (Playwright) istnieją, ale nie są uruchamiane w CI**
Lokalizacja: `.github/workflows/ci.yml` (brak kroku `npm run test:e2e`), testy w `e2e/smoke.spec.ts` i `e2e/phonetic-input.spec.ts`
Opis: Pipeline CI wykonuje: `lint` → `format:check` → `test` (Vitest) → `build` → `knip` → `docker build`. Nie ma nigdzie `test:e2e`. Same testy Playwright są sensownej jakości — realne asercje na widocznych elementach, walidacji formularzy, serwowaniu plików statycznych/PWA/lokalizacji, brak niezłapanych błędów JS — to nie są "testy na pokaz". Problem w tym, że mogą się cicho zepsuć (np. przy refaktoryzacji `StartView.tsx` z sekcji 2) i nikt się o tym nie dowie przed ręcznym uruchomieniem.
Rekomendacja: Dodać krok w CI uruchamiający `npm run build && npm run preview` (lub dev server) w tle, a następnie `npx playwright install --with-deps chromium && npm run test:e2e`. `playwright.config.ts` już ma `webServer` skonfigurowany do auto-startu, więc dodanie tego do CI to głównie kwestia doinstalowania przeglądarki Playwright w workflow.
Szacowany nakład: M

**[PRIORYTET: Wysoki] Wąskie pokrycie testami jednostkowymi — krytyczna logika biznesowa bez testów**
Lokalizacja: całościowo — `npx vitest run` pokazuje tylko 3 pliki testowe / 68 testów:

- `src/__tests__/contrast.test.ts` — 41 testów, ale to testy kontrastu kolorów (design tokens), nie logiki aplikacji.
- `src/modules/file-io/__tests__/otrFormat.test.ts` — 21 testów, dobre pokrycie parsera formatu `.otr`.
- `src/modules/editor/__tests__/transliteration.test.ts` — 6 testów klienckiego fetch-wrappera.

Bez ani jednego testu jednostkowego pozostają m.in.: `Player.ts`/`PlayerContext.tsx` (rdzeń odtwarzacza, w tym niestandardowa logika `flushSync` opisana jako krytyczna w `AGENTS.md`), sterowniki (`HTML5AudioDriver`, `HTML5VideoDriver`, `YouTubeDriver`), `Editor.tsx`/`PhoneticInputExtension.ts` (logika zamiany słowa na transliterację z użyciem ProseMirror `Mapping` — złożona, współbieżna), `useSettings.ts` (w tym `deepMerge` z sekcji 5), `backupManager.ts`, `autosave.ts`, `migrateLegacyData.ts`, `iniParser.ts`, `exportFormats.ts`, oraz cały serwer (`sso.ts` — weryfikacja HMAC, `vimeoProxy.ts`, `transliterateProxy.ts` — cache LRU/circuit breaker/rate limiter). To dokładnie te moduły, w których błąd byłby najkosztowniejszy (utrata pracy transkrybenta, obejście autoryzacji, zła transliteracja nadpisująca tekst użytkownika).
Rekomendacja: Priorytetyzować w kolejności ryzyka: (1) `sso.ts` — łatwy do przetestowania jednostkowo (czysta funkcja + mock `crypto.subtle`), najwyższe konsekwencje błędu; (2) `transliterateProxy.ts`/`vimeoProxy.ts` — logika cache/circuit-breaker/rate-limit da się przetestować bez sieci (mock `fetch`); (3) `useSettings.ts` (`deepMerge`); (4) `PlayerContext`/`Player.ts` — najtrudniejsze (DOM, media), ale też najbardziej ryzykowne przy przyszłych zmianach.
Szacowany nakład: L

**Pozytywnie:** testy, które istnieją, są rzeczywiście wartościowe (nie same mocki bez asercji), fixture-based testing (`test-fixtures/otr/*.otr`) jest dobrym wzorcem dla parsera formatu plików, a `AGENTS.md` wymusza formalnie pełny "Verification Workflow" (lint + format + typecheck + test + e2e + knip) przed każdym commitem — sam proces jest dobrze zaprojektowany, tylko CI nie lustrza go w 100%.

---

## 8. Wydajność

**[PRIORYTET: Średni] Pojedynczy bundle JS 719 KB (227 KB gzip) bez code-splittingu**
Lokalizacja: `vite.config.ts`, brak `import()` w całym `src/`
Opis: Zweryfikowałem realnym `npm run build`: `dist/assets/index-*.js` = 719.15 kB (227.04 kB gzip) w jednym pliku. TipTap, `@tabler/icons-react` oraz `YouTubeDriver.ts` (integracja z zewnętrznym IFrame API) są ładowane zawsze, nawet gdy użytkownik wybierze lokalny plik audio i nigdy nie dotknie YouTube/edytora rich-text od razu. To bezpośrednio sprzeczne z zaleceniem z `AGENTS.md` (patrz sekcja 3).
Rekomendacja: Zacząć od najprostszego, najbardziej odosobnionego przypadku — dynamiczny `import()` dla `YouTubeDriver` (ładowany tylko gdy użytkownik wybierze źródło YouTube) — i zmierzyć wpływ na rozmiar initial bundle, zanim rozszerzy się podejście na TipTap.
Szacowany nakład: M

**[PRIORYTET: Niski] `getAllBackups()` skanuje cały `localStorage` i parsuje JSON przy każdym wywołaniu**
Lokalizacja: `src/modules/storage/backupManager.ts` (`getAllBackupKeys`/`getAllBackups`), wywoływane cyklicznie z `startPeriodicBackup`
Opis: Każde wywołanie iteruje `Object.keys(localStorage)` (wszystkie klucze aplikacji, nie tylko backupy) i parsuje JSON dla każdego trafienia z prefiksem backupu, żeby posortować i policzyć limit per plik. Przy skali "kilka-kilkanaście backupów" (limit domyślny to 10 na plik) narzut jest pomijalny, ale rośnie liniowo z liczbą przetranskrybowanych plików i wywoływany jest co `backupIntervalMinutes` (domyślnie ustawialne przez użytkownika) w głównym wątku.
Rekomendacja: Niski priorytet dopóki nie pojawią się sygnały realnego problemu (np. skarga użytkownika na zacinanie się przy autozapisie) — nie warto przedwcześnie optymalizować. Jeśli zostanie zaadresowane, prostym rozwiązaniem jest cache'owanie listy kluczy backupów w pamięci między wywołaniami autosave.
Szacowany nakład: S

Nie znalazłem: blokujących operacji synchronicznych w krytycznej ścieżce, wycieków `setInterval`/listenerów (przeciwnie — `transliterateProxy.ts` poprawnie robi `.unref()` na interwale czyszczącym, `PlayerContext`/hooki poprawnie sprzątają listenery w `useEffect` cleanup), ani problemów N+1/indeksów (nie dotyczy — brak bazy danych).

---

## 9. Logowanie i observability

**[PRIORYTET: Niski] Niespójny format logów między klientem a serwerem, brak logowania strukturalnego**
Lokalizacja: całościowo — moduły klienckie konsekwentnie prefiksują logi (`[Player]`, `[i18n]`, `[useSettings]`, `[backupManager]`, `[migration]`, `[autosave]`), ale serwer (`src/server/index.ts`, `vimeoProxy.ts`) miesza styl bez wyraźnego prefiksu modułu, a wszystkie logi to zwykły tekst przez `console.*`, bez poziomów/pól ustrukturyzowanych.
Opis: Przy niewielkim ruchu to nieszkodliwe; przy realnym incydencie produkcyjnym (np. seria błędów 500 z `vimeoProxy`) brak korelowalnych, strukturalnych logów (request ID, poziom, timestamp w jednolitym formacie) utrudni diagnozę tylko na podstawie logów kontenera.
Rekomendacja: Ujednolicić prefiksy na serwerze (`[server]`, `[vimeo-proxy]`, `[sso]`) już teraz małym kosztem; rozważyć lekki logger (np. `pino`) tylko jeśli/gdy ruch/liczba incydentów uzasadni inwestycję — na obecną skalę to nie jest pilne.
Szacowany nakład: S

**[PRIORYTET: Niski] Brak endpointu health-check**
Lokalizacja: `src/server/index.ts`
Opis: Serwer nie eksponuje `/health` ani `/healthz`. Przy wdrożeniu w Dockerze za nginx z `docker compose up -d --force-recreate` (jak opisano w `AGENTS.md`) health-check ułatwiłby automatyczne wykrywanie, czy nowy kontener faktycznie wstał poprawnie, zamiast polegać wyłącznie na czasie i ręcznej weryfikacji.
Rekomendacja: Dodać prosty `app.get('/healthz', (_req, res) => res.sendStatus(200))` **przed** middleware SSO (żeby orkiestrator nie musiał uwierzytelniać się SSO WordPressa, by sprawdzić żywotność kontenera).
Szacowany nakład: S

---

## 10. Dokumentacja i DX

To zdecydowanie mocna strona projektu — `AGENTS.md` jest nietypowo szczegółowy i (poza drobnymi rozjazdami wymienionymi w sekcji 3) aktualny: opisuje strukturę katalogów, konwencje komponentów, system i18n, workflow gita, a nawet dokładne kroki wdrożeniowe łącznie z czyszczeniem cache CDN. Nowy developer (czy to człowiek, czy agent AI — dokument jest explicite pisany też z myślą o tych drugich) realistycznie mógłby ogarnąć projekt bez pytania autora, **z wyjątkiem** dwóch praktycznych przeszkód:

**[PRIORYTET: Niski] Brak dedykowanego skryptu `typecheck` mimo że dokumentacja się do niego odwołuje**
Lokalizacja: `package.json` (sekcja `scripts`), `AGENTS.md` (Verification Workflow: `tsc --noEmit # 2. Typecheck`)
Opis: `AGENTS.md` instruuje uruchomienie `tsc --noEmit` jako osobny krok weryfikacyjny, ale nie ma odpowiadającego mu skryptu npm — trzeba pamiętać dokładną komendę zamiast `npm run typecheck`. Drobna niedogodność, ale niespójna z resztą (`build`, `lint`, `test` — wszystko inne ma swój skrypt).
Rekomendacja: Dodać `"typecheck": "tsc --noEmit"` do `package.json` i zaktualizować `AGENTS.md`, żeby się odwoływał do skryptu, nie surowej komendy.
Szacowany nakład: S

**[PRIORYTET: Niski] Brakujące pliki referencyjne utrudniają onboarding (`.env.example`, lokalizacja `docker-compose.yml`)**
Lokalizacja: patrz sekcja 3 — powtórzone tu jako wpływ na DX, nie duplikat priorytetu w podsumowaniu.

---

## Top 10 najpilniejszych działań

Posortowane według kombinacji priorytetu i nakładu (szybkie, wysokoprocentowe poprawki najpierw):

1. ~~**[Wysoki / S]** Napraw obejście rate limitera przez spoofing `X-Forwarded-For` — ustaw `trust proxy` i użyj `req.ip` w `transliterateProxy.ts`.~~ (Zrobione)
2. ~~**[Średni / S]** Dodaj rate limiting do `/api/vimeo/download` (ten sam wzorzec co w `transliterateProxy.ts`).~~ (Zrobione)
3. ~~**[Średni / S]** Zabezpiecz `deepMerge` w `useSettings.ts` przed kluczami `__proto__`/`constructor`/`prototype`.~~ (Zrobione)
4. ~~**[Niski / S]** Posprzątaj drobne rozjazdy dokumentacja↔rzeczywistość: usuń martwy wpis w `knip.json`, usuń wzmiankę o `App.css` z `AGENTS.md`, dodaj `.env.example`, dodaj skrypt `typecheck`.~~ (Zrobione)
5. ~~**[Wysoki / M]** Włącz testy Playwright (`test:e2e`) do CI — testy już istnieją i są wartościowe, brakuje tylko kroku w `ci.yml`.~~ (Zrobione)
6. ~~**[Niski / S]** Dodaj endpoint `/health` (przed middleware SSO) i ujednolić prefiksy logów na serwerze.~~ (Zrobione)
7. ~~**[Wysoki / L]** Rozszerz pokrycie testami jednostkowymi w kolejności ryzyka: `sso.ts` → proxy serwerowe → `useSettings`/`deepMerge` → `PlayerContext`/`Player.ts`.~~ (Zrobione)
8. ~~**[Średni / M]** Wprowadź code-splitting (zacznij od `YouTubeDriver` jako dynamicznego `import()`), a dopiero potem usuń sztucznie podniesiony `chunkSizeWarningLimit`.~~ (Zrobione)
9. ~~**[Średni / M]** Rozbij `StartView.tsx` na hooki per źródło mediów (lokalny plik / YouTube / Vimeo / import `.otr`) + cienki komponent prezentacyjny.~~ (Zrobione)
10. ~~**[Średni / M]** Zastąp systemowe inline `style={{...}}` klasami CSS zgodnie z konwencją z `AGENTS.md`, zaczynając od `StartView.tsx` i `SettingsPanel.tsx`.~~ (Zrobione)

---

## Ogólna ocena stanu projektu: **7,5 / 10**

**Uzasadnienie:** To zauważalnie czystszy i lepiej zdyscyplinowany projekt niż typowy kandydat do tego rodzaju audytu. Zero `TODO`/`FIXME`/`any`/`eslint-disable` w kodzie źródłowym, zero podatności w zależnościach, w pełni zielony lint/format/typecheck/build na sprawdzonym stanie, spójna architektura modułowa faktycznie przestrzegana w praktyce, oraz wyjątkowo dobra i (prawie) aktualna dokumentacja inżynierska — to wszystko stawia projekt wyraźnie powyżej średniej.

Odjęte punkty wynikają z: (a) jednego konkretnego, realnego problemu bezpieczeństwa (obejście rate limitera — punkt 1 powyżej) — kontrolowany wpływ, ale to dokładnie taki błąd, który w audycie ma być znaleziony; (b) wyraźnie za wąskiego pokrycia testami jednostkowymi w stosunku do złożoności logiki biznesowej (odtwarzacz, edytor, serwer) mimo dobrej infrastruktury testowej; (c) braku e2e w CI mimo istnienia dobrych testów e2e — rozjazd między "mamy narzędzie" a "narzędzie faktycznie chroni main"; (d) kilku drobnych, ale namacalnych śladów niespójności między deklarowaną a faktyczną praktyką (inline style, brak code-splittingu mimo zalecenia, drobny doc drift).

Żadne z powyższych nie wskazuje na "narosły przez lata dług" w rozumieniu z brief-u audytu — to raczej naturalne, niewielkie rozjazdy typowe dla żywego, aktywnie rozwijanego projektu, a nie oznaka zaniedbania.

---

## Sugerowana kolejność refaktoryzacji (żeby nic nie zepsuć)

1. **Zmiany zero-ryzyka, bez wpływu na runtime** — dokumentacja i konfiguracja: punkty 4 z Top 10 (czyszczenie `knip.json`, `AGENTS.md`, `.env.example`, skrypt `typecheck`). Zrób to najpierw — nie wymaga testów, nic nie może się zepsuć.
2. **Dołóż testy jednostkowe _przed_ ruszaniem logiki** (punkt 7) — zacznij od `sso.ts` i proxy serwerowych, bo to najłatwiejsze do przetestowania w izolacji i da to siatkę bezpieczeństwa pod punkt 8 (bezpieczeństwo) poniżej.
3. **Włącz e2e do CI** (punkt 5) — to zmiana w pipeline, nie w kodzie produkcyjnym, ale od teraz każda kolejna zmiana w UI (punkty 9-10) będzie automatycznie weryfikowana.
4. **Napraw poprawki bezpieczeństwa o małym zasięgu i nakładzie** (punkty 1-3) — każda z nich jest lokalna (jeden plik, kilka linii) i łatwa do pokrycia szybkim testem jednostkowym napisanym przy okazji.
5. **Dopiero teraz większe refaktoryzacje UI** (punkty 9-10: rozbicie `StartView.tsx`, migracja inline style → CSS) — mają teraz za sobą e2e w CI jako siatkę bezpieczeństwa przed regresją wizualną/funkcjonalną.
6. **Na końcu optymalizacja wydajności** (punkt 8: code-splitting) — celowo na końcu, bo dotyka ładowania modułów (dynamic import) i najlepiej weryfikować to mając już działające, kompletne e2e (żeby złapać ewentualny błąd "moduł się nie doładował na czas" na konkretnym przepływie, np. YouTube).
