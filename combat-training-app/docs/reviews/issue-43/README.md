# Issue #43 — kaskada czcionek przycisków i pól

**Werdykt: PASS z uwagami.** Baza: `main`, `e5494537e1885322b84931aca9648e9238678727`. Gałąź: `fix/button-font-cascade`. Pomiary: 7 listopada 2026, lokalny build produkcyjny, Chromium, emulator Authentication projektu `demo-combat-training`.

## Zmiany i zakres

- `src/styles/index.css`: usunięto nadmiarowe `button, input, textarea, select { font: inherit; }`; Preflight zapewnia dziedziczenie w warstwie bazowej. Style `html` i `body` przeniesiono do `@layer base`, aby klasy mogły je nadpisywać.
- Globalne `:focus-visible` zostało poza warstwą celowo. Zachowuje dotychczasowy obrys także na elementach z klasą ujemnego odsunięcia. E2E sprawdza pole logowania i przycisk kreatora: obrys ciągły 2 px, odsunięcie 2 px, dotychczasowy kolor tokenu w obu motywach, przed i po poprawce.
- Zmieniono wyłącznie klasy rozmiaru pól z `text-[13px]` na `text-[16px]`: `ExerciseConfigurationView`, `ExerciseLibraryView`, `WorkoutBreakForm`, `WorkoutMetadataForm`, `WorkoutsFilters`, `WorkoutHistoryNoteEditor`. Pola logowania miały i nadal mają 16 px. Krój i pozostałe klasy pól zachowano.
- Nie zmieniono klas przycisków, kolorów, układu ani napisów timera z issue #40.
- `src/styles/fontCascade.test.ts`: parser CSS wykrywa `font` i `font-size` dla kontrolek poza warstwą, także w regułach warunkowych, zagnieżdżonych i grupowanych. PostCSS dodano jako jawną zależność testową; ta sama wersja była już w pliku blokady.
- `e2e/fontCascade.spec.ts`: pomiary `getComputedStyle`, wysokości wszystkich renderowanych przycisków i rozmiarów pól na 20 stanach ekranów w obu motywach, na telefonie, tablecie i desktopie. Zrzuty są zapisywane dla telefonu.

Odstępstwa od zakresu: brak.

## Typografia przed i po

Wartości są identyczne w obu motywach. Zapis: **rozmiar / grubość / krój**. Archivo i Inter oznaczają odpowiednio lokalne rodziny `Archivo Variable` i `Inter Variable`.

| Element | Przed | Po |
| --- | --- | --- |
| Główny przycisk Button md („Zaloguj się”) | 16 px / 400 / Inter | 13 px / 600 / Archivo |
| Zakładki „Plany / Historia”, wybrana i niewybrana | 16 px / 400 / Inter | 12 px / 600 / Archivo |
| Menu: „Zakończ ćwiczenie” | 16 px / 400 / Inter | 13 px / 600 / Archivo |
| Menu: „Zakończ trening” | 16 px / 400 / Inter | 13 px / 600 / Archivo |
| Okno: „Zakończ wcześniej” | 16 px / 400 / Inter | 14 px / 600 / Archivo |
| Okno: „Porzuć” — tekst główny | 16 px / 400 / Inter | 14 px / 600 / Archivo |
| Okno: „Wróć” | 16 px / 400 / Inter | 14 px / 600 / Archivo |
| Ekran końca: „Uruchom ponownie” | 16 px / 400 / Inter | 14 px / 600 / Archivo |
| „Dodaj notatkę” | 16 px / 400 / Inter | 11 px / 600 / Archivo |
| Skróty formatów rund | 16 px / 400 / Inter | 12 px / 600 / Archivo |
| Pole e-mail | 16 px / 400 / Inter | 16 px / 400 / Inter |
| Pole własnej liczby rund | 16 px / 400 / Inter | 16 px / 400 / Archivo |

Wybrana zakładka ma istniejące klasy `font-semibold` i `font-bold`; w wygenerowanym CSS wygrywa `font-semibold` (600). Klasy pozostawiono zgodnie z zakresem issue.

Surowe pomiary: [przed, ciemny](before/measurements-dark.json), [po, ciemny](after/measurements-dark.json), [przed, jasny](before/measurements-light.json), [po, jasny](after/measurements-light.json).

Na telefonie 360×800, na każdy motyw: **124 pomiary przycisków, minimum 44 px wysokości; 43 pomiary pól, każde 16 px**. Liczby obejmują powtórzenia wspólnych kontrolek między ekranami. Przyciski odtwarzacza bez `min-h-*` mają wysokość wyznaczoną przez `size-12` (48 px) albo `size-16` (64 px). Żaden zmierzony przycisk nie wymagał zmiany klas.

## Zrzuty 360×800

Każda pozycja prowadzi do oryginalnego PNG. Łącznie zapisano 80 zrzutów: 20 stanów × 2 motywy × przed/po. Poniżej wymagane ekrany i dodatkowy widok akcji notatki.

