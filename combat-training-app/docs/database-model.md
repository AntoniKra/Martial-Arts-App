# Model danych w Firestore

Stan: 8 listopada 2026. Decyzje: `adr/0008-firestore-document-model.md` (ten model), `adr/0007-firestore-reads-with-onsnapshot.md` (pobieranie danych), `adr/0005-journal-entry-definitions.md` (wpis w dzienniku). Funkcje i oceny opisuje `feedback-system.md`.

Model zastępuje lokalny storage. Dane z `localStorage` to dane pokazowe: nie importujemy ich, Firestore zaczyna od zera (decyzja D2). Opis dawnego storage v1–v3 jest w historii Gita i w `domain-model.md`.

## Zasady

- **Wszystko pod `users/{uid}`.** Konta nie dzielą żadnych danych. Biblioteka kombinacji i opisy testów wbudowanych są w kodzie, nie w bazie.
- **`schemaVersion` w każdym dokumencie.** Każda kolekcja zaczyna od `1`, niezależnie od wersji dawnego `localStorage`. Zmiana kształtu dokumentu podnosi wersję, a odczyt obsługuje starsze wersje.
- **Identyfikatory nadaje aplikacja** (`crypto.randomUUID()`), żeby zapis działał bez sieci. Pole `id` w dokumencie jest równe ID dokumentu. Wyjątek: dokumenty „jeden na dzień” albo „jeden na tydzień” mają ID równe dacie (`readiness`, `bodyWeights`, `weekPlans`).
- **Daty jako tekst.** Dzień: `YYYY-MM-DD`. Chwila: ISO 8601 w UTC z `toISOString()`, np. `2026-11-08T01:51:00.000Z`, więc sortuje się jak tekst. Nie używamy `serverTimestamp()`: dokument zapisany offline ma od razu komplet pól.
- **`createdAt` i `updatedAt`** są w każdym dokumencie.
- **Jednostki:** czasy w sekundach, waga w kg z dokładnością do 0,1.
- **Snapshoty.** Sesja zapisuje nazwę planu, nazwy etapów, nazwę ćwiczenia celu i treść kryterium z chwili treningu. Późniejsza zmiana planu, biblioteki albo kryterium nie zmienia historii.
- **Bez dokumentów podsumowań.** Tydzień, trendy, plan tygodnia i statystyki profilu liczymy w `src/domain` z pobranych dokumentów. Przy kilkuset wpisach na osobę to tanie i nie może się rozjechać z danymi.
- **Walidacja:** każdy odczyt i zapis przechodzi przez schemat `zod/mini` w `src/infrastructure` (ADR 0006). Reguły Firestore sprawdzają to samo na płytkim poziomie.

## Kolekcje

| Ścieżka | Co przechowuje | ID dokumentu | Pierwsze użycie |
| --- | --- | --- | --- |
| `users/{uid}` | zgoda na dane o zdrowiu | `uid` | gotowość albo waga |
| `users/{uid}/workoutPlans/{planId}` | plany treningowe | UUID | przejście na Firestore |
| `users/{uid}/workoutSessions/{sessionId}` | wpisy w dzienniku z ocenami i RPE | UUID | przejście na Firestore |
| `users/{uid}/focusSkills/{focusSkillId}` | ćwiczenia celu z kryterium | UUID | ćwiczenia celu (R1) |
| `users/{uid}/weekPlans/{weekStart}` | plan tygodnia, czyli moduł celów | poniedziałek `YYYY-MM-DD` | plan tygodnia (R3) |
| `users/{uid}/readiness/{date}` | gotowość przed treningiem | dzień `YYYY-MM-DD` | gotowość (Q3) |
| `users/{uid}/bodyWeights/{date}` | historia wagi | dzień `YYYY-MM-DD` | profil |
| `users/{uid}/controlTests/{testId}` | testy kontrolne z paszportem | UUID | testy (R4) |
| `users/{uid}/controlTestResults/{resultId}` | wyniki testów | UUID | testy (R4) |

Lista jest zamknięta. Kod trzyma ją w jednej stałej (`USER_COLLECTIONS`), z której korzystają eksport i usunięcie konta. Nowa kolekcja wymaga dopisania jej do tej stałej, do reguł i do testów reguł.

