# Issue #59 — przycisk startu i pauzy 128 px

Stan: PASS z uwagami. Weryfikacja: 8 listopada 2026, lokalny build produkcyjny, Chromium i emulatory Authentication/Firestore projektu `demo-combat-training`.

Baza: `main`, `76d4d6b7682c4832b42925b8e8a4a7700907ca78`. Gałąź: `feat/player-large-primary-button`. Zależność #58 jest scalona w PR #60.

## Zmiany

- `WorkoutPlayerControls.tsx`: koło 128 px, ikona 38 px, pierścień 4 px z tokenu tła strony. Przyciski boczne zachowują rozmiar 48×48 px, etykiety i akcje. Podpis „Zacznij teraz” mieści się wewnątrz koła.
- `WorkoutPlayerNextPreview.tsx`: dolny odstęp 44 px, również przy informacji o końcu treningu, aby podgląd nie nachodził na wystający przycisk.
- `WorkoutPlayerView.tsx`: `overflow-clip` zapobiega automatycznemu przewijaniu ekranu przy fokusowaniu częściowo uciętego przycisku.
- `e2e/playerPrimaryButton.spec.ts`: geometria, widoczny obszar dotyku, klawiatura, safe area i wymagane zrzuty. Istniejące testy rozmiarów tekstu i przygotowania uwzględniają teraz celowe ucięcie koła.

Bez zmian w logice zegara, przygotowania i nawigacji między etapami. Odstępstwa od zakresu implementacji: brak.

## Pomiary

W obu motywach na 360×800, 768×1024, 1440×900 oraz dodatkowo 390×844:

- koło 128×128 px, widoczny obszar bez dolnego insetu 128×112 px;
- środek koła na wysokości środków przycisków bocznych;
- koło wystaje 15 px ponad zewnętrzną krawędź paska (około 16 px z issue), a 16 px znajduje się poniżej dolnej krawędzi viewportu;
- odstęp od ostatniego wiersza podglądu do pierścienia 25 px, do samego koła 29 px;
- brak przewijania dokumentu, wewnętrznego obszaru treści i przesunięcia przy nadawaniu fokusu;
- kliknięcie widocznego dolnego fragmentu działa, a prostokątne narożniki poza kołem i sam pierścień nie uruchamiają akcji.

Przy emulowanym `safe-area-inset-bottom: 34px` dopełnienie paska wynosi 50 px. Nad obszarem bezpiecznym pozostaje 112 px koła (87,5% wysokości), a ikona w całości leży powyżej tego obszaru. Emulację wykonano przez protokół Chromium, bez zmiany CSS aplikacji na potrzeby testu. Nie zastępuje to kontroli fizycznego iPhone'a.

## Zrzuty

Dokładnie osiem plików PNG wymaganych przez issue; wszystkie obejrzano. Kontrolowany zegar wskazuje 1:00. W pauzie widoczny jest także fokus klawiatury.

- 360×800, praca: [ciemny](work-dark-360x800.png), [jasny](work-light-360x800.png).
- 360×800, pauza: [ciemny](paused-dark-360x800.png), [jasny](paused-light-360x800.png).
- 390×844, praca: [ciemny](work-dark-390x844.png), [jasny](work-light-390x844.png).
- 390×844, pauza: [ciemny](paused-dark-390x844.png), [jasny](paused-light-390x844.png).

Surowych pomiarów JSON nie dodano do repozytorium. Pozostają w ignorowanych wynikach testów i folderze tymczasowym zadania.

## Definition of done

- `npm run typecheck`: PASS, kod 0.
- `npm run lint`: PASS, kod 0, bez błędów i ostrzeżeń.
- `npm test`: 408 PASS / 0 FAIL / 0 SKIP, 40 plików.
- `npm run build`: PASS, kod 0, wygenerowane pliki PWA.
- Celowane testy jednostkowe odtwarzacza: 88 PASS / 0 FAIL / 0 SKIP, 8 plików.
- Celowane E2E rozmiarów tekstu i przycisku: 12 PASS / 0 FAIL / 0 SKIP / 0 flaky.
- Regresja E2E: `playerPrimaryButton`, `playerTextSizes`, `playerPreparation`, `playerExit`, `accessibility`: 99 PASS / 0 FAIL / 0 SKIP / 0 flaky. Wszystkie trzy rozdzielczości E2E, oba motywy; axe bez naruszeń od poziomu moderate.
- Osobny ponowny przebieg `playerPrimaryButton.spec.ts`, jeden worker: 6 PASS / 0 FAIL / 0 SKIP / 0 flaky. Ponowne zrzuty mają identyczne SHA-256.
- `git diff --check`: PASS. Brak nowych `any`, `@ts-ignore` i `eslint-disable`.

Pierwszy przebieg nowego testu wykrył rzeczywiste przewinięcie przy fokusie; naprawiono je przez `overflow-clip`. Kolejny ujawnił niestabilny pomiar bezpośrednio po zmianie viewportu lub insetu. Test oczekuje teraz na rzeczywistą aktualizację CSS, bez stałych opóźnień; osobny przebieg potwierdził stabilność. Początkowy brak Javy w PATH rozwiązano przez użycie istniejącego JRE 21 wyłącznie w procesie testowym.

## Kontrola właściciela na iPhonie

- [ ] Zainstalowana PWA: praca i pauza, oba motywy; cała ikona i co najmniej 3/4 wysokości koła nad obszarem wskaźnika Home, poprawne trafianie w widoczną część koła, brak przewijania i nakładania podglądu.
- [ ] Safari bez instalacji: te same stany przy widocznym i zwiniętym pasku przeglądarki; ucięcie przy dolnej krawędzi widoku, działający dotyk i zachowany odstęp podglądu od koła.

## Problemy i ograniczenia

- P1/P2: brak wykrytych problemów w sprawdzonym zakresie.
- P3: powyższa kontrola na fizycznym iPhonie pozostaje do wykonania przez właściciela.
- P3: build zgłasza ostrzeżenie o paczkach większych niż 500 kB; optymalizacja paczek pozostaje poza zakresem.
- Kanwa Claude podana w issue nie była dostępna w narzędziu. Weryfikacja wizualna opiera się na wymiarach i kryteriach zapisanych w issue.

Bez scalenia, wdrożenia, dostępu do produkcji, odczytu lub ujawniania sekretów i płatnych API. Katalog referencyjny Figmy pozostał nietknięty. Commit i push wyłącznie na wskazanej gałęzi są dozwolone przez użytkownika.
