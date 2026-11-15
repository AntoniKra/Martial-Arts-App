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

Plan tygodnia (#164) odwzorowuje HTML z komentarza właściciela: marginesy telefonu 16 px, górny odstęp 28 px, odstępy sekcji 14 px, nagłówek Archivo 28 px/800, strzałki tygodnia 44 px, pasek 6 px, siatka dnia 52 px + treść. Dziś ma pionową ramkę akcentu, podwyższoną powierzchnię i tekst „DZIŚ”. Stały tydzień jest jednym wierszem pod nagłówkiem, jedynym wejściem do jego edycji. Sekcja dowolnego dnia i automatyczne liczniki rodzajów zachowują hierarchię makiety. Formularz stałego tygodnia ma odstępy 22 px, nagłówek 26 px, pola 48 px i przycisk zapisu 56 px; przełączniki dni są dostępne klawiaturą i mają `aria-pressed`. Kolory i fonty wyłącznie z tokenów obu motywów. Status zawsze ma tekst lub symbol; nie jest oparty wyłącznie na kolorze. Układ Startu i istniejące wykresy pozostają bez przebudowy.

Najpierw odtwórz zatwierdzony ekran 1:1. Nie łącz migracji wizualnej z przebudową logiki. Każde ulepszenie UX zgłaszaj osobno.