## `users/{uid}`

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `healthDataConsent` | `{ grantedAt, noticeVersion }` albo `null` | Jedna zgoda na gotowość i wagę (decyzja z 8.11). `noticeVersion` to wersja treści informacji, np. `2026-11` |
| `createdAt`, `updatedAt` | chwila | |

- Dokument powstaje przy pierwszej zgodzie. Konto bez zgody może go nie mieć.
- Domyślnie zgody nie ma, a gotowość i waga są wyłączone.
- **Wycofanie zgody** usuwa wszystkie dokumenty `readiness` i `bodyWeights`, a potem ustawia `healthDataConsent: null`.
- Motyw (D4) zostaje na urządzeniu, nie w tym dokumencie.

## `workoutPlans`

Plan to jeden dokument z blokami i elementami w listach. Kształt odpowiada dzisiejszemu `WorkoutPlan`, z trzema dodatkami.

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `id`, `disciplineKey`, `customName`, `nameSnapshot`, `mainGoal`, `createdAt` | jak dziś | |
| `updatedAt` | chwila | **nowe** |
| `blocks` | lista bloków | |

Blok: `id`, `blockType`, `items` jak dziś, plus **`sparringIntensity`**: `light`, `technical`, `hard` albo `null`. Pole ma tylko blok typu `sparring`. `null` znaczy „nie wybrano”: podsumowanie zapyta wtedy o intensywność (Q4).

Ćwiczenie: pola jak dziś (`id`, `type: 'exercise'`, `combinationId`, `exerciseNameSnapshot`, `instruction`, `configuration`), plus **`focusSkillId`**: ID z `focusSkills` albo `null`.

Przerwa: bez zmian (`id`, `type: 'break'`, `durationSeconds`, `instruction`).

Reguły domenowe:
- najwyżej 3 ćwiczenia z `focusSkillId` w planie (Q1);
- to samo ćwiczenie celu może być w planie dwa razy, np. na worku i na tarczach. Każde wystąpienie ma osobną ocenę z własnym kontekstem.

## `workoutSessions`

Jeden dokument to jeden wpis w dzienniku. Pola zależą od źródła (`source`). Pola, które dopiero wypełnią przyszłe funkcje, są w dokumencie od początku (`null` albo pusta lista). Dzięki temu nie trzeba będzie migrować danych zebranych przed ich wdrożeniem.

### Pola wspólne

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `id` | UUID | |
| `source` | `plan`, `quickTimer`, `manual` | ADR 0005 |
| `status` | `completed`, `partial` | Ręczny wpis ma zawsze `completed` |
| `disciplineKey` | klucz dyscypliny | |
| `category` | typ bloku bez rozgrzewki albo `mixed` | ADR 0005. Szybki stoper: wybór użytkownika, ustalimy w jego issue |
| `workoutDate`, `timezone` | dzień, strefa IANA | ADR 0005 |
| `durationSeconds` | liczba > 0 | Czas treningu, może mieć ułamki sekundy |
| `workSeconds`, `sparringSeconds` | liczba całkowita ≥ 0 albo `null` | `null` tylko w ręcznym wpisie („nieznane”) |
| `completion` | `{ completed, planned, unit }` albo `null` | `unit`: `exercise` (plan) albo `round` (szybki stoper). `null` w ręcznym wpisie („nie dotyczy”) |
| `note` | tekst ≤ 1000 albo `null` | Notatka i wnioski z treningu w jednym polu |
| `rpe` | liczba całkowita 0–10 albo `null` | Q2 |
| `rpeRecordedAt` | chwila albo `null` | Kiedy podano RPE. Pozwala odróżnić ocenę po 10 min od oceny po dobie |
| `sparring` | lista `SparringEntry` | Pusta, gdy nie było sparingu (Q4) |
| `createdAt`, `updatedAt` | chwila | |

### Pola zależne od źródła

