# Model domenowy

## Trening

Plan tygodnia v2 ma stały tydzień i niezależne migawki konkretnych tygodni. Sesja według zapisanej daty i rodzaju lub części zalicza najwyżej jedną pozycję, z maksymalną liczbą dopasowań. W tygodniu bez przeniesionych pozycji `legacyGoal` każdy zapisany trening liczy się do osobnego celu liczby treningów, także częściowy i „Poza planem”. Odczyt v1 pokazuje starsze pozycje w układzie dni, a pierwsza zmiana zapisuje v2 z zachowaniem starszych zasad. Zmiany stałego tygodnia trafiają do bieżącego tygodnia od dziś (Europe/Warsaw), z ochroną dni minionych i ręcznych wyjątków. Zasady opisuje [ADR 0018](adr/0018-recurring-and-scheduled-weeks.md), a zapis fizyczny [model Firestore](database-model.md).

Kreator trzyma szkic w stanie ekranu, a zatwierdzony `WorkoutPlan` zapisuje w Firestore. Trwający trening istnieje jako stan odtwarzacza z lokalną migawką do odzyskania. Po ukończeniu lub wcześniejszym zakończeniu z wykonaną pracą odtwarzacz zapisuje `WorkoutSession` do dziennika. Wpis ręczny trafia do tego samego dziennika z formularza.

## Dyscyplina

Dostępne wartości:

- `boxing`;
- `kickboxing`;
- `muay_thai`;
- `k1`;
- `mma_striking`.

Dyscyplinę można zmienić do momentu dodania pierwszego ćwiczenia. Później jest zablokowana.

## Bloki

- Rozgrzewka;
- Technika;
- Tarcze;
- Worek;
- Sparing;
- Kondycja;
- Siła i motoryka;
- Rozluźnienie.

Blok grupuje elementy w logiczną sekcję. Elementy zachowują kolejność.

## Element bloku

Element jest jednym z dwóch typów MVP:

- `exercise`;
- `break`.

Przerwa między ćwiczeniami jest osobnym elementem, a nie odpoczynkiem zapisanym przy poprzednim ćwiczeniu.

## Tryby ćwiczenia

### Rundowy

- liczba rund;
- długość rundy;
- odpoczynek między rundami;
- jedna kombinacja lub instrukcja;
- opcjonalna notatka wykonawcza.

### Ciągły

- czas trwania;
- nazwa;
- opcjonalna instrukcja.

### Siłowy — przygotowany, ale nieobowiązkowy w MVP

Docelowo:

- serie;
- planowany ciężar i powtórzenia;
- rzeczywisty ciężar i powtórzenia dla każdej serii;
- odpoczynek między seriami.

## Kombinacja

Ćwiczenie może wskazywać rekord biblioteki przez `combinationId`, ale zawsze zachowuje `exerciseNameSnapshot`. Snapshot chroni historię po zmianie lub usunięciu nazwy w bibliotece.

Jedno ćwiczenie zawiera jedną kombinację lub jedną instrukcję.

Issue #156 / ADR 0017: prywatne definicje „Moje ćwiczenia” mają stałe ID, redakcyjny typ `combination` / `drill` / `continuous`, dyscypliny, bloki i domyślne parametry. Plan wskazuje je przez istniejące `combinationId`; `WorkoutExercise.id` nadal identyfikuje osobne wystąpienie. Snapshot nazwy i parametrów pozostaje niezmienny. Nowe etapy sesji zachowują ID biblioteki, dzięki czemu historia chroni definicję przed usunięciem także po skasowaniu planu. Archiwizacja wyłącza nowe wybieranie, przywrócenie zachowuje ID. Typ zmienia się wyłącznie przez nową definicję.

Ćwiczenie celu może mieć opcjonalne `exerciseId` do wyświetlenia powiązania. Oceny, poprzednia ocena i istniejący trend nadal używają `focusSkillId`; nie powstaje drugi trend. Kryteria i stare oceny pozostają bez zmian.

## Pominięcia i wykonanie

- pominięte ćwiczenie nie otrzymuje oceny 0;
- nie wchodzi do średniej;
- pozostaje oznaczone jako pominięte;
- częściowo wykonane ćwiczenie przechowuje rzeczywistą liczbę ukończonych rund;
- jakość i ilość wykonania są prezentowane oddzielnie.

## Wersja w Firestore

Wersje dokumentów według kolekcji opisuje [model danych w Firestore](database-model.md). Ręczny wpis v2 ma 1–6 unikalnych części zajęć (`parts`), z jednym czasem i RPE dla całych zajęć. `category` służy zgodności: kilka części lub „Inne” daje `mixed`. Wersję 1, także „Mieszany”, aplikacja odczytuje bez przepisywania historii. W v2 szczegóły sparingu występują, gdy lista zawiera `sparring` (ADR 0016).

## WorkoutPlan i WorkoutSession

