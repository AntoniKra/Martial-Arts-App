# Issue #40 — większe napisy odtwarzacza, do decyzji

Propozycja wizualna dla właściciela: poprawa czytelności z 1–2 m. PR pozostaje szkicem i może zostać zamknięty bez scalenia. Zrzuty nie zastępują oceny na fizycznym telefonie z tej odległości.

Baza: `main`, `c61ad102d0cdcdfbaf168e026768df09f8acddb6`, po scaleniu PR #45. Gałąź: `feat/player-text-sizes`. Pomiary i zrzuty: 8 listopada 2026, Chromium, lokalny build produkcyjny i emulator Authentication projektu `demo-combat-training`.

## Zmiany

- `WorkoutCircularTimer.tsx`: rozmiar stanu pod zegarem i etykiety „WSTRZYMANO”.
- `WorkoutPlayerView.tsx`: rozmiar nazwy ćwiczenia i numeru rundy; odstęp numeru rundy od nazwy zwiększony z 4 do 8 px.
- `WorkoutPlayerNextPreview.tsx`: rozmiary etykiety „Następnie” i tekstu kolejnego etapu.
- `e2e/playerTextSizes.spec.ts`: pomiary rzeczywistych stylów i geometrii w obu motywach na trzech ekranach. Sprawdza pracę, pauzę, odpoczynek między rundami i samodzielną przerwę — łącznie 24 kombinacje stanu, motywu i rozdzielczości.

W kodzie aplikacji zmieniono wyłącznie sześć wierszy klas rozmiarów i odstępu. Logika, kolory, kroje, grubości, kolejność elementów, przyciski i dolna nawigacja zachowują dotychczasowe ustawienia. Odstępstwa od zakresu: brak.

## Rozmiary przed i po

Wartości zmierzone przez `getComputedStyle`, jednakowe w obu motywach. Wartości „przed” potwierdził osobny przebieg przed edycją trzech komponentów: 2 PASS / 0 FAIL / 0 SKIP.

| Element | Przed, 360×800 | Po, 360×800 |
| --- | ---: | ---: |
| Zegar | 56 px | 56 px |
| PRACA / ODPOCZYNEK / PRZERWA | 10 px | 16 px |
| WSTRZYMANO | 9 px | 16 px |
| Nazwa ćwiczenia (h1) | 18 px | 24 px |
| Runda 1 z 2 | 11 px | 16 px |
| Następnie | 9 px | 12 px |
| Nazwa następnego etapu i jego opis | 11 px | 14 px |

Na 768×1024 i 1440×900 zegar nadal ma 64 px. Pierścień ma dotychczasowe 260×260 px. Przyciski sterowania nadal mają 48×48, 64×64 i 48×48 px.

W obu motywach i wszystkich czterech stanach test potwierdza: brak przewijania dokumentu i wewnętrznego obszaru odtwarzacza; cały tekst zegara i wszystkie trzy przyciski znajdują się w granicach ekranu. Podczas pracy dół głównego przycisku znajduje się na 784 / 1008 / 884 px, odpowiednio przy wysokościach ekranu 800 / 1024 / 900 px.

## Zrzuty

Dokładnie 13 plików PNG, każdy 360×800. Zegar zatrzymany kontrolowanym zegarem testowym: praca i pauza 1:00, odpoczynek i przerwa 0:30. „Przed” i „po” korzystają z identycznego planu, kolejności etapów i motywów. Wszystkie pliki obejrzano; bez widocznego obcięcia i nakładania tekstu.

| Stan | Ciemny przed | Ciemny po | Jasny przed | Jasny po |
| --- | --- | --- | --- | --- |
| Praca | [PNG](before/work-dark.png) | [PNG](after/work-dark.png) | [PNG](before/work-light.png) | [PNG](after/work-light.png) |
| Odpoczynek | [PNG](before/rest-dark.png) | [PNG](after/rest-dark.png) | [PNG](before/rest-light.png) | [PNG](after/rest-light.png) |
| Pauza | [PNG](before/paused-dark.png) | [PNG](after/paused-dark.png) | [PNG](before/paused-light.png) | [PNG](after/paused-light.png) |

Dodatkowy wymagany zrzut „po” na najmniejszej rozdzielczości E2E: [samodzielna przerwa, ciemny motyw, 360×800](after/smallest-break-dark.png). Najmniejsza rozdzielczość E2E jest taka sama jak rozdzielczość porównania z issue.

Surowe pomiary JSON pozostają wyłącznie w ignorowanych wynikach testów. Nie są częścią commita.

## Definition of done

- `npm test -- src/features/workout-player`: 74 PASS / 0 FAIL / 0 SKIP, 7 plików.
- Celowany Playwright `e2e/playerTextSizes.spec.ts`: 6 PASS / 0 FAIL / 0 SKIP, oba motywy i wszystkie trzy ekrany.
- `npm run typecheck`: PASS, kod 0.
- `npm run lint`: PASS, kod 0; 0 błędów, 21 wcześniejszych ostrzeżeń, zgodnie z raportem bazy PR #45.
- `npm test`: 384 PASS / 0 FAIL / 0 SKIP, 35 plików.
- `npm run build`: PASS, kod 0, wygenerowane pliki PWA.
- `npm run test:e2e`: 168 PASS / 0 FAIL / 0 SKIP / 0 flaky, bez ponowień; Chromium 360×800, 768×1024 i 1440×900. Obejmuje istniejące testy axe oraz nową kontrolę odtwarzacza.
- `git diff --check`: PASS.
- Brak nowych `any`, `@ts-ignore`, `eslint-disable` i zmian osłabiających reguły lub wcześniejsze testy.

## Problemy i ryzyka

- P1/P2: brak wykrytych problemów w objętych zakresem stanach.
- P3: propozycja oczekuje decyzji właściciela; czytelność z 1–2 m na fizycznym telefonie wymaga jego oceny.
- P3: wcześniejsze 21 ostrzeżeń ESLint oraz ostrzeżenia Vite o przyszłym ładowaniu konfiguracji i wielkości paczki. Pozostawione poza zakresem.

## Ograniczenia

Bez scalenia, wdrożenia, dostępu do produkcji, odczytu lub ujawniania sekretów i płatnych API. Testy wyłącznie na lokalnym emulatorze demo. Katalog referencyjny Figmy nietknięty. Commit i push wyłącznie na gałęzi zadania są dozwolone wprost przez użytkownika.
