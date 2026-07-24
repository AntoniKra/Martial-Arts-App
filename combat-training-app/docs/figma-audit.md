# Audyt prototypu Figma Make

## Pliki i technologie

Archiwum zawiera 11 plików. Główne elementy:

- React 19;
- TypeScript;
- Vite 8;
- Tailwind CSS 4;
- `src/App.tsx`: 2372 linie i około 92 KB;
- `src/index.css`: gotowe tokeny dark mode;
- brak backendu, routingu i trwałego zapisu.

`vite.config.ts` jest zależny od infrastruktury Figma Make i importuje `./.figma/make/site.json`, którego nie ma w archiwum. Nie przenosić go do aplikacji produkcyjnej.

## Ekrany obecne w prototypie

- Home;
- Workouts;
- Create Workout;
- Exercise Library;
- Configure Exercise;
- Preview;
- Active Workout;
- Post Workout;
- Workout Report.

## Wartościowe komponenty i wzorce

- Button;
- SegmentedControl;
- QuickSelect;
- RatingScale (`StarRating` mimo braku gwiazdek);
- CircularTimer;
- PlanCard;
- HistoryCard;
- BottomNav;
- badge dyscypliny i bloku;
- zatwierdzony system kolorów i typografii;
- klikalne karty biblioteki;
- blokada dyscypliny po dodaniu ćwiczenia;
- dziedziczenie rund z poprzedniego ćwiczenia;
- przycisk Poprzedni z dwuklikiem;
- opcjonalna ocena podczas odpoczynku.

## Co można selektywnie przenieść

- układ JSX ekranów;
- klasy Tailwind;
- tokeny CSS;
- ikony SVG;
- hierarchię informacji;
- responsywną szerokość mobilną;
- wygląd kart, ratingów i timera.

Każdy przeniesiony fragment należy rozdzielić na komponenty oraz przetłumaczyć na język polski.

## Logika, którą należy napisać od nowa

- routing oparty obecnie o pojedynczy stan `screen`;
- Supabase i anonimowe konto;
- model danych i repozytoria;
- walidacja;
- timer oparty obecnie na `setTimeout(... - 1)`;
- gong i obsługa audio;
- Wake Lock;
- wznowienie aktywnego treningu;
- wykonane/pominięte/częściowe rundy;
- rzeczywiste czasy;
- PWA;
- testy.

## Rozbieżności z ustaloną specyfikacją

1. Interfejs jest po angielsku.
2. Wszystkie ćwiczenia są rundowe; brak trybu ciągłego.
3. Brak osobnego elementu przerwy między ćwiczeniami.
4. Brak edycji istniejącego ćwiczenia w kreatorze.
5. Brak własnych wartości poza presetami QuickSelect.
6. Start treningu nie zapisuje rzeczywistego `startedAt`; czas jest tworzony dopiero przy ukończeniu.
7. Po ukończeniu kod zakłada 100% wykonania planu.
8. Podsumowanie rekonstruuje listę ćwiczeń z ocen przekazanych z odtwarzacza; nieocenione ćwiczenia mogą nie pojawić się do oceny.
9. Brak rozróżnienia planowanego i rzeczywistego czasu.
10. Brak gongu, countdownu przygotowawczego i Wake Lock.
11. `+15` jest ograniczone do pierwotnego czasu elementu, co uniemożliwia rzeczywiste wydłużenie ponad plan.
12. Dyskomfort jest prostą skalą 1–5 bez opisu.
13. Brak light mode.
14. Brak konfiguracji desktopowego panelu bocznego.
15. Biblioteka używa angielskich nazw bez neutralnych kluczy i tłumaczeń.

## Ryzyka kodu referencyjnego

- wszystkie typy, dane, ikony, komponenty i ekrany są w jednym pliku;
- dane są stałymi `PLANS`, `HISTORY`, `COMBOS`;
- `uid()` używa losowego skrótu, nie UUID;
- istnieją zależności stanów między ekranami, które utrudniają częściową edycję;
- `handleSavePlan()` używa bieżącego `draft`, nie zawsze obiektu oglądanego w Preview;
- brak testów zabezpieczających refaktoryzację.

## Zalecana kolejność migracji

1. tokeny CSS, fonty i ikony;
2. Button, SegmentedControl, RatingScale i CircularTimer jako czysto wizualny komponent;
3. AppLayout i BottomNavigation;
4. Home;
5. Plany/Historia;
6. Kreator i biblioteka;
7. Konfiguracja ćwiczenia i podgląd;
8. Odtwarzacz wizualny na mockach;
9. Feedback i raport;
10. Supabase i logika domenowa;
11. prawidłowy timer, gong i Wake Lock;
12. PWA i testy E2E.

## Wniosek

Prototyp jest wysokiej jakości wzorcem wizualnym i użytecznym źródłem JSX/CSS, ale nie powinien być produkcyjnym rdzeniem. Właściwa strategia to nowa architektura oraz kontrolowane przenoszenie ekranów i komponentów.