| Pole | `plan` | `quickTimer` | `manual` |
| --- | --- | --- | --- |
| `startedAt`, `completedAt` (chwila) | tak | tak | brak |
| `stepResults` (lista, ≤ 500) | tak | tak | brak |
| `workoutPlanId`, `workoutPlanNameSnapshot` | tak | brak | brak |
| `focusRatings` (lista, ≤ 3) | tak | brak | brak |
| `exerciseRatings` (lista) | tak | brak | brak |

`stepResults` mają kształt i inwarianty z `domain-model.md` (`WorkoutSessionStepResult`).

### `SparringEntry`

| Pole | Typ | Opis |
| --- | --- | --- |
| `blockId` | ID bloku albo `null` | `null` w szybkim stoperze i ręcznym wpisie |
| `intensity` | `light`, `technical`, `hard` albo `null` | Z planu, do zmiany w podsumowaniu |
| `rounds` | liczba całkowita ≥ 0 albo `null` | Dokończone rundy sparingu. W ręcznym wpisie podaje je użytkownik albo zostaje `null` |

- Plan: jeden wpis na każdy blok `sparring`. `rounds` to liczba dokończonych etapów rundowych w tym bloku. Sparing w trybie ciągłym liczy się do `sparringSeconds`, ale nie do rund.
- Twarde rundy w tygodniu to suma `rounds` z wpisów z `intensity: 'hard'`.

### `FocusRating` (ocena ćwiczenia celu)

| Pole | Typ | Opis |
| --- | --- | --- |
| `workoutItemId` | ID ćwiczenia w planie | |
| `focusSkillId` | ID z `focusSkills` | |
| `skillNameSnapshot`, `criterionSnapshot` | tekst | Nazwa i kryterium w chwili treningu |
| `blockType` | typ bloku | Kontekst wykonania: worek, tarcze, sparing… |
| `assessment` | 1–5, `unableToRate` albo `null` | `null` to brak oceny. Ani `null`, ani `unableToRate` nie wchodzą do średnich (R1) |
| `correction` | `{ problem, fix }` albo `null` | Notatka „problem i poprawka” (R2), oba teksty 1–200 znaków |
| `previousCorrectionCheck` | `better`, `same`, `notChecked` albo `null` | Odpowiedź na pytanie o poprzednią notatkę (R2) |

Zapis sesji z planu tworzy po jednym wpisie dla każdego ćwiczenia celu z `assessment: null`. Podsumowanie uzupełnia oceny.

### `ExerciseRating` (ocena pozostałych ćwiczeń, opcjonalna)

`workoutItemId`, `nameSnapshot`, `blockType`, `rating` 1–5. Zapisujemy tylko ćwiczenia ocenione.

## `focusSkills` (ćwiczenia celu)

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `id` | UUID | |
| `name` | tekst 1–80 | Np. „Lewy prosty, powrót do gardy” |
| `criterion` | tekst 1–200 | Kryterium oceny (R1) |
| `openCorrection` | `{ problem, fix, sessionId, workoutDate }` albo `null` | Ostatnia otwarta notatka „problem i poprawka” (R2) |
| `archivedAt` | chwila albo `null` | Zarchiwizowane nie pojawia się w kreatorze, ale trend zostaje |
| `createdAt`, `updatedAt` | chwila | |

- Jedno ćwiczenie celu działa we wszystkich planach. Wykres ocen zbiera oceny ze wszystkich planów (decyzja z 8.11).
- Zmiana kryterium nie zmienia starych ocen. Wykres zaznacza miejsce zmiany, bo oceny według innego kryterium nie są wprost porównywalne.
- Usunąć można ćwiczenie celu bez ocen. Takie, które ma oceny, można tylko zarchiwizować.
- `openCorrection` zmienia się razem z zapisem ocen, w jednym zapisie zbiorczym (`writeBatch`), który działa także offline. Zasady: `feedback-system.md`.

## `weekPlans` (plan tygodnia i moduł celów)

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `weekStart` | poniedziałek `YYYY-MM-DD` | Równy ID dokumentu |
| `items` | lista `WeekPlanItem`, ≤ 14 | |
| `createdAt`, `updatedAt` | chwila | |

