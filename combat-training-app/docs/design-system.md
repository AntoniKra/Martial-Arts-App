# System wizualny

## Kierunek

Prestiżowy, czarno-biały, lekko agresywny i czysty interfejs dla zawodników sportów walki.

Nie może wyglądać jak:

- gra komputerowa;
- plakat gali;
- neonowy panel futurystyczny;
- generyczna aplikacja fitness.

## Dark mode — wariant bazowy

- tło: prawie czarny grafit, nie czysta czerń;
- powierzchnie: stopniowane ciemne szarości;
- tekst: złamana biel;
- trzeci kolor: krwista czerwień używana oszczędnie;
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

Aktualne wartości obu motywów są w `src/styles/index.css`. `src/features/theme/themeColors.test.ts` pilnuje kontrastu co najmniej 4,5:1 dla wszystkich tokenów tekstu na każdym tle.

## Light mode

Light mode używa przewagi jasnej szarości i bieli, grafitowego tekstu oraz tej samej czerwieni. Komponenty nie mogą zakładać na stałe ciemnego tła.

Motyw wybierasz w Profilu → Ustawienia → Wygląd: Systemowy / Jasny / Ciemny. Domyślny jest Systemowy, reagujący na bieżące zmiany `prefers-color-scheme`. Dotychczasowe jawne wybory jasnego lub ciemnego motywu pozostają zapisane na urządzeniu. Nagłówek aplikacji i boczna nawigacja nie zawierają przełącznika motywu ani wylogowania; wylogowanie znajduje się w Profilu → Konto.

Profil używa spokojnych kart `surface` z ramką i etykietami sekcji wersalikami 11 px. Masa ciała, Samopoczucie i Statystyki są domyślnie zwinięte: przycisk z `aria-expanded` pokazuje najważniejsze podsumowanie, a po rozwinięciu szczegóły. Wykres masy ciała pojawia się od dwóch pomiarów.

## Geometria

- kanciaste rogi lub radius 0–4 px;
- większe zaokrąglenie tylko tam, gdzie wynika z funkcji, np. okrągły timer;
- żadnego glassmorphismu;
- brak ozdobnych gradientów;
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
- czerwony tekst zawsze przez `text-crimson-ink`, nigdy `text-crimson`;
- każdy ekran ma jeden obszar `<main>`. Testy E2E (axe) blokują naruszenia od poziomu `moderate`.

## Migracja Figmy

Postęp i Historia (#180) korzystają z HTML właściciela: Postęp C z wykresem „5 → 12 tygodni”, Historia jako dziennik tygodniowy. Postęp ma trzy kafelki, pasek dni, szerokie słupki z liczbami w jednym rzędzie, karty elementów do poprawy oraz kafelki szczegółów 2×2. Wykres nie ma legendy; kreska planu używa tokenu tekstu, bieżący słupek akcentu. Rozwinięcie trwa 300 ms, przy `prefers-reduced-motion` bez animacji. Historia ma zwarte wiersze rozwijające dotychczasowe szczegóły, przerwy między tygodniami i kalendarz miesiąca. Wyszukiwanie obejmuje nazwy i notatki. Zrzuty nie są częścią tego zadania, zgodnie z poleceniem właściciela.

Start v2 (#154) korzysta z HTML w komentarzu właściciela: data, karta „Dziś” albo „Szybki start”, zaległe zajęcia do 7 dni, podsumowanie siedmiu dni i jedna ostatnia sesja. Samopoczucie pozostaje na dole, wyłącznie po zgodzie. Karta „Dziś” otwiera istniejący ręczny wpis z datą, dyscypliną, minutami i częściami; RPE oraz szczegóły sparingu pozostają puste. Przycisk jest dostępny także przed końcem zajęć. Zgodnie z treścią issue główna akcja jest w dolnej połowie pierwszego ekranu 390×844, ma co najmniej 56 px; na telefonie karta rezerwuje na to miejsce, a na komputerze jest zwarta. Dzień bez zajęć pokazuje następny zaplanowany trening oraz Szybki start. Wiersz „Stoper i inne plany” ma bezpośrednie odnośniki do stopera i listy planów. Symbole dni i tekstowe opisy statusów działają niezależnie od koloru. Planowanie, zaliczanie, przenoszenie z cofnięciem i „Nie byłem” używają mechanizmów z #164 / ADR 0018, bez zmiany modelu danych.

Plan tygodnia (#176) odwzorowuje makiety A i panelu z dołu z komentarza właściciela: marginesy telefonu 16 px, odstępy sekcji 10 px, nagłówek Archivo 28 px/800, strzałki tygodnia i kwadratowe + 44 px, pasek postępu 4 px, kolumna dnia 44 px i odstęp 10 px. Dziś ma pionowy pasek akcentu i „DZIŚ”. Karta „Stały tydzień” nad przełącznikiem tygodni zawiera ikonę powtarzania, podsumowanie klub/własny i strzałkę. Pozycje mają przycisk ⋯ z nazwą oraz status ikoną i słowem; bez osobnego tokenu sukcesu używamy neutralnej ramki z ✓. Sekcja „Dowolny dzień · kiedy pasuje” ma krótki nagłówek i + Dodaj. Podsumowanie tygodnia jest jednym rozwijanym wierszem z liczbą treningów, minutami i obciążeniem. Formularz istnieje tylko w jednym panelu modalnym z dołu, z X, tłem, kontrolą fokusu i Wstecz; po zapisie znika. Powtarzaj co tydzień jest domyślnie wyłączone i nie występuje w edycji stałego tygodnia. Nie dodajemy odpoczynku; pusty dzień oznacza odpoczynek. Kolory i fonty pochodzą wyłącznie z tokenów obu motywów. Układ Startu i obliczenia wykresów pozostają bez przebudowy.

Najpierw odtwórz zatwierdzony ekran 1:1. Nie łącz migracji wizualnej z przebudową logiki. Każde ulepszenie UX zgłaszaj osobno.
