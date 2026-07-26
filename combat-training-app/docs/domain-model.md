# Model domenowy

## Trening

Trening przechodzi przez statusy:

- `draft` — lokalny lub rozpoczęty szkic;
- `planned` — zapisany plan;
- `in_progress` — rozpoczęty trening;
- `completed` — zakończona jednostka.

W MVP docelowo rozpoczęcie planu tworzy aktywny trening, a ukończona sesja trafia do Historii. Fundament `WorkoutSession` i lokalnego repozytorium jest zaimplementowany, ale integracja z playerem i listą historii jest realizowana w osobnym etapie. Reużywalne szablony są funkcją przyszłą.

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
- Siła i motoryka.

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

## Pominięcia i wykonanie

- pominięte ćwiczenie nie otrzymuje oceny 0;
- nie wchodzi do średniej;
- pozostaje oznaczone jako pominięte;
- częściowo wykonane ćwiczenie przechowuje rzeczywistą liczbę ukończonych rund;
- jakość i ilość wykonania są prezentowane oddzielnie.

## WorkoutPlan i WorkoutSession

`WorkoutPlan` opisuje zapisany, zatwierdzony plan treningowy bez pól wykonania.

`WorkoutSession` opisuje ukończoną sesję wykonania planu. Encje są rozdzielone:

- plan może istnieć bez sesji;
- sesja zachowuje snapshot planu i kroków niezależnie od przyszłych zmian planu;
- samo istnienie `WorkoutSession` oznacza ukończony trening — w lokalnym storage v1 nie zapisujemy draftów, porzuconych ani trwających sesji.

## WorkoutSession — minimalny model v1

- `id`;
- `workoutPlanId`;
- `workoutPlanNameSnapshot`;
- `disciplineKey`;
- `startedAt`;
- `completedAt`;
- `stepResults`.

Nie zapisujemy w v1: statusu `abandoned`, draftu sesji, `pausedAt`, RPE, ocen, feedbacku, kalorii, notatek ani etykiet UI.

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

## Snapshot sesji

Sesja zachowuje snapshot niezbędny do historii i podsumowania nawet po zmianie lub usunięciu planu:

- identyfikator i nazwa planu;
- dyscyplina;
- identyfikatory bloku i elementu;
- typ bloku;
- nazwa kroku;
- informacje o rundzie;
- planowany czas.

Nie zapisujemy pełnego `WorkoutPlan` jako zagnieżdżonego dokumentu ani instrukcji ćwiczenia w storage v1.

## Czas sesji

`startedAt` i `completedAt` są ISO 8601. `completedAt` nie może być wcześniejsze niż `startedAt`.

`activeDurationSeconds` nie jest zapisywany — wyliczamy go jako sumę `performedDurationSeconds` wszystkich kroków. Ta suma oznacza czas aktywnego runtime:

- obejmuje wykonane ćwiczenia, odpoczynki między rundami i przerwy;
- nie obejmuje czasu pauzy;
- nie obejmuje niewykonanej części pominiętych kroków.

Różnica `completedAt - startedAt` to czas ścienny i może obejmować pauzy, ale nie zapisujemy dla niej osobnego pola.