`WeekPlanItem` to jedno z dwóch:
- `{ id, kind: 'plan', workoutPlanId, planNameSnapshot }`: plan z aplikacji;
- `{ id, kind: 'category', category }`: trening spoza aplikacji wybrany po rodzaju, np. sparing w klubie (decyzja z 8.11).

Dopasowanie liczymy w `src/domain`, nie zapisujemy go:
1. Bierzemy wpisy z tygodnia (po `workoutDate`, poniedziałek–niedziela) w kolejności chronologicznej.
2. Wpis zalicza wolną pozycję z tym samym planem. Gdy jej nie ma, zalicza wolną pozycję z tym samym rodzajem. Gdy jej też nie ma, jest „dodatkowy”.
3. Pozycja jest ukończona, częściowa albo niewykonana, zależnie od statusu wpisu, który ją zaliczył.
4. Pasek celu pokazuje zaliczone pozycje wobec zaplanowanych i nigdy nie przekracza 100%. Dodatkowe treningi pokazujemy osobno (R3).

## `readiness` (gotowość, Q3)

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `date` | `YYYY-MM-DD` | Równy ID dokumentu |
| `sleep`, `fatigue`, `soreness`, `stress` | liczba całkowita 1–5 | Opisy stopni ustalimy w issue gotowości |
| `recordedAt`, `updatedAt` | chwila | |

- Jeden dokument na dzień, przed pierwszym treningiem. Poprawka nadpisuje ten sam dokument.
- Zapis wymaga zgody w `users/{uid}`.

## `bodyWeights` (waga)

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `date` | `YYYY-MM-DD` | Równy ID dokumentu |
| `weightKg` | 30,0–250,0, krok 0,1 | |
| `recordedAt`, `updatedAt` | chwila | |

- Jeden wpis na dzień. Zapis wymaga tej samej zgody co gotowość.
- Pozostałe statystyki profilu liczymy z dziennika.

## `controlTests` i `controlTestResults` (testy kontrolne, R4)

Kształt wstępny. Szczegóły pól doprecyzujemy w issue testów, bo ekranów jeszcze nie projektowaliśmy.

`controlTests`:

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `id` | UUID | |
| `kind` | `custom`, `burpees3min`, `kast` | Protokół testów wbudowanych jest w kodzie |
| `name` | tekst 1–80 | |
| `measure` | `seconds`, `repetitions` | |
| `betterDirection` | `lower`, `higher` | |
| `protocol` | tekst ≤ 1000 albo `null` | Tylko test własny |
| `passport` | `{ place, equipment, warmup, timeOfDay, other }`, teksty ≤ 200 | Stałe warunki testu |
| `archivedAt` | chwila albo `null` | |
| `createdAt`, `updatedAt` | chwila | |

`controlTestResults`:

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `id`, `testId` | UUID | |
| `testNameSnapshot` | tekst | |
| `performedOn` | `YYYY-MM-DD` | |
| `value` | liczba > 0 | |
| `sameConditions` | boolean | Czy warunki zgadzały się z paszportem |
| `conditionsNote`, `note` | tekst ≤ 500 albo `null` | |
| `videoRecorded` | boolean | KAST: zalecenie nagrania |
| `createdAt`, `updatedAt` | chwila | |

- Próg prawdziwej zmiany ma tylko test wbudowany i jest w kodzie (burpees 3 min: 6 powtórzeń). Test własny pokazuje „pewność nieznana”.
- KAST jest dostępny tylko dla kickboxingu i K-1.

## Dane poza Firestore

| Co | Gdzie | Dlaczego |
| --- | --- | --- |
| Motyw (D4) | `localStorage` urządzenia | Wybór dotyczy urządzenia |
| Trwający trening do wznowienia (Q8) | pamięć urządzenia, osobno dla każdego `uid` | Zmienia się co sekundę, a po zapisie wpisu jest kasowany |
| Szkic kreatora | pamięć urządzenia | Zapis w chmurze dopiero po świadomej akcji |
| Pamięć podręczna Firestore | IndexedDB (`persistentLocalCache`) | Czyszczona przy wylogowaniu |

Stare klucze `localStorage` z planami i sesjami aplikacja usuwa raz, po przejściu na Firestore. Bez tego zostałyby w przeglądarce, widoczne dla każdego konta na tym komputerze.

