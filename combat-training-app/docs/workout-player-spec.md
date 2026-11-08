# Specyfikacja odtwarzacza treningu

## Zasada podstawowa

Po jednym kliknięciu „Start” aplikacja automatycznie przeprowadza użytkownika przez całą oś treningu. Gong sygnalizuje przejścia. Komunikaty głosowe nie należą do MVP.

## Przygotowanie przed startem

- Na ekranie planu, nad „Rozpocznij trening”, ustawienie „Przygotowanie przed startem” ma opcje 5, 10, 15 i 30 s. Domyślnie 10 s (decyzja właściciela z 8 listopada 2026).
- Wybór jest zapamiętany na urządzeniu w `localStorage`, z walidacją `zod/mini`. Brak, błędna wartość lub niedostępna pamięć oznacza 10 s.
- Pierwszy „Start” uruchamia przygotowanie. „Uruchom ponownie” od razu rozpoczyna nowe przygotowanie. Nie ma go po pauzie ani między etapami czy blokami.
- Pierścień pokazuje pozostałe sekundy dużymi cyframi i napis „PRZYGOTUJ SIĘ”. Przycisk z ikoną startu „Zacznij teraz” pozwala od razu rozpocząć pierwszy etap.
- Przygotowanie kończy się gongiem startowym rundy i automatycznym przejściem do pierwszego etapu. Bez dodatkowych dźwięków odliczania.
- Czas wynika z terminu końcowego i bieżącego zegara. Po powrocie z ukrytej karty odtwarzacz nadrabia także czas pierwszego i kolejnych etapów. Wake Lock działa tak jak podczas treningu.
- Przygotowanie nie jest etapem sesji: nie trafia do `stepResults`, czasu pracy ani `durationSeconds`. `startedAt` wskazuje start pierwszego etapu (termin końca przygotowania albo wcześniejsze „Zacznij teraz”). Wyjście podczas przygotowania nie zapisuje treningu.

## Timer

- duży okrągły timer;
- pierścień skraca się wraz z upływem czasu;
- liczba sekund jest zawsze widoczna;
- stan jest podpisany tekstem, nie tylko kolorem;
- obliczenia bazują na znaczniku końcowym (`deadline`), a nie na odejmowaniu 1 co sekundę;
- timer ma pozostać poprawny po chwilowym przełączeniu karty.

## Sterowanie

- `Poprzedni`: jeśli od początku bieżącego etapu minęły ponad 3 sekundy, etap zaczyna się od nowa; jeśli mniej, odtwarzacz cofa do poprzedniego etapu. Na pierwszym etapie zawsze restartuje bieżący (decyzja z 4 listopada 2026);
- `Następny`: jedno kliknięcie przechodzi dalej;
- `Pauza/Wznów`: jeden przycisk ze zmienną ikoną;
- `−15 s` i `+15 s`: zmieniają bieżące odliczanie;
- brak osobnego przycisku „Powtórz rundę”.

Zakończenie ćwiczenia i całego treningu znajduje się w menu dodatkowym. „Zakończ wcześniej” wymaga potwierdzenia i zapisuje trening jako częściowy, jeśli była jakaś praca. Wyjście z odtwarzacza w trakcie treningu pyta: „Zakończ wcześniej”, „Porzuć” albo „Wróć” (`adr/0005-journal-entry-definitions.md`).

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
