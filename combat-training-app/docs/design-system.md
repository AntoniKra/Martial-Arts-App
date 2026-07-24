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
- `#C1122F` — crimson accent.

## Light mode

Light mode używa przewagi jasnej szarości i bieli, grafitowego tekstu oraz tej samej czerwieni. Komponenty nie mogą zakładać na stałe ciemnego tła.

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
- respektuj `prefers-reduced-motion`.

## Migracja Figmy

Najpierw odtwórz zatwierdzony ekran 1:1. Nie łącz migracji wizualnej z przebudową logiki. Każde ulepszenie UX zgłaszaj osobno.
