# Issue #39 — poprawki audytu użyteczności z 7 listopada 2026

Stan: **PASS z uwagami**. Zrealizowano wszystkie siedem punktów issue, bez odstępstw od zakresu. Uwagi dotyczą wyłącznie wcześniejszych ostrzeżeń narzędzi.

## Zmiany

1. `WorkoutHistoryCard.tsx`: przyciski dodawania/edycji notatki i usuwania wpisu obejmują całą szerokość swoich sekcji i mają `min-h-touch`. Zachowano klasy typografii i kolorów oraz potwierdzenie usuwania.
2. `workoutStepTimerPresentation.ts`: napis „PRACA” korzysta z `text-crimson-ink`. Test regresji sprawdza wszystkie pliki `.ts` i `.tsx` w `src`, także pliki z konfiguracją prezentacji.
3. `styles/index.css`: ciemny fokus ma kolor `#ef5d6e`. Jasny motyw pozostaje bez zmian. Osiem nowych asercji sprawdza kontrast fokusu co najmniej 3:1 na czterech powierzchniach w obu motywach.
4. `WorkoutPlayerView.tsx` i `workoutPlayerLabels.ts`: przy braku ukończonego etapu pracy nadtytuł to „Trening niezapisany”, nagłówek to „Nie zapisano treningu”, a opis wyjaśnia warunek zapisu. Działania przycisków pozostają bez zmian.
5. `HomeRecentSession`, mapper i `RecentSessionCard.tsx`: zamiast procentu widoczne są liczniki ćwiczeń i rund. Wspólny komponent `components/domain/WorkoutCompletionCounts.tsx` zapewnia identyczną kolejność i etykiety na starcie i w historii. Pasek realizacji nadal liczy ukończone ćwiczenia.
6. Mappery i karty planów używają dokładnego formatu podglądu: `ok. 2:30` na liście oraz „Czas” / `2:30` na starcie. Czysty formatter przeniesiono bez zmiany działania do `domain/time/formatDuration.ts`; zaktualizowano wszystkich odbiorców. Dla 3600 s pozostaje `1 h`.
7. `AppLayout.tsx`: dolne wypełnienie treści na telefonie to wysokość nawigacji (65 px) i 12 px odstępu, z dotychczasowym safe area. Wypełnienie na większych ekranach pozostaje bez zmian.

ADR 0005, obliczenia realizacji, rozmiary napisów odtwarzacza, kreator i Firestore pozostają bez zmian.

## Weryfikacja

- Testy celowane jednostkowe: **52 pass / 0 fail / 0 skip**.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS, **0 błędów, 21 ostrzeżeń**. Porównanie tych samych plików z bazowym HEAD potwierdziło również 21 ostrzeżeń przed zmianami.
- `npm test`: **361 pass / 0 fail / 0 skip**, 32 pliki testów.
- `npm run build`: PASS. Kompilacja została także wykonana przed końcowym E2E.
- Celowane E2E telefonu: **20 pass / 0 fail / 0 skip**.
- Celowane E2E nowego audytu po poprawce testu: **6 pass / 0 fail / 0 skip**, oba motywy na trzech rozdzielczościach.
- Końcowe `npm run test:e2e`: **153 pass / 0 fail / 0 skip / 0 flaky**. Chromium: 360×800, 768×1024 i 1440×900; wyłącznie lokalny emulator Authentication z projektem `demo-combat-training`.
- E2E sprawdzają nagłówek bez zapisu zarówno po „Zakończ wcześniej”, jak i po przejściu całej osi bez ukończenia pracy. Zachowano asercje braku zapisu i poprawnego ponownego uruchomienia.
- `git diff --check`: PASS.

Pierwszy pełny przebieg E2E dał 149 pass i 4 fail: nowy test odstępu błędnie mierzył boczną nawigację na tablecie i komputerze. Poprawiono test tak, aby na telefonie sprawdzał różnicę 12 px względem dolnego paska, a na większych ekranach zachowane 32 px wypełnienia. Osobne ponowienie oraz końcowy pełny przebieg przeszły. Nie osłabiono asercji aplikacji.

## Pomiar obszarów dotyku

Pomiar przez `getBoundingClientRect()` w Chromium, viewport **360×800**, skala 1:

- Ciemny motyw: „Dodaj notatkę” **326×48 px**, „Edytuj notatkę” **326×48 px**, „Usuń wpis” **326×48 px**.
- Jasny motyw: „Dodaj notatkę” **326×48 px**, „Edytuj notatkę” **326×48 px**, „Usuń wpis” **326×48 px**.
- Każdy przycisk ma szerokość równą szerokości swojej sekcji: **326 px**. Test sprawdza wysokość co najmniej 44 px i zgodność szerokości także na tablecie i komputerze.
- Dolny pasek ma **65 px**, dolne wypełnienie treści **77 px** przy zerowym safe area: różnica **12 px**.

## Zrzuty 360×800

Wszystkie 12 plików sprawdzono pod względem wymiarów i obejrzano w obu motywach.

- Historia: [ciemny](../screenshots/ui-audit-2026-11-07/history-dark.png), [jasny](../screenshots/ui-audit-2026-11-07/history-light.png).
- Koniec bez zapisu: [ciemny](../screenshots/ui-audit-2026-11-07/no-work-dark.png), [jasny](../screenshots/ui-audit-2026-11-07/no-work-light.png).
- Ostatnia sesja: [ciemny](../screenshots/ui-audit-2026-11-07/recent-session-dark.png), [jasny](../screenshots/ui-audit-2026-11-07/recent-session-light.png).
- Lista planów: [ciemny](../screenshots/ui-audit-2026-11-07/plans-dark.png), [jasny](../screenshots/ui-audit-2026-11-07/plans-light.png).
- Aktywny plan: [ciemny](../screenshots/ui-audit-2026-11-07/featured-dark.png), [jasny](../screenshots/ui-audit-2026-11-07/featured-light.png).
- Odtwarzacz „PRACA”: [ciemny](../screenshots/ui-audit-2026-11-07/player-work-dark.png), [jasny](../screenshots/ui-audit-2026-11-07/player-work-light.png).

## Problemy i ryzyka

- P1/P2: brak stwierdzonych problemów w zakresie issue.
- P3: wcześniejsze 21 ostrzeżeń ESLint oraz ostrzeżenia Vite o konfiguracji importu i rozmiarze bundla. Pozostawiono poza zakresem.

Bez wdrożenia, scalania i zmian w Firestore. Bez dostępu do produkcji oraz odczytu lub ujawnienia sekretów. Commit i push wyłącznie na gałęzi zadania są jawnie dozwolone przez użytkownika.
