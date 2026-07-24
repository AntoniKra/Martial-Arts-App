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

Domyślne wartości pierwszego ćwiczenia:

- 3 rundy;
- 3:00 pracy;
- 1:00 odpoczynku.

Szybkie opcje:

- rundy: 1, 2, 3, 4, 5, własna;
- runda: 1:00, 1:30, 2:00, 3:00, własna;
- odpoczynek: 0:30, 1:00, 1:30, 2:00, własny.

Następne ćwiczenie w tym samym bloku dziedziczy ustawienia poprzedniego.

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
