# Specyfikacja kreatora treningu

## Informacje początkowe

- dyscyplina — wymagana;
- nazwa — opcjonalna;
- główny cel — opcjonalny;
- data i godzina nie są wybierane; `startedAt` zapisuje się przy rozpoczęciu.

Nazwa automatyczna po rozpoczęciu: „{Dyscyplina} — {data}”.

## Oś treningu

Kreator prezentuje bloki i elementy w kolejności odtwarzania. Użytkownik może:

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

## Konfiguracja rundowa

Gdy przed miejscem wstawienia nie ma ćwiczenia rundowego, nowe ćwiczenie startuje od:

- 3 rund;
- 3:00 pracy;
- 1:00 odpoczynku.

Szybkie opcje:

- rundy: 1, 2, 3, 4, 5, własna;
- runda: 1:00, 1:30, 2:00, 3:00, własna;
- odpoczynek: 0:30, 1:00, 1:30, 2:00, własny.

Gotowe formaty, zawsze te same, nie są zapisywane w planie:

- 3 × 3:00 · przerwa 1:00;
- 3 × 3:00 · przerwa 0:30.

Stuknięcie formatu ustawia naraz liczbę rund, czas rundy i przerwę. Każdą wartość można potem zmienić. Format jest zaznaczony tylko wtedy, gdy wszystkie trzy wartości się zgadzają.

Gdy liczba rund wynosi 1, sekcja przerwy między rundami jest ukryta. W jej miejscu widać informację, że przerwy między rundami wtedy nie ma, a przerwę po ćwiczeniu dodaje się w bloku jako element „Przerwa”. Wcześniej ustawiony czas tej przerwy zostaje w planie i wraca na ekran, gdy liczba rund znowu jest większa niż 1. Odtwarzacz się nie zmienia.

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
- ćwiczenia i przerwy;
- aktywną pracę, odpoczynek i czas całkowity;
- liczbę ćwiczeń i rund.

Działania:

- Wróć do edycji;
- Zapisz na później;
- Zapisz i rozpocznij.

Niezakończony formularz może być zachowany lokalnie. Zapis w chmurze następuje po świadomej akcji użytkownika.

Edycja istniejącego planu ma obok podglądu przycisk „Zapisz zmiany”. Zapisuje od razu, z tą samą walidacją co podgląd, i jest aktywny tylko wtedy, gdy plan został zmieniony. Nowy plan nadal przechodzi przez podgląd.

## Niezapisane zmiany

Gdy plan został zmieniony i nie został zapisany, odejście z kreatora pyta „Odrzucić zmiany?”. Dotyczy to „Anuluj”, „Wróć do treningów”, wstecz przeglądarki i głównej nawigacji. „Wróć do edycji” zostawia zmiany; „Odrzuć zmiany” wychodzi bez zapisu. Odświeżenie i zamknięcie karty korzystają z komunikatu przeglądarki. Biblioteka ćwiczeń i konfiguracja ćwiczenia mają własne cofanie i nie pytają. Po udanym zapisie pytania nie ma.
