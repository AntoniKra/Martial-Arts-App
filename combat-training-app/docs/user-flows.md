# Główne przepływy użytkownika

## Tworzenie i wykonanie

1. Start.
2. Utwórz trening.
3. Wybierz dyscyplinę.
4. Opcjonalnie wpisz nazwę i cel.
5. Dodaj bloki, ćwiczenia i przerwy.
6. Otwórz podgląd.
7. Wróć do edycji, zapisz na później albo zapisz i rozpocznij.
8. Przy rozpoczęciu zapisz `startedAt`.
9. Odtwarzacz prowadzi trening.
10. Użytkownik może oceniać ćwiczenia podczas przerwy.
11. Po zakończeniu przegląda wszystkie oceny i feedback.
12. Zapisuje raport w Historii.

## Plany i Historia

Ekran Treningi zawiera osobne zakładki:

- Plany — zapisane, jeszcze niewykonane treningi;
- Historia — zakończone treningi.

Plan nie ma wymaganej daty wykonania. Data historii wynika z rozpoczęcia.

## Trening spoza aplikacji

1. Na stronie głównej (pod ostatnimi sesjami) albo w Treningi › Historia wybierz **+ Dodaj trening spoza aplikacji**.
2. Wybierz datę do 7 dni wstecz, dyscyplinę i rodzaj. Dyscyplinę podpowiada najnowszy wpis, a bez wpisów trzeba ją wybrać.
3. Podaj cały czas zajęć, łącznie z rozgrzewką (60/90/120 min albo 1–480 min) i obowiązkowe RPE 0–10. Przy treningu sprzed co najmniej 3 dni zobaczysz wyjaśnienie „z pamięci”.
4. Jeżeli był sparing, podaj intensywność i opcjonalnie liczbę rund. Dla rodzaju „Sparing” sekcja jest zawsze otwarta.
5. Opcjonalnie zaznacz do 3 ćwiczeń celu, oceń kryteria, odpowiedz o poprzedniej notatce i dodaj problem oraz poprawkę. Przy „Mieszany” i „Kondycja” wybierz miejsce. Błąd odczytu ćwiczeń pozwala ponowić odczyt albo zapisać resztę bez zmiany ocen.
6. Opcjonalnie dodaj notatkę do treningu. **Zapisz** zgłasza błędy przy polach i ustawia fokus na pierwszym z nich. Przy możliwym dublu **Wróć do wpisu** nic nie zapisuje; **Tak, zapisz osobno** dodaje tylko osobny wpis, bez zmiany treningu z odtwarzacza.
7. Po lokalnym zapisie wracasz do miejsca otwarcia formularza; offline widzisz „Czeka na wysłanie”. W Historii i na Home wpis ma nazwę „Trening poza aplikacją · rodzaj”, samą datę i czas, bez realizacji. **Popraw** otwiera edycję, **Usuń wpis** działa jak dotąd. Wyjście z niezapisanymi zmianami wymaga decyzji w oknie „Odrzucić zmiany?”.
8. Edycja zachowuje ID, datę utworzenia i strefę. Chwila podania RPE zmienia się tylko przy zmianie wartości. Starszą zapisaną datę można zachować, ale nowa musi mieścić się w zakresie 7 dni. Trasa edycji wpisu z odtwarzacza pokazuje „Ten wpis można tylko usunąć.”.

## Profil: zgoda, pomiary i statystyki

1. Wybierz piątą zakładkę **Profil**. Statystyki są dostępne bez zgody: od początku oraz czas według rodzaju z ostatnich 4 tygodni. Niepełna historia, ładowanie i błąd mają jawne stany zamiast pozornych zer.
2. **Włącz zapisywanie masy ciała** otwiera osobny ekran informacji. Potwierdź pełnoletność i zgodę; **Włącz** działa dopiero po zaznaczeniu obu pól. **Nie teraz** wraca bez zapisu; pozostałe funkcje nie wymagają zgody.
3. **+ Dodaj pomiar**: wybierz dziś lub datę wsteczną, wpisz masę w kg przecinkiem lub kropką. Instrukcja przypomina o podobnych warunkach ważenia. Jeśli dzień ma pomiar, ostrzeżenie wyjaśnia zastąpienie. Zapis zachowuje datę utworzenia wcześniejszego pomiaru.
4. Zobacz średnią z 7 dni, liczbę pomiarów i wykres średnich z 12 tygodni. **Pokaż dane** rozwija tekstową tabelę, również z brakującymi tygodniami. Kategoria jest opcjonalną etykietą; puste pole ją usuwa.
5. Lista pokazuje 14 ostatnich pomiarów, **Pokaż wszystkie** rozwija resztę. **Popraw** zmienia masę dla wybranego dnia, **Usuń** wymaga potwierdzenia. Niewysłane dane mają opis „Czeka na wysłanie” i ostrzeżenie przy wylogowaniu.
6. **Wycofaj zgodę** otwiera okno z liczbą pomiarów i ostrzeżeniem o nieodwracalnym usunięciu. **Anuluj** lub Escape wraca do danych. **Usuń i wycofaj zgodę** wymaga połączenia: aplikacja pobiera z serwera wszystkie pomiary, usuwa je partiami i zeruje zgodę oraz kategorię na końcu. Bez sieci pokazuje komunikat i niczego nie usuwa; przerwany proces można ponowić. Po wycofaniu Profil pokazuje zaproszenie do zgody, a statystyki pozostają.

## Edycja po zakończeniu

Można poprawić:

- oceny ćwiczeń;
- RPE;
- koncentrację;
- dyskomfort;
- realizację celu;
- postęp;
- wnioski.

Nie można zmieniać:

- historycznej struktury treningu;
- rzeczywiście wykonanych rund;
- czasu rozpoczęcia i zakończenia;
- pominiętych elementów.

## Postęp i schowanie ćwiczenia celu

1. Otwórz **Postęp** i wybierz ćwiczenie celu z listy.
2. Przejrzyj wykres i podsumowania ocen osobno dla każdego miejsca; wszystkie oceny są też na liście z odnośnikami do podsumowań treningów.
3. Wybierz **Schowaj ćwiczenie celu**. Okno wymienia plany, z których zniknie oznaczenie CEL. Ćwiczenia zostają w planach, a oceny i wykres zostają w Postępie.
4. Potwierdź **Schowaj i zdejmij CEL** (albo **Schowaj**, gdy brak planów). Aplikacja wraca do listy, także offline; niezakończony zapis do serwera sygnalizuje „Czeka na wysłanie”.
5. Ćwiczenie jest dostępne w sekcji **Schowane (n)**. **Przywróć** przywraca je do wyboru w kreatorze, bez automatycznego oznaczania ćwiczeń w planach.

Jeżeli nie ma jeszcze żadnych wpisów `focusRatings`, zamiast chowania dostępne jest **Usuń ćwiczenie celu**, z potwierdzeniem i listą planów. Trwający trening zachowuje swoją kopię planu i zapisuje oceny normalnie.