`WorkoutPlan` opisuje zapisany, zatwierdzony plan treningowy bez pól wykonania.

`WorkoutSession` opisuje zapisany wpis w dzienniku, ukończony lub częściowy (ADR 0005). Encje są rozdzielone:

- plan może istnieć bez sesji;
- sesja zachowuje snapshot planu i kroków niezależnie od przyszłych zmian planu;
- samo istnienie `WorkoutSession` nie oznacza ukończenia całego planu; nadal nie zapisujemy draftów, porzuconych ani trwających sesji.

## Dane wpisu w dzienniku

- `source`: `plan`, `quickTimer` albo `manual`.
- `status`: `completed` albo `partial`. Wpis ręczny ma zawsze `completed`. W odtwarzaczu pominięcie samej przerwy lub odpoczynku nie obniża statusu.
- `durationSeconds`: czas treningu. W odtwarzaczu obejmuje również przerwane próby, odpoczynek, przerwy i powtórzenia, z pominięciem pauz. Może zawierać ułamki sekund.
- `workSeconds` i `sparringSeconds`: czas dokończonej pracy oraz dokończonej pracy w sparingu. We wpisie ręcznym oba pola mają wartość `null`, czyli czas jest nieznany.
- `completion`: `{ completed, planned, unit }`. Jednostka to `exercise` dla planu i `round` dla szybkiego stopera. Wpis ręczny ma `null`.
- `workoutDate` i `timezone`: dzień `YYYY-MM-DD` i strefa IANA. Dla odtwarzacza dniem jest dzień rozpoczęcia.
- `note`: opcjonalna notatka do 1000 znaków, a brak treści to `null`. RPE, intensywność sparingu i oceny są częścią wpisu zależnie od źródła.

Odtwarzacz wyświetla komunikat, gdy brakuje choć jednego dokończonego etapu pracy, i nie dodaje wtedy wpisu.

Decyzja z 6 listopada 2026: etap ćwiczenia dostaje `completed` tylko po upływie pełnego czasu (`elapsed`). Zakończenie przez `next` lub `previous` daje `skipped` i `performedDurationSeconds: 0`. Rzeczywisty czas próby wchodzi wyłącznie do `durationSeconds`, bez wkładu do pracy i sparingu. Każda powtórzona i dokończona runda liczy się do pracy osobno. Zasady etapów odpoczynku i przerw nie zmieniają się.

## WorkoutSessionStepResult

Każdy zaplanowany krok osi playbacku ma własny wynik:

- `playbackStepId` — stabilny identyfikator kroku osi;
- `workoutItemId`, `blockId`, `blockType`;
- `kind` — `exercise`, `roundRest` lub `break`;
- `nameSnapshot`;
- `roundNumber` i `roundCount` — tylko dla rundowego `exercise`;
- `plannedDurationSeconds` i `performedDurationSeconds`;
- `outcome` — `completed`, `partial` lub `skipped`.

Inwarianty:

- `completed` — `performedDurationSeconds === plannedDurationSeconds`;
- `skipped` — `performedDurationSeconds === 0`;
- `partial` — `0 < performedDurationSeconds < plannedDurationSeconds`;
- czasy są bezpiecznymi liczbami całkowitymi w sekundach, nieujemne;
- `plannedDurationSeconds > 0`;
- `performedDurationSeconds` nie przekracza planu;
- każdy `playbackStepId` występuje w sesji najwyżej raz.

Nowy odtwarzacz zapisuje dla ćwiczenia wyłącznie `completed` lub `skipped`. `partial` pozostaje poprawnym wynikiem odpoczynku, przerwy oraz historycznego etapu ćwiczenia. Realny czas przerwanej próby ćwiczenia jest uwzględniany w czasie treningu osobno, mimo zerowego `performedDurationSeconds` wyniku kroku.

## Snapshot sesji

Sesja zachowuje snapshot niezbędny do historii i podsumowania nawet po zmianie lub usunięciu planu:

- identyfikator i nazwa planu;
- dyscyplina;
- identyfikatory bloku i elementu;
- typ bloku;
- nazwa kroku;
- opcjonalne `combinationId` z biblioteki w migawce etapu;
- informacje o rundzie;
- planowany czas.

Wpis z planu zawiera te migawki oraz wyniki etapów. Pełna kopia planu służy do odzyskiwania trwającej sesji i jest częścią osobnego zapisu urządzenia.

## Czas sesji

`startedAt` i `completedAt` są ISO 8601. `completedAt` nie może być wcześniejsze niż `startedAt`.

Podsumowanie używa zapisanego `durationSeconds`. Czas działania stopera:

- obejmuje wykonane ćwiczenia, odpoczynki między rundami i przerwy;
- nie obejmuje czasu pauzy;
- nie obejmuje niewykonanej części pominiętych kroków.

Różnica `completedAt - startedAt` to czas ścienny i może obejmować pauzy, ale nie zapisujemy dla niej osobnego pola.