| Ekran | Ciemny przed | Ciemny po | Jasny przed | Jasny po |
| --- | --- | --- | --- | --- |
| Logowanie | [PNG](before/login-dark.png) | [PNG](after/login-dark.png) | [PNG](before/login-light.png) | [PNG](after/login-light.png) |
| Start | [PNG](before/home-dark.png) | [PNG](after/home-dark.png) | [PNG](before/home-light.png) | [PNG](after/home-light.png) |
| Plany | [PNG](before/plans-dark.png) | [PNG](after/plans-dark.png) | [PNG](before/plans-light.png) | [PNG](after/plans-light.png) |
| Historia | [PNG](before/history-dark.png) | [PNG](after/history-dark.png) | [PNG](before/history-light.png) | [PNG](after/history-light.png) |
| Konfiguracja ćwiczenia | [PNG](before/configuration-dark.png) | [PNG](after/configuration-dark.png) | [PNG](before/configuration-light.png) | [PNG](after/configuration-light.png) |
| Szczegóły planu | [PNG](before/plan-details-dark.png) | [PNG](after/plan-details-dark.png) | [PNG](before/plan-details-light.png) | [PNG](after/plan-details-light.png) |
| Odtwarzacz z menu | [PNG](before/player-menu-dark.png) | [PNG](after/player-menu-dark.png) | [PNG](before/player-menu-light.png) | [PNG](after/player-menu-light.png) |
| Okno zakończenia | [PNG](before/player-exit-dark.png) | [PNG](after/player-exit-dark.png) | [PNG](before/player-exit-light.png) | [PNG](after/player-exit-light.png) |
| Ekran końca | [PNG](before/completed-dark.png) | [PNG](after/completed-dark.png) | [PNG](before/completed-light.png) | [PNG](after/completed-light.png) |
| Akcja notatki | [PNG](before/history-note-action-dark.png) | [PNG](after/history-note-action-dark.png) | [PNG](before/history-note-action-light.png) | [PNG](after/history-note-action-light.png) |

Pozostałe stany: metadane kreatora, biblioteka, własne ćwiczenie, własna liczba rund, własny czas rundy i odpoczynku, tryb ciągły, instrukcja ćwiczenia, formularz przerwy i edytor notatki. Są w katalogach `before/` i `after/`. Przegląd wizualny wymaganych ekranów: bez nowego obcięcia napisów lub nakładania się elementów.

## Definition of done i dowody

- `npm ci --no-audit --no-fund`: PASS, instalacja z pliku blokady.
- `npm run typecheck`: PASS, kod 0.
- `npm run lint`: PASS, kod 0; 0 błędów, 21 istniejących ostrzeżeń.
- `npm test`: **384 PASS, 0 FAIL, 0 SKIP**, 35 plików; obejmuje 7 testów kaskady CSS.
- `npm run build`: PASS, kod 0, wygenerowane pliki PWA.
- `npm run test:e2e`: **162 PASS, 0 FAIL, 0 SKIP**, 0 flaky, bez ponowień; Chromium 360×800, 768×1024, 1440×900, lokalny emulator `demo-combat-training`. Obejmuje dotychczasowe testy axe i 6 nowych przebiegów kontroli typografii.
- Celowany E2E telefonu: **2 PASS, 0 FAIL, 0 SKIP**.
- Kontrola regresji na odizolowanej kopii źródeł z bazowego HEAD: E2E **2 FAIL zgodnie z oczekiwaniem** (`16px / 400 / Inter` zamiast `13px / 600 / Archivo`); test ochronny CSS **1 FAIL, 6 PASS zgodnie z oczekiwaniem**, wykryte `font: inherit`. Kopię roboczą aplikacji pozostawiono bez zmian podczas tego sprawdzenia.
- Podczas przygotowania E2E poprawiono błędne oczekiwanie 700 dla wybranej zakładki oraz odczyt fokusu przed zakończeniem aktualizacji stylów. Końcowy test sprawdza obliczoną kaskadę i ustabilizowany fokus; pełny zestaw przechodzi bez flaky.
- Nie dodano `any`, `@ts-ignore`, `eslint-disable` ani wyjątków osłabiających testy.

Zbiorczy wynik: [checks.json](checks.json). Końcowy stan Git, statystyka i SHA-256 różnicy są w raporcie wykonawcy po commicie.

## Problemy i ryzyka

- **P1/P2:** brak wykrytych problemów blokujących zmianę.
- **P3:** istniejące 21 ostrzeżeń lint oraz ostrzeżenia Vite dotyczące przyszłego ładowania konfiguracji i dużej paczki. Nie zmieniano ich w tym zadaniu.
- **P3:** pomiar 16 px sprawdzono w Chromium; fizycznego Safari na iPhonie nie uruchamiano. E2E potwierdza wymagany rozmiar CSS pól.
- **P3:** `gh` nie łączy się z `api.github.com`; w razie utrzymania błędu gałąź zostanie wypchnięta, a PR otworzy Claude z przygotowanego opisu.

## Potwierdzenie ograniczeń

Bez wdrożenia, scalenia, produkcji, płatnych API i dostępu do sekretów. Testy korzystały wyłącznie z danych testowych i emulatora. Katalog referencyjny Figmy pozostał nietknięty. Commit i push na wskazanej gałęzi są jawnie dozwolone w poleceniu użytkownika.
