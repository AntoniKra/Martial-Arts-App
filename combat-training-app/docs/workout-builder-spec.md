# Specyfikacja kreatora treningu

Issue #164: trening własny w planie tygodnia może wskazywać zatwierdzony plan kreatora. „Start” uruchamia go w dotychczasowym odtwarzaczu; dostępny jest tylko przy istniejącym wskazanym planie treningu własnego. Zajęcia klubowe nie mają „Start”. Link „Wpisz trening” podpowiada datę, dyscyplinę, części i czas w ręcznym wpisie, bez domyślnego RPE; użytkownik może poprawić podpowiedzi. Nie zmienia to kreatora ani logiki odtwarzacza.

## Informacje początkowe

- dyscyplina — wymagana;
- nazwa — opcjonalna;
- główny cel — opcjonalny;
- data i godzina nie są wybierane w kreatorze; `createdAt` powstaje przy utworzeniu szkicu, a `startedAt` sesji przy rozpoczęciu pierwszego etapu.

Jeśli użytkownik nie wpisze nazwy, kreator i podgląd pokazują „{Dyscyplina} — {DD.MM.RRRR}”. Data pochodzi z `createdAt` szkicu, w UTC. Edycja zachowuje pierwotne `createdAt` planu. Jeśli daty nie da się odczytać, nazwa ma postać „{Dyscyplina} — plan treningu”.

## Oś treningu

Kreator prezentuje bloki i elementy w kolejności odtwarzania. Rodzaje bloków, w kolejności na liście:

- Rozgrzewka;
- Technika;
- Tarcze;
- Worek;
- Sparing;
- Kondycja;
- Siła i motoryka;
- Rozluźnienie.

Rozluźnienie ma ten sam wygląd karty i te same ustawienia początkowe nowego ćwiczenia co rozgrzewka. Nie zmienia rodzaju treningu w dzienniku.

Użytkownik może:

- dodać blok;
- dodać ćwiczenie;
- dodać osobną przerwę;
- edytować, duplikować i usuwać ćwiczenie;
- przesuwać elementy strzałkami góra/dół.

Drag and drop nie należy do MVP.

## Biblioteka

Biblioteka jest filtrowana automatycznie według:

1. dyscypliny całego treningu;
2. rodzaju aktualnego bloku.

MVP zawiera:

- wyszukiwarkę tekstową;
- pełne polskie nazwy kombinacji ze strzałkami;
- całą klikalną kartę z subtelnym symbolem `+`;
- zakładki „Biblioteka” i „Własne ćwiczenie”.

Karta nie pokazuje tagów, liczby technik ani listy dyscyplin.

Issue #161: wbudowana biblioteka zawiera 86 zatwierdzonych pozycji z `exercise-library-draft.csv`, z zachowaniem 38 starych ID. Filtr „Kategoria” zawęża wbudowane pozycje, łączy się z wyszukiwaniem oraz filtrami dyscypliny i bloku. Prywatne definicje nie mają kategorii, więc są widoczne przy „Wszystkie kategorie”; włączenie „Moje” zeruje i wyłącza filtr kategorii. „Kopiuj do moich” zachowuje typ i domyślne parametry źródłowej pozycji. Bez zmian dziedziczenia ustawień przy dodawaniu wbudowanego ćwiczenia do planu.

Issue #156 / ADR 0017: biblioteka łączy pozycje wbudowane z aktywnymi „Moimi ćwiczeniami”. Wyszukiwanie przy pisaniu pomija polskie znaki, wielkość liter i strzałki, dopasowuje też fragment nazwy. Chipy dyscypliny i bloku są domyślnie włączone według planu; można je wyłączyć i włączyć filtr „Moje”. Pusta fraza pokazuje do pięciu ostatnio użytych Moich, potem pozostałe ulubione i resztę alfabetycznie. Gwiazdka ma dostępną nazwę i stan. Pusty wynik oferuje utworzenie wpisanej nazwy w Moich. Wbudowane ćwiczenie można skopiować do prywatnej biblioteki z nowym ID i pochodzeniem; nie edytujemy źródła.

Własne ćwiczenie domyślnie zapisuje się do Moich po zatwierdzeniu parametrów, z dyscypliną i rodzajem bloku z planu; opcja „Tylko w tym planie” zachowuje dotychczasowy wariant bez ID biblioteki. Wybór prywatnej pozycji zaczyna od jej zapisanych parametrów, a wbudowane i jednorazowe nadal dziedziczą ustawienia według zasad poniżej. Ekran „Moje ćwiczenia” w Treningach umożliwia zmianę nazwy, dyscyplin, bloków i parametrów; typ zmieniamy wyłącznie przez utworzenie nowej pozycji. Archiwizacja i przywrócenie nie zmieniają planów i historii.

## Konfiguracja rundowa

Gdy przed miejscem wstawienia nie ma ćwiczenia rundowego, nowe ćwiczenie startuje od:

- 3 rund;
- 3:00 pracy;
- 1:00 odpoczynku.

