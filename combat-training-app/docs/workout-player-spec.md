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

## Oceny po treningu

Oceny ćwiczeń są zbierane po treningu na ekranie podsumowania (decyzja P1 z issue #72). W odtwarzaczu, także podczas przerwy, nie ma przycisku „Oceń”. Po ukończeniu albo wcześniejszym zakończeniu treningu z wykonaną pracą aplikacja zapisuje sesję, a następnie otwiera `/workout-sessions/:sessionId/feedback`.

Podsumowanie pokazuje ćwiczenia celu z kryterium i skalą 1–5 lub opcją „Nie umiem ocenić”. Pozostałe ćwiczenia można opcjonalnie ocenić w rozwijanej sekcji „Oceń pozostałe ćwiczenia”; oceny trafiają do `exerciseRatings[].rating`. Oceniać można ćwiczenia z co najmniej jednym ukończonym etapem pracy. „Gotowe” dopisuje oceny i notatkę do istniejącej sesji, po czym otwiera Historię. Do podsumowania można wrócić z wpisu w Historii.

## Gong i ekran

- różne sygnały mogą oznaczać koniec pracy i koniec odpoczynku;
- ekran pozostaje aktywny przez Screen Wake Lock;
- po utracie widoczności aplikacja ponawia żądanie Wake Lock;
- brak obsługi API nie może przerwać treningu.

## Odzyskiwanie aktywnego treningu

Decyzje właściciela i techniczne z 8 listopada 2026, issue #65 (Q8):

- Po zalogowaniu i potwierdzeniu adresu e-mail aplikacja sprawdza zapis dla bieżącego `uid`. Jeśli trening można odzyskać, od razu otwiera `/workouts/:workoutId/active`.
- Krótka przerwa nie zatrzymuje zegara. Przykład: w rundzie 2 z 3 zostało 1:20; po zamknięciu aplikacji na 40 s zostaje 0:40. Odtwarzacz nadrabia także kolejne etapy, według ich terminów końcowych. Nie odtwarza gongów z czasu nieobecności.
- Pauza zachowuje dokładny pozostały czas w milisekundach. Przygotowanie zachowuje swój termin końcowy; jego upływ rozpoczyna sesję w oryginalnym terminie, bez doliczania przygotowania do pracy ani czasu treningu.
- Długa przerwa oznacza, że podczas nieobecności skończyłby się cały plan albo od ostatniej aktywności minęło ponad 12 h, także podczas pauzy. Wtedy modalne okno „Niedokończony trening” pokazuje nazwę planu, datę i godzinę ostatniej aktywności oraz dwa przyciski: „Zapisz to, co zrobione” i „Porzuć”.
- „Zapisz to, co zrobione” tworzy wpis `partial`, liczony wyłącznie do `lastSeenAt`, i otwiera podsumowanie treningu (`/workout-sessions/:sessionId/feedback`), gdzie można uzupełnić oceny. Praca po tej chwili nie jest doliczana. Dokończone rundy, pominięcia i powtórzone próby zachowują zasady ADR 0005. Bez żadnej dokończonej pracy zapis jest kasowany bez pytania. „Porzuć” kasuje zapis i otwiera ekran główny.

### Zapis lokalny

- Repozytorium z `src/application` ma implementację w `src/infrastructure/storage`. Dane trafiają do `localStorage` pod kluczem `combat-training.activeWorkout.<uid>`, z `schemaVersion: 1` i walidacją `zod/mini`. Błędny, niezgodny ze schematem lub nieczytelny zapis jest usuwany bez komunikatu; niedostępna pamięć nie zatrzymuje odtwarzacza.
- Zapis zawiera niezmienną kopię planu, bieżący etap, status (także `preparing`), termin końca lub dokładny czas pauzy oraz stan rejestratora: identyfikator sesji, `startedAt`, strefę czasową, próby, wyniki etapów, pominięcia i oceny. Zachowuje też `lastSeenAt` oraz zakończoną sesję oczekującą na zapis. Edycja lub usunięcie planu nie wpływa na wznowienie; lokalny odtwarzacz nie czeka na załadowanie Firestore.
- Stan jest zapisywany przy zmianach odtwarzacza i rejestratora (start, pauza, wznowienie, przejście, pominięcie, ocena), przy `visibilitychange` do `hidden` i przy `pagehide`, z `lastSeenAt = now`. Odliczanie w ukrytej karcie nie nadpisuje zapisu ostatniej widocznej aktywności.
- Zapis znika po przyjęciu wpisu przez lokalną pamięć Firestore, bez czekania na serwer, po „Porzuć”, po wylogowaniu (razem z czyszczeniem pamięci Firestore) i przy wyjściu z przygotowania. Błąd zapisu wpisu pozostawia możliwość ponowienia z tym samym identyfikatorem sesji.
- Po wznowieniu widoczny jest przycisk „Dźwięk wyłączony — stuknij, aby włączyć”. Stuknięcie wywołuje `unlockGong` i usuwa przycisk. Inne sterowanie wymagające dźwięku również może go odblokować gestem użytkownika.
- Kilka kart z tym samym treningiem i synchronizacja między urządzeniami pozostają poza zakresem: wygrywa ostatni zapis. Powrót z ukrytej karty bez przeładowania zachowuje dotychczasowe zasady nadrabiania czasu.
