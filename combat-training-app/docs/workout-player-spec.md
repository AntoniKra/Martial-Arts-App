# Specyfikacja odtwarzacza treningu

## Zasada podstawowa

Po jednym kliknięciu „Start” aplikacja automatycznie przeprowadza użytkownika przez całą oś treningu. Gong sygnalizuje przejścia. Komunikaty głosowe nie należą do MVP.

## Timer

- duży okrągły timer;
- pierścień skraca się wraz z upływem czasu;
- liczba sekund jest zawsze widoczna;
- stan jest podpisany tekstem, nie tylko kolorem;
- obliczenia bazują na znaczniku końcowym (`deadline`), a nie na odejmowaniu 1 co sekundę;
- timer ma pozostać poprawny po chwilowym przełączeniu karty.

## Sterowanie

- `Poprzedni`: pierwsze kliknięcie restartuje aktualny element;
- drugie szybkie kliknięcie cofa do poprzedniego elementu;
- `Następny`: jedno kliknięcie przechodzi dalej;
- `Pauza/Wznów`: jeden przycisk ze zmienną ikoną;
- `−15 s` i `+15 s`: zmieniają bieżące odliczanie;
- brak osobnego przycisku „Powtórz rundę”.

Zakończenie ćwiczenia i całego treningu znajduje się w menu dodatkowym. Zakończenie treningu wymaga potwierdzenia.

## Informacja o kolejnym elemencie

Podczas rundy i przerwy pokazuj następny element. Po zakończeniu ćwiczenia nie przypominaj poprzedniego zadania.

Przykład:

- „Następnie: Tarcze”;
- „Jab → prawy prosty → low kick”;
- „Start za 01:24”.

## Ocena na gorąco

Podczas przerwy po ćwiczeniu widoczny jest opcjonalny przycisk „Oceń”. Skala pojawia się dopiero po kliknięciu. Timer nie zatrzymuje się. Brak reakcji przekłada ocenę na koniec treningu.

## Gong i ekran

- różne sygnały mogą oznaczać koniec pracy i koniec odpoczynku;
- ekran pozostaje aktywny przez Screen Wake Lock;
- po utracie widoczności aplikacja ponawia żądanie Wake Lock;
- brak obsługi API nie może przerwać treningu.

## Odzyskiwanie aktywnego treningu

Stan aktywnego treningu powinien umożliwiać wznowienie po odświeżeniu:

- bieżący element;
- czas końcowy lub pozostały czas przy pauzie;
- wykonane rundy i pominięcia;
- oceny podane na gorąco.
