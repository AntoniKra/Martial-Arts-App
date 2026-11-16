# System wizualny

## Kierunek

Kierunek „Karmazyn z żarem” (ADR 0019, #184): prestiżowy, lekko agresywny i czysty interfejs dla zawodników sportów walki. Czerwień prowadzi, pomarańczowy żar pojawia się w akcentach. Gradienty na przyciskach głównych, liniach, wykresach i dekoracji głównej karty Startu są zatwierdzone przez właściciela.

Nie może wyglądać jak:

- gra komputerowa;
- plakat gali;
- neonowy panel futurystyczny;
- generyczna aplikacja fitness.

## Dark mode — wariant bazowy

- tło: prawie czarny grafit, nie czysta czerń;
- powierzchnie: stopniowane ciemne szarości;
- tekst: złamana biel;
- karmazynowe gradienty i oszczędne akcenty żaru;
- cienkie obramowania zamiast ciężkich cieni.

Tokeny prototypu Figmy są dobrym punktem wyjścia:

- `#0B0B0D` — tło;
- `#171719` — surface;
- `#1D1D20` — elevated;
- `#2A2A2E` — border;
- `#F4F4F1` — primary text;
- `#A7A7AA` — secondary text;
- `#85858A` — tertiary text (`faint`, małe etykiety);
- `#C1122F` — crimson accent (tła przycisków, obramowania, akcenty);
- `#EF5D6E` — czerwień tekstu (`crimson-ink`), bo `#C1122F` jest za ciemna dla małego tekstu na prawie czarnym tle.
- `#F0753A` — żar (`ember`), dekoracje i końce gradientów;
- `#3FB56B` — obramowanie wolnego dnia (`success`), `#8FD8A8` — tekst (`success-ink`);
- `#4A4A4F` — miniony niewykonany dzień (`missed`), z kontrastowym tekstem `on-accent`.

Gradienty są zmiennymi CSS `--app-grad-primary`, `--app-grad-accent`, `--app-grad-bar-current`, `--app-grad-bar-past` i `--app-grad-plus`. Przycisk główny ma Archivo wersalikami, radius 4 px, tekst `on-accent` i gradient główny; wyłączony nie ma gradientu. Dolne menu ma romb 36 px obrócony o 45°, wysunięty o około 24 px, z prostą ikoną + 24 px, obwódką tła 3 px i żaru 1 px (55%). Aktywna pozycja ma górną linię gradientu 2 px i ikonę `crimson-ink`. Menu boczne ma spójne akcenty bez rombu.

Kółka tygodnia (wspólne dla Startu i Postępu) mają 26 px, bez legendy: wykonany — gradient główny i ✓; zaplanowany — przerywana ramka 2 px `crimson-ink`; wolne i odpoczynek — ramka 2 px `success` oraz tło 12%; miniony niewykonany i „Nie byłem” — `missed` i –. Dziś ma tekst `ink` i kreskę 2 px `crimson-ink` pod kółkiem. Plakietki statusów, trendu i RPE są prostokątne (radius 0): zaliczone oraz RPE w gradiencie, „Nie byłem” na szarym tle, „Plan” z przerywaną ramką, poprawa z ramką `success` i tekstem `success-ink`.

Aktualne wartości obu motywów są w `src/styles/index.css`. `src/features/theme/themeColors.test.ts` pilnuje kontrastu co najmniej 4,5:1 dla wszystkich tokenów tekstu na każdym tle.

## Light mode

Light mode używa przewagi jasnej szarości i bieli, grafitowego tekstu oraz tej samej czerwieni. Komponenty nie mogą zakładać na stałe ciemnego tła.

Gradienty mają te same odcienie co w ciemnym motywie. `success-ink` i `ember-ink` mają ciemniejsze warianty dla czytelności. Dekoracja burzy ma około 60% krycia.

Motyw wybierasz w Profilu → Ustawienia → Wygląd: Systemowy / Jasny / Ciemny. Domyślny jest Systemowy, reagujący na bieżące zmiany `prefers-color-scheme`. Dotychczasowe jawne wybory jasnego lub ciemnego motywu pozostają zapisane na urządzeniu. Nagłówek aplikacji i boczna nawigacja nie zawierają przełącznika motywu ani wylogowania; wylogowanie znajduje się w Profilu → Konto.

Profil używa spokojnych kart `surface` z ramką i etykietami sekcji wersalikami 11 px. Masa ciała, Samopoczucie i Statystyki są domyślnie zwinięte: przycisk z `aria-expanded` pokazuje najważniejsze podsumowanie, a po rozwinięciu szczegóły. Wykres masy ciała pojawia się od dwóch pomiarów.

## Geometria

- kanciaste rogi lub radius 0–4 px;
- większe zaokrąglenie tylko tam, gdzie wynika z funkcji, np. okrągły timer;
- żadnego glassmorphismu;
- gradienty dozwolone na przyciskach głównych, akcentach, wykresach i dekoracji karty Startu;
- plakietki statusów i RPE bez zaokrągleń;
- subtelne ukośne linie i motywy sportów walki są dopuszczalne.

## Typografia

- nagłówki: Archivo;
- tekst UI: Inter;
- liczby timera: cyfry tablicowe;
- uppercase wyłącznie dla krótkich etykiet i stanów.

## Dostępność

- minimalny obszar dotyku około 44×44 px;
- nie koduj stanu wyłącznie kolorem;
- zachowuj widoczne focus states;
- przyciski treningowe muszą być używalne podczas zmęczenia;
- respektuj `prefers-reduced-motion`;
- burza jest statyczna: piorun z odgałęzieniami, mały piorun, iskry-romby, jasna górna krawędź i delikatne ukośne smugi; SVG ma `aria-hidden="true"` i `pointer-events: none`, treść leży nad nim, tekst omija najjaśniejszą część dekoracji;
- każde kółko dnia ma `role="img"` i pełny `aria-label` ze stanem i informacją „dziś”; symbole ✓ i – uzupełniają kolory;
- przycisk powrotu do bieżącego tygodnia ma widoczny napis „Dziś” oraz `aria-label="Dziś — Wróć do bieżącego tygodnia"`, z widocznym napisem na początku nazwy (WCAG 2.5.3);
- nowe kolory tekstu oraz tekst na każdym punkcie gradientu przycisku mają kontrast co najmniej 4,5:1; testy obejmują oba motywy;
- czerwony tekst zawsze przez `text-crimson-ink`, nigdy `text-crimson`;
- każdy ekran ma jeden obszar `<main>`. Testy E2E (axe) blokują naruszenia od poziomu `moderate`.

## Migracja Figmy

Aktualizacja premium (#184) ma pierwszeństwo nad opisami wcześniejszych migracji poniżej. Start nie ma widocznego nagłówka (zachowuje jeden ukryty h1 „Start”); data jest w etykiecie głównej karty z burzą we wszystkich stanach. Główna akcja pozostaje w dolnej połowie ekranu 390×844. Pasek tygodnia ma 6 px i gradient akcentu. Postęp: linie żaru 2 px na kafelkach, karmazynowe słupki, pięć gradientowych pól ocen, a bez ocen przerywana karta „Jeszcze bez ocen” / „Ocenisz po najbliższym treningu”. Kafelki „Więcej” są równe, około 112 px, opis przy dolnej krawędzi. Plan tygodnia: strzałka 44×44 i tytuł w jednym wierszu, ikona stałego tygodnia w kwadracie 40×40, pasek celu 6 px, pionowy gradient 3 px przy dziś, znacznik „wolne” przy pustych dniach. Na innym tygodniu przycisk „Dziś” z kalendarzem znajduje się przed strzałką następnego tygodnia i wraca do bieżącego. Modele, reguły i obliczenia pozostają bez zmian.

Postęp i Historia (#180) korzystają z HTML właściciela: Postęp C z wykresem „5 → 12 tygodni”, Historia jako dziennik tygodniowy. Postęp ma trzy kafelki, pasek dni, szerokie słupki z liczbami w jednym rzędzie, karty elementów do poprawy oraz kafelki szczegółów 2×2. Wykres nie ma legendy; kreska planu używa tokenu tekstu, bieżący słupek akcentu. Rozwinięcie trwa 300 ms, przy `prefers-reduced-motion` bez animacji. Historia ma zwarte wiersze rozwijające dotychczasowe szczegóły, przerwy między tygodniami i kalendarz miesiąca. Wyszukiwanie obejmuje nazwy i notatki. Zrzuty nie są częścią tego zadania, zgodnie z poleceniem właściciela.

Start v2 (#154) korzysta z HTML w komentarzu właściciela: data, karta „Dziś” albo „Szybki start”, zaległe zajęcia do 7 dni, podsumowanie siedmiu dni i jedna ostatnia sesja. Samopoczucie pozostaje na dole, wyłącznie po zgodzie. Karta „Dziś” otwiera istniejący ręczny wpis z datą, dyscypliną, minutami i częściami; RPE oraz szczegóły sparingu pozostają puste. Przycisk jest dostępny także przed końcem zajęć. Zgodnie z treścią issue główna akcja jest w dolnej połowie pierwszego ekranu 390×844, ma co najmniej 56 px; na telefonie karta rezerwuje na to miejsce, a na komputerze jest zwarta. Dzień bez zajęć pokazuje następny zaplanowany trening oraz Szybki start. Wiersz „Stoper i inne plany” ma bezpośrednie odnośniki do stopera i listy planów. Symbole dni i tekstowe opisy statusów działają niezależnie od koloru. Planowanie, zaliczanie, przenoszenie z cofnięciem i „Nie byłem” używają mechanizmów z #164 / ADR 0018, bez zmiany modelu danych.

Plan tygodnia (#176) odwzorowuje makiety A i panelu z dołu z komentarza właściciela: marginesy telefonu 16 px, odstępy sekcji 10 px, nagłówek Archivo 28 px/800, strzałki tygodnia i kwadratowe + 44 px, pasek postępu 4 px, kolumna dnia 44 px i odstęp 10 px. Dziś ma pionowy pasek akcentu i „DZIŚ”. Karta „Stały tydzień” nad przełącznikiem tygodni zawiera ikonę powtarzania, podsumowanie klub/własny i strzałkę. Pozycje mają przycisk ⋯ z nazwą oraz status ikoną i słowem; bez osobnego tokenu sukcesu używamy neutralnej ramki z ✓. Sekcja „Dowolny dzień · kiedy pasuje” ma krótki nagłówek i + Dodaj. Podsumowanie tygodnia jest jednym rozwijanym wierszem z liczbą treningów, minutami i obciążeniem. Formularz istnieje tylko w jednym panelu modalnym z dołu, z X, tłem, kontrolą fokusu i Wstecz; po zapisie znika. Powtarzaj co tydzień jest domyślnie wyłączone i nie występuje w edycji stałego tygodnia. Nie dodajemy odpoczynku; pusty dzień oznacza odpoczynek. Kolory i fonty pochodzą wyłącznie z tokenów obu motywów. Układ Startu i obliczenia wykresów pozostają bez przebudowy.

Najpierw odtwórz zatwierdzony ekran 1:1. Nie łącz migracji wizualnej z przebudową logiki. Każde ulepszenie UX zgłaszaj osobno.