## Reguły bezpieczeństwa

- Dostęp tylko do własnych danych: `request.auth.uid == uid` i `request.auth.token.email_verified == true` (ADR 0002). Konto Google ma potwierdzony adres.
- Wszystko, czego reguła nie zezwala wprost, jest zabronione.
- Każdy zapis: dozwolone klucze (`hasOnly`) i wymagane klucze (`hasAll`), typy, `schemaVersion == 1`, `id` równe ID dokumentu, długości tekstów, rozmiary list, zakresy liczb (RPE, oceny, waga, gotowość).
- `readiness` i `bodyWeights`: utworzenie i zmiana tylko przy zgodzie w `users/{uid}`. Usunięcie jest zawsze dozwolone, bo jest potrzebne przy wycofaniu zgody i usunięciu konta.
- Elementów list (`stepResults`, `blocks`) reguły nie sprawdzają pole po polu. Sprawdzają typ i rozmiar listy, a resztę schemat `zod/mini` w aplikacji.
- Testy na emulatorze dla każdej kolekcji: właściciel, drugie konto, niezalogowany, konto bez potwierdzonego e-maila, zły `schemaVersion`, nadmiarowe pole, a dla danych o zdrowiu także zapis bez zgody.

## Odczyt (ADR 0007)

| Kolekcja | Co słuchamy przez `onSnapshot` |
| --- | --- |
| `workoutPlans`, `workoutSessions`, `focusSkills`, `bodyWeights`, `controlTests`, `controlTestResults` | całą kolekcję; sortowanie w `src/domain` |
| `weekPlans` | ostatnie 13 tygodni (`weekStart >=`) |
| `readiness` | ostatnie 28 dni (`date >=`) |
| `users/{uid}` | dokument |

- Bez zapytań z dwoma polami sortowania, więc bez indeksów złożonych.
- **Koszt na planie Spark:** 50 000 odczytów dziennie. Po ponad 30 minutach bez połączenia Firestore liczy ponowne nasłuchiwanie jak nowe zapytanie, czyli odczyt wszystkich dokumentów kolekcji. Przy kilkudziesięciu wpisach na uczestnika badania to bezpieczne. Gdy użytkownik przekroczy 500 wpisów, historia dostanie stronicowanie.

## Eksport i usunięcie konta (Q7)

- **Eksport:** plik JSON ze wszystkich kolekcji z `USER_COLLECTIONS` i dokumentu `users/{uid}` oraz CSV dziennika. Dane pobieramy z serwera, a bez sieci eksport jest niedostępny, żeby plik był kompletny.
- **Usunięcie konta:** bez Cloud Functions, bo plan Spark ich nie ma.
  1. Ponowne zalogowanie (Firebase tego wymaga).
  2. Usunięcie dokumentów każdej kolekcji z listy, partiami po najwyżej 500.
  3. Usunięcie `users/{uid}`.
  4. Usunięcie konta w Authentication.
  5. Wyczyszczenie pamięci Firestore na urządzeniu.

  Przerwany proces można powtórzyć: dokończy usuwanie.

## Zmiany w kodzie wobec dzisiejszych typów

- `WorkoutSession` staje się unią według `source`. `workoutPlanId`, nazwa planu, oceny ćwiczeń i `stepResults` zależą od źródła.
- `completion` dostaje kształt `{ completed, planned, unit }` zamiast `{ completedExercises, plannedExercises }`.
- Nowe pola sesji: `rpe`, `rpeRecordedAt`, `sparring`, `focusRatings`, `exerciseRatings`, `createdAt`, `updatedAt`.
- `WorkoutPlan`: `focusSkillId` w ćwiczeniu, `sparringIntensity` w bloku sparingu, `updatedAt`.
- `WorkoutFeedback` z `src/domain/feedback/feedback.types.ts` przestaje obowiązywać: koncentracja, dyskomfort, realizacja celu i odczuwany postęp są w „Kierunkach rozwoju”.
- Repozytoria i schematy `localStorage` dla planów i sesji znikają po przejściu na Firestore.