Ekran „Ćwiczenie” (#260) ustawia wartości stepperami:

- rundy: krok 1, zakres 1–99;
- czas rundy: krok 15 s, zakres 0:01–1440:00 (86 400 s);
- przerwa między rundami: krok 15 s, zakres 0:00–1440:00;
- czas ćwiczenia ciągłego: krok 15 s, zakres 0:01–1440:00.

Wartość spoza siatki 15 s przechodzi przy kroku do najbliższej wielokrotności 15 s w danym kierunku (1:40 + 15 s → 1:45, 1:40 − 15 s → 1:30). Przycisk na granicy zakresu jest wyłączony. Steppery pokazują czas w formacie `m:ss`. Dotknięcie wartości otwiera wpis: rundy jako liczba całkowita, czas jako `m:ss` albo liczba sekund. Pod polem na bieżąco widać poprawnie odczytany czas, np. wpisane `90` daje `1:30`. Enter zatwierdza wpis, a Esc go anuluje. Próba zatwierdzenia błędnego wpisu pokazuje komunikat i zachowuje poprzednią wartość. Logika kroków i odczyt wpisu są czystymi funkcjami (`exerciseStepper.ts`).

Gotowe formaty, zawsze te same, nie są zapisywane w planie:

- 3 × 3:00 · przerwa 1:00;
- 3 × 3:00 · przerwa 0:30;
- 5 × 3:00 · przerwa 1:00.

Stuknięcie formatu ustawia naraz liczbę rund, czas rundy i przerwę. Każdą wartość można potem zmienić. Format jest zaznaczony tylko wtedy, gdy steppery mają dokładnie jego wartości. Szybki timer ma osobny zestaw formatów.

Pod stepperami pasek struktury pokazuje segment na każdą rundę i każdą przerwę między rundami (szerokość proporcjonalna do czasu) oraz łączny czas ćwiczenia; aktualizuje się na żywo.

Ekran nosi tytuł „Ćwiczenie” podczas dodawania i edycji. Dolny przycisk to „Zatwierdź ćwiczenie” przy dodawaniu i „Zapisz zmiany” przy edycji. Element do poprawy zapisuje się razem z ćwiczeniem po użyciu dolnego przycisku albo „Gotowe”. Wybór elementu do poprawy działa jak na osi planu (zwinięcie po wyborze, „Zmień”, limit 3 w planie).

Gdy liczba rund wynosi 1, stepper przerwy między rundami jest ukryty. W jej miejscu widać informację, że przerwy między rundami wtedy nie ma, a przerwę po ćwiczeniu dodaje się w bloku jako element „Przerwa”. Wcześniej ustawiony czas tej przerwy zostaje w planie i wraca na ekran, gdy liczba rund znowu jest większa niż 1. Odtwarzacz się nie zmienia.

Nowe ćwiczenie jest dopisywane na końcu wybranego bloku. Tryb jest taki jak ostatnie ćwiczenie w tym samym bloku; pusty blok startuje od rund. Czas ćwiczenia ciągłego bierze z tego ostatniego ćwiczenia, gdy jest ciągłe, a w przeciwnym razie wynosi 5:00. Liczbę rund, czas rundy i przerwę bierze z ostatniego ćwiczenia rundowego od początku planu do miejsca wstawienia, także po przełączeniu z trybu ciągłego na rundowy. Ćwiczenie ciągłe i przerwa po drodze nie zmieniają tych wartości rund. Elementy w późniejszych blokach są pomijane. Edycja istniejącego ćwiczenia pokazuje jego własne wartości.

## Obliczenia

Dla ćwiczenia rundowego:

- praca = rundy × czas rundy;
- odpoczynek = (rundy − 1) × odpoczynek;
- po ostatniej rundzie nie dodaje się automatycznego odpoczynku;
- dodatkowa przerwa musi być osobnym elementem.

## Podgląd

Podgląd pokazuje:

- dyscyplinę, nazwę i cel;
- liczbę bloków, ćwiczeń, rund i elementów do poprawy oraz jeden szacowany łączny czas treningu;
- kolejność bloków, ćwiczeń i samodzielnych przerw. Przy ćwiczeniu rundowym widać liczbę rund, czas rundy i odpoczynku między rundami. Przy ćwiczeniu ciągłym i samodzielnej przerwie widać czas trwania. Jeśli dodano instrukcję, podgląd ją wyświetla.

Działania:

- „Zapisz plan” zatwierdza plan. Przy tworzeniu wraca do listy planów, a przy edycji otwiera szczegóły zapisanego planu. Uruchomienie treningu jest osobną akcją.
- „Wróć do edycji” lub przycisk cofania w nagłówku wraca do bieżącego szkicu.

Szkic pozostaje w stanie kreatora do zapisu lub opuszczenia ekranu. Zapis w Firestore następuje po świadomej akcji użytkownika.

Edycja istniejącego planu ma obok podglądu przycisk „Zapisz zmiany”. Zapisuje od razu, z tą samą walidacją co podgląd, i jest aktywny tylko wtedy, gdy plan został zmieniony. Nowy plan nadal przechodzi przez podgląd.

## Niezapisane zmiany

Gdy plan został zmieniony i nie został zapisany, odejście z kreatora pyta „Odrzucić zmiany?”. Dotyczy to „Anuluj”, „Wróć do treningów”, wstecz przeglądarki i głównej nawigacji. „Wróć do edycji” zostawia zmiany; „Odrzuć zmiany” wychodzi bez zapisu. Odświeżenie i zamknięcie karty korzystają z komunikatu przeglądarki. Biblioteka ćwiczeń i konfiguracja ćwiczenia mają własne cofanie i nie pytają. Po udanym zapisie pytania nie ma.
