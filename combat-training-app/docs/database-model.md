# Model danych w Firestore

Stan przed zamrożeniem funkcji: 22 listopada 2026. Decyzje: `adr/0008-firestore-document-model.md` (ten model), `adr/0007-firestore-reads-with-onsnapshot.md` (pobieranie danych), `adr/0005-journal-entry-definitions.md` (wpis w dzienniku), `adr/0012-body-weight-health-consent.md` (zgoda na masę ciała), `adr/0015-wellbeing-consent-and-personal-baseline.md` (Samopoczucie). Funkcje i oceny opisuje `feedback-system.md`.

Plany i wpisy dziennika są utrwalane w Firestore. Stare dane pokazowe z lokalnego magazynu planów i sesji nie są importowane (decyzja D2).

## Zasady

- **Dane konta pod `users/{uid}`.** Biblioteka wbudowanych ćwiczeń znajduje się w kodzie, a prywatne definicje są w Firestore.
- **`schemaVersion` w każdym dokumencie.** Obsługiwane wersje zależą od kolekcji i wariantu dokumentu.
- **Identyfikatory nadaje aplikacja**, żeby zapis działał bez sieci. Obecne formaty ID są w wykazie kolekcji. Zapas zgodności dla ID sesji opisano w sekcji `workoutSessions`.
- **Daty jako tekst.** Dzień: `YYYY-MM-DD`. Chwila: ISO 8601 w UTC z `toISOString()`, np. `2026-11-08T01:51:00.000Z`, więc sortuje się jak tekst. Nie używamy `serverTimestamp()`: dokument zapisany offline ma od razu komplet pól.
- **`createdAt` i `updatedAt`** są w każdym dokumencie.
- **Jednostki:** czasy w sekundach, waga w kg z dokładnością do 0,1.
- **Snapshoty.** Sesja zapisuje nazwę planu, nazwy etapów, nazwę ćwiczenia celu i treść kryterium z chwili treningu. Późniejsza zmiana planu, biblioteki albo kryterium nie zmienia historii.
- **Bez dokumentów podsumowań.** Tydzień, trendy, plan tygodnia i statystyki profilu liczymy w `src/domain` z pobranych dokumentów. Przy kilkuset wpisach na osobę to tanie i nie może się rozjechać z danymi.
- **Walidacja:** repozytoria sprawdzają pełne dokumenty schematami `zod/mini` w `src/infrastructure` (ADR 0006). Reguły Firestore niezależnie sprawdzają dostęp i wymagania poszczególnych kolekcji. Eksport JSON zachowuje również surowe dokumenty, które nie przeszły walidacji.

## Kolekcje

| Ścieżka | Zawartość i ID dokumentu | `schemaVersion` |
| --- | --- | --- |
| `users/{uid}` | dokument profilu (zgody i etykieta kategorii), ID użytkownika | 1 |
| `users/{uid}/workoutPlans/{planId}` | plan treningowy, UUID | 1 |
| `users/{uid}/workoutSessions/{sessionId}` | wpis dziennika, UUID lub zapasowe ID opisane niżej | 1 dla szybkiego stopera, 1 lub 2 dla planu i ręcznego wpisu |
| `users/{uid}/focusSkills/{focusSkillId}` | element do poprawy z kryterium, UUID | 1 bez pola `exerciseId`, 2 z tym polem |
| `users/{uid}/weekPlans/{documentId}` | plan konkretnego tygodnia, ID nagłówka `YYYY-MM-DD` poniedziałku, ID pozycji `{weekStart}~{position}` | 1 dla starszej listy, 2 dla nagłówka i pozycji aktualnego modelu |
| `users/{uid}/recurringWeeks/{documentId}` | stały tydzień, nagłówek `default` i pozycje `item-{position}` | 1 |
| `users/{uid}/readiness/{date}` | samopoczucie, dzień `YYYY-MM-DD` | 1 |
| `users/{uid}/bodyWeights/{date}` | pomiar masy ciała, dzień `YYYY-MM-DD` | 1 |
| `users/{uid}/exercises/{exerciseId}` | prywatna definicja ćwiczenia, UUID | 1 |
| `users/{uid}/controlTests/{testId}` | zarezerwowana nazwa dla definicji testu R4 | zarezerwowana kolekcja |
| `users/{uid}/controlTestResults/{resultId}` | zarezerwowana nazwa dla wyniku testu R4 | zarezerwowana kolekcja |

`USER_COLLECTIONS` w `src/infrastructure/firebase/userCollections.ts` obejmuje wszystkie nazwy podkolekcji z wykazu. `IMPLEMENTED_USER_COLLECTIONS` obejmuje osiem wdrożonych podkolekcji i wyznacza zakres eksportu oraz usuwania konta. Dokument profilu jest obsługiwany osobno. Dwie zarezerwowane nazwy R4 nie mają repozytoriów ani dostępu w regułach ([ADR 0021](adr/0021-control-tests-deferred.md)).

### Moje ćwiczenia (issue #156, ADR 0017)

Dokument v1 zawiera `id`, `namePl` (1–100 znaków), `type` (`combination` / `drill` / `continuous`), unikalne niepuste `disciplines` (1–5) i `blockTypes` (1–8), `defaultConfiguration` (1–99 rund, czasy całkowite 1–86400 s, odpoczynek 0–86400 s), opcjonalne `copiedFromId`, nullable `archivedAt` i `lastUsedAt`, bool `favorite`, `createdAt`, `updatedAt` i `schemaVersion: 1`. Reguły sprawdzają także elementy list i mapę parametrów, dokładne klucze i niezmienność typu, pochodzenia oraz `createdAt`.

Plan zachowuje wersję 1 i istniejące `combinationId`, teraz także dla prywatnych definicji. Nowe sesje planu z ID biblioteki w `stepResults[].combinationId` mają wersję 2; sesje bez tego pola i stare dokumenty pozostają w wersji 1. Migawka etapu ma opcjonalne ID biblioteki, ale oceny sesji nie zmieniają pól. Cel z opcjonalnym `exerciseId` (ID biblioteki lub `null`) ma wersję 2; cel bez pola pozostaje wersją 1. Zmiana nazwy definicji nie aktualizuje migawki planu ani sesji. Trend i poprzednia ocena nadal po `focusSkillId` i niezmienionych zasadach kryteriów.

JSON obejmuje surową kolekcję `exercises`, także dokumenty błędne. Osobny `combat-training-moje-cwiczenia-RRRR-MM-DD.csv` zawiera poprawne definicje, w tym archiwalne, ze wszystkimi metadanymi (BOM, średnik i ochrona komórek). Usuwanie konta obejmuje `exercises` po usunięciu sesji, celów i planów. Indywidualne trwałe usunięcie wymaga sprawdzenia na serwerze, że definicja nie jest używana w planach ani w historii. Niepełne, błędne lub niewysłane dane blokują operację. Archiwizacja działa offline. Szczegóły i ograniczenia współbieżnej edycji opisuje ADR 0017.

## `users/{uid}`

Wdrożony profil oraz dwie niezależne zgody: na pomiary masy ciała z kategorią i na Samopoczucie (Q3).

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `healthDataConsent` | `{ grantedAt, noticeVersion, adultConfirmed: true }` albo `null` | Wyraźna zgoda 18+; wersja informacji `2026-11` |
| `bodyWeightWithdrawal` | `{ generation: number, pending: boolean }`, `null` lub brak pola | Blokada zapisów masy ciała i trwały licznik wycofań. Brak pola lub `null` oznacza początkowe 0 (issue #226) |
| `wellbeingConsent` | taka sama mapa albo `null`; pole opcjonalne | Osobna zgoda 18+ na Samopoczucie; wersja `2026-11`; brak pola w starym profilu oznacza brak zgody |
| `wellbeingWithdrawal` | `{ generation: number, pending: boolean }`, `null` lub brak pola | Wspólna blokada i trwały licznik wycofań (dodatnia bezpieczna liczba całkowita); po zakończeniu zachowujemy numer i `pending: false`, brak/null oznacza początkowe 0 (ADR 0015) |
| `weightClassLabel` | tekst 1–20 znaków albo `null` | Etykieta użytkownika, wyłącznie przy zgodzie |
| `createdAt`, `updatedAt` | chwila | |

- Dokument powstaje przy pierwszej z dowolnych zgód. Konto bez zgody może go nie mieć. Schemat i reguły nadal przyjmują stare dokumenty bez `wellbeingConsent`.
- Domyślnie zgody nie ma. Oba pola wyboru na osobnym ekranie są niezaznaczone; zgoda wymaga potwierdzenia pełnoletności. Statystyki i treningi działają bez zgody.
- Obecnie istnieje tylko wersja informacji `2026-11`; nie wdrażamy przejść między wersjami. Zgoda jest ważna, gdy nie jest `null` i ma `adultConfirmed: true`.
- Reguły chronią `createdAt` oraz istniejącą mapę zgody: można zmienić kategorię, ale nową zgodę ustawia się tylko z `null` (lub tworząc dokument).
- **Wycofanie zgody na pomiary wymaga sieci.** Najpierw transakcja zapisuje `bodyWeightWithdrawal: { generation, pending: true }`. Pierwsza generacja to 1, następna to poprzedni numer + 1, a ponowienie używa aktywnej generacji. Dopiero po potwierdzeniu transakcji `getDocsFromServer` pobiera wszystkie pomiary. Każda paczka zawiera do 498 usunięć i aktualizację profilu z aktywną generacją, dzięki czemu reguły odrzucają spóźnione paczki po ponownym udzieleniu zgody. Ostatnia paczka zeruje `healthDataConsent` i `weightClassLabel`, ustawia `pending: false` i zachowuje numer generacji. Po przerwaniu blokada pozostaje do dokończenia.
- Samopoczucie najpierw ustawia w transakcji `wellbeingWithdrawal: { generation, pending: true }` i czeka na potwierdzenie serwera; rozpoczęcie wymaga dokładnie poprzedniej generacji + 1 (pierwsza to 1), a ponowienie podejmuje tę samą aktywną generację. Potem odczytuje całą kolekcję `readiness` i usuwa najwyżej 498 wpisów w partii, dodając do każdej partii aktualizację profilu z aktualną aktywną generacją. Ostatnia partia zeruje `wellbeingConsent` i ustawia `pending: false`, zachowując numer również po kolejnym włączeniu. Licznika nie można usunąć ani cofnąć. Reguły blokują zapisy wpisów podczas wycofywania i odrzucają spóźnione partie z dowolnej wcześniejszej operacji, również po zakończeniu nowszego wycofania i ponownym włączeniu zgody. Odczyt i każda partia sprawdzają sieć; utrata połączenia zwraca błąd, zwalnia dialog i pozwala ponowić. Wspólna blokada pozostaje do dokończenia. Zgody są niezależne; pomiary masy ciała nie są zmieniane.
- Motyw (D4) zostaje na urządzeniu, nie w tym dokumencie.

## `workoutPlans`

Plan to jeden dokument z blokami i elementami w listach. Kształt odpowiada typowi `WorkoutPlan`.

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `id`, `disciplineKey`, `customName`, `nameSnapshot`, `mainGoal` | identyfikator, dyscyplina, nazwy i główny cel | |
| `createdAt`, `updatedAt` | chwila | |
| `blocks` | lista bloków | |

Blok ma `id`, `blockType`, `items`. Blok typu `sparring` może mieć też `sparringIntensity`: `light`, `technical`, `hard` albo `null`. `null` oznacza, że intensywność może zostać uzupełniona w podsumowaniu (Q4).

Ćwiczenie ma `id`, `type: 'exercise'`, `combinationId`, `exerciseNameSnapshot`, `instruction`, `configuration` i `focusSkillId` (ID z `focusSkills` albo `null`).

Przerwa ma `id`, `type: 'break'`, `durationSeconds` i `instruction`.

Reguły domenowe:
- najwyżej 3 ćwiczenia z `focusSkillId` w planie (Q1);
- to samo ćwiczenie celu może być w planie dwa razy, np. na worku i na tarczach. Każde wystąpienie ma osobną ocenę z własnym kontekstem.

## `workoutSessions`

Jeden dokument to jeden wpis w dzienniku. Zawartość i wersja zależą od źródła (`source`).

Nowa sesja z planu otrzymuje ID z `crypto.randomUUID()` przy rozpoczęciu pierwszego etapu (`src/features/workout-player/hooks/useWorkoutSessionRecorder.ts`). Jeśli odzyskiwany zapis przygotowania ma `sessionId: null`, a termin przygotowania już minął, `src/features/workout-player/utils/resolveActiveWorkout.ts` nadaje ID `planId-startedAtMs`, gdzie `startedAtMs` to termin końca przygotowania w milisekundach. To zapas zgodności dla wznowienia; istniejące `sessionId` jest zachowywane.

### Pola wspólne

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` lub `2` | Według źródła i pól opisanych poniżej |
| `id` | UUID albo `planId-startedAtMs` | Zapasowe ID tylko w opisanym wyżej przypadku wznowienia |
| `source` | `plan`, `quickTimer`, `manual` | ADR 0005 |
| `status` | `completed`, `partial` | Ręczny wpis ma zawsze `completed` |
| `disciplineKey` | klucz dyscypliny | |
| `category` | typ bloku bez rozgrzewki i rozluźnienia albo `mixed` | ADR 0005. Szybki stoper: jeden z sześciu rodzajów (bez rozgrzewki, rozluźnienia i `mixed`), wybierany w oknie „Nowy” i zmieniany w podsumowaniu (`feedback-system.md`) |
| `workoutDate`, `timezone` | dzień, strefa IANA | ADR 0005 |
| `durationSeconds` | liczba > 0 | Czas treningu; z odtwarzacza może mieć ułamki sekundy, ręczny: liczba całkowita 60–28 800 |
| `workSeconds`, `sparringSeconds` | liczba całkowita ≥ 0 albo `null` | `null` tylko w ręcznym wpisie („nieznane”) |
| `completion` | `{ completed, planned, unit }` albo `null` | `unit`: `exercise` (plan) albo `round` (szybki stoper). `null` w ręcznym wpisie („nie dotyczy”) |
| `note` | tekst ≤ 1000 albo `null` | Notatka i wnioski z treningu w jednym polu |
| `rpe` | liczba całkowita 0–10 albo `null` | Q2; w ręcznym wpisie wymagane, bez `null` |
| `rpeRecordedAt` | chwila albo `null` | Kiedy podano RPE; w ręcznym wpisie wymagane. Edycja zmienia tę chwilę tylko przy zmianie wartości RPE |
| `sparring` | lista `SparringEntry` | Pusta, gdy nie było sparingu (Q4) |
| `createdAt`, `updatedAt` | chwila | |

### Pola zależne od źródła

- `manual`: nowy lub poprawiony wpis ma wersję 2 i `parts` z 1–6 unikalnymi kluczami `technique`, `pads`, `bag`, `sparring`, `conditioning`, `other`. `category` odpowiada pojedynczej nazwanej części, a przy kilku częściach lub `other` przyjmuje `mixed`. Starszy wpis bez `parts` ma wersję 1 i jest odczytywany bez migracji (ADR 0016).
- `plan`: wersja 2, gdy co najmniej jeden zapisany etap ma `combinationId`. Sesje bez tego pola we wszystkich etapach mają wersję 1 (ADR 0017).
- `quickTimer`: wersja 1.

| Pole | `plan` | `quickTimer` | `manual` |
| --- | --- | --- | --- |
| `startedAt`, `completedAt` (chwila) | tak | tak | brak |
| `stepResults` (lista, ≤ 500) | tak | tak | brak |
| `workoutPlanId`, `workoutPlanNameSnapshot` | tak | brak | brak |
| `focusRatings` (lista, ≤ 3) | tak | brak | tak, wymagana, może być pusta |
| `exerciseRatings` (lista) | tak | brak | brak |

`stepResults` mają kształt i inwarianty z `domain-model.md` (`WorkoutSessionStepResult`). Limit z reguł Firestore odpowiada `MAX_WORKOUT_SESSION_STEPS` w `src/domain/workout-session/workoutSessionLimits.ts`, używanemu przez walidację planu, oś odtwarzania i schemat sesji.

Ręczny wpis ma `status: 'completed'`, `completion: null`, `workSeconds: null` i `sparringSeconds: null` (nieznane czasy, a nie zera). Data przy tworzeniu: od dziś − 7 dni do dziś w strefie urządzenia. Edycja może pozostawić starszą zapisaną datę; nowa data musi być z tego zakresu. Nowy wpis otrzymuje UUID, strefę urządzenia i `createdAt = updatedAt = rpeRecordedAt = now`. Edycja zachowuje ID, `createdAt` i `timezone`. Pierwsza wersja ręcznego wpisu z 12 listopada pozostaje obsługiwana; części zajęć od 14 listopada używają wersji 2.

Po korekcie zegara `−15 s` / `+15 s` (issue #91) `stepResults[].plannedDurationSeconds` oznacza czas docelowy etapu po korektach, minimum 1 s. Dla `completed` obowiązuje `performedDurationSeconds === plannedDurationSeconds`. Runda 180 s wydłużona o 15 s zapisuje obie wartości jako 195 i wnosi 195 s do pracy. Lokalny zapis wznowienia ma opcjonalne `stepDurations` z celami etapów. Brak pola oznacza czasy z planu. Wynik wcześniejszej próby zachowuje własny czas docelowy także po restarcie etapu.

### `SparringEntry`

| Pole | Typ | Opis |
| --- | --- | --- |
| `blockId` | ID bloku albo `null` | `null` w szybkim stoperze i ręcznym wpisie |
| `intensity` | `light`, `technical`, `hard` albo `null` | Z planu, do zmiany w podsumowaniu |
| `rounds` | liczba całkowita ≥ 0 albo `null` | Dokończone rundy sparingu. W ręcznym wpisie podaje je użytkownik albo zostaje `null` |

- Plan: jeden wpis na każdy blok `sparring`. `rounds` to liczba dokończonych etapów rundowych w tym bloku. Sparing w trybie ciągłym liczy się do `sparringSeconds`, ale nie do rund.
- Twarde rundy w tygodniu to suma `rounds` z wpisów z `intensity: 'hard'`.
- Ręczny wpis: najwyżej jeden element, `blockId: null`, intensywność wymagana, rundy 1–50 albo `null`; w wersji 2 dokładnie jeden element po wybraniu części `sparring`, poza tym pusta lista. Odznaczenie części czyści intensywność i rundy. W wersji 1 nadal dopuszczamy dawny osobny wybór sparingu. Czas pracy i sparingu pozostaje `null` niezależnie od liczby rund.

### `FocusRating` (ocena ćwiczenia celu)

| Pole | Typ | Opis |
| --- | --- | --- |
| `workoutItemId` | ID ćwiczenia w planie albo `null` | `null` wyłącznie w ręcznym wpisie (`ManualFocusRating`) |
| `focusSkillId` | ID z `focusSkills` | |
| `skillNameSnapshot`, `criterionSnapshot` | tekst | Nazwa i kryterium w chwili treningu |
| `blockType` | typ bloku | Kontekst wykonania: worek, tarcze, sparing… |
| `assessment` | 1–5, `unableToRate` albo `null` | `null` to brak oceny. Ani `null`, ani `unableToRate` nie wchodzą do średnich (R1) |
| `correction` | `{ problem, fix }` albo `null` | Notatka „problem i poprawka” (R2), oba teksty 1–200 znaków |
| `previousCorrectionCheck` | `better`, `same`, `notChecked` albo `null` | Odpowiedź na pytanie o poprzednią notatkę (R2) |

Zapis sesji z planu tworzy po jednym wpisie dla każdego ćwiczenia celu z `assessment: null`. Podsumowanie uzupełnia oceny.

Ręczny wpis zawiera najwyżej 3 unikalne `focusSkillId`; ocena 1–5 albo `unableToRate` jest wymagana dla każdego wybranego ćwiczenia (bez `null`). Miejsce nie może być rozgrzewką ani rozluźnieniem. Dla nowej oceny wynika z pojedynczej nazwanej części; przy kilku częściach, „Inne” i „Kondycja” wybiera je użytkownik. Przy edycji zapisane miejsce istniejącej oceny pozostaje niezmienione, dopóki użytkownik sam nie zmieni go w polu miejsca. Edycja dawnego v1 `mixed` startuje bez części, również gdy zapisano szczegóły sparingu, i wymaga świadomego wskazania pełnej listy przed konwersją do v2. Sesja i zmiany `focusSkills.openCorrection` trafiają do jednego `writeBatch`, także offline. Oceny ręczne wchodzą do trendu oraz blokują usunięcie ćwiczenia celu.

### `ExerciseRating` (ocena pozostałych ćwiczeń, opcjonalna)

`workoutItemId`, `nameSnapshot`, `blockType`, `rating` 1–5. Zapisujemy tylko ćwiczenia ocenione.

## `focusSkills` (ćwiczenia celu)

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` lub `2` | Zależnie od obecności pola `exerciseId` |
| `id` | UUID | |
| `exerciseId` | ID biblioteki lub `null` | Pole dostępne w v2 |
| `name` | tekst 1–80 | Np. „Lewy prosty, powrót do gardy” |
| `criterion` | tekst 1–200 | Kryterium oceny (R1) |
| `openCorrection` | `{ problem, fix, sessionId, workoutDate }` albo `null` | Ostatnia otwarta notatka „problem i poprawka” (R2) |
| `archivedAt` | chwila albo `null` | Zarchiwizowane nie pojawia się w kreatorze, ale trend zostaje |
| `createdAt`, `updatedAt` | chwila | |

- Jedno ćwiczenie celu działa we wszystkich planach. Wykres ocen zbiera oceny ze wszystkich planów (decyzja z 8.11).
- Zmiana kryterium nie zmienia starych ocen. Wykres zaznacza miejsce zmiany, bo oceny według innego kryterium nie są wprost porównywalne.
- Schowanie ustawia `archivedAt` i `updatedAt` oraz zdejmuje `focusSkillId` (ustawia `null`) ze wszystkich wystąpień we wszystkich planach, aktualizując ich `updatedAt`. Dokument ćwiczenia celu i zmiany planów zapisujemy jednym `writeBatch`, działającym również offline. Ćwiczenia pozostają w planach, historyczne oceny i wykres zostają. UI potwierdza zapis lokalny i pokazuje „Czeka na wysłanie” do potwierdzenia serwera.
- Przywrócenie ustawia `archivedAt: null` i nowe `updatedAt`. Nie przywraca `focusSkillId` w planach; oznaczenie CEL można ponownie ustawić w kreatorze.
- Usunąć można ćwiczenie celu bez **żadnego wpisu** w `focusRatings` jakiejkolwiek sesji (również `assessment: null` i `unableToRate` blokują usunięcie). Wtedy usunięcie dokumentu i zdjęcie `focusSkillId` w planach odbywa się jednym `writeBatch`. Ćwiczenie celu z wpisami można tylko schować.
- Operacje te nie zmieniają lokalnej kopii planu i migawek ocen trwającego treningu. Plan ze schowanym ID, np. starszy szkic, pozostaje poprawny do zapisu, ale schowane ćwiczenie celu nie jest oferowane jako nowy wybór.
- `openCorrection` zmienia się razem z zapisem ocen, w jednym zapisie zbiorczym (`writeBatch`), który działa także offline. Zasady: `feedback-system.md`.

## `weekPlans` (plan tygodnia i moduł celów)

### Model v2: dni i stały tydzień

Model aplikacyjny v2 ma `schedule` (0–14 pozycji) i osobny `targetCount` (całkowite 0–14). `items` jest pustą listą. Pozycja ma `id`, `kind` i dzień 0–6 (poniedziałek–niedziela). Wariant `club`: `disciplineKey`, `startTime` i `endTime` w formacie HH:mm, koniec późniejszy od początku, unikalne `parts` jak w ręcznym wpisie (0–6) i `clubName` (null lub 1–100 znaków). Wariant `own`: dzień lub null (dowolny dzień), `category`, nullable `workoutPlanId` i `planNameSnapshot` (oba puste lub oba podane). Wariant `rest`: wymagany dzień. W konkretnym tygodniu każda pozycja ma `omitted: boolean` (odpoczynek zawsze false). Powstanie migawki ze stałego tygodnia i aktualizowanie jej od dziś z ochroną wyjątków opisuje [ADR 0018](adr/0018-recurring-and-scheduled-weeks.md).

Fizycznie `users/{uid}/recurringWeeks` przechowuje nagłówek v1 `default` (`id`, `itemCount`, `createdAt`, `updatedAt`, `schemaVersion`) i pozycje v1 `item-{position}` (`id`, `position` 0–13, `activity`, czasy, wersja). Jest to jedna logiczna lista stałego tygodnia. `weekPlans/{weekStart}` v2 ma `scheduleSize` zamiast listy `schedule`; pozycje v2 znajdują się w tej samej kolekcji pod ID `{weekStart}~{position}`, z polami `weekStart`, `position`, `activity`, czasy i wersja. Szczegóły atomowego zapisu, walidacji spójności i uzasadnienie rozdzielenia dokumentów: ADR 0018. `recurringWeeks` jest wdrożona i należy do obu rejestrów kolekcji, eksportu JSON, sprawdzania oczekujących zapisów i usuwania konta. Eksport zachowuje fizyczne dokumenty, bez zmiany wersji lub naprawiania danych.

Każdy tydzień powstaje z niezależnej migawki stałych pozycji po potwierdzonym odczycie braku tygodnia. Przeniesienie, dodanie, usunięcie i „Nie byłem” w konkretnym tygodniu zmieniają tylko tę migawkę i odłączają zmienione wystąpienie od stałego planu. Zmiana stałego tygodnia propaguje dodanie, edycję i usunięcie od dziś w Warszawie, chroniąc minione dni oraz ręczne wyjątki; oba tygodnie zapisuje jedna partia. Włączenie „Powtarzaj co tydzień” dodaje pozycję również do stałego tygodnia, w tej samej partii (ADR 0018). Brak lub błąd odczytu nie oznacza pustego planu. Zapis lokalny potwierdza nasłuch, a `hasPendingWrites` pokazuje „Czeka na wysłanie”. Zakończony tydzień zachowuje trwałą flagę edycji. Data pozostaje utrwalonym `workoutDate`; nie przeliczamy jej z UTC.

Zaliczanie v2 maksymalizuje liczbę dopasowań. Każda sesja i pozycja uczestniczy najwyżej raz. Klub wymaga zgodnej dyscypliny i dowolnej wspólnej części, jeżeli podano części. Trening własny wymaga zgodnego rodzaju lub części. Datowana pozycja wymaga identycznej daty, a `null` dopuszcza cały tydzień. Odpoczynek i świadomie pominięte pozycje nie są dopasowywane. W tygodniu bez `legacyGoal` do `targetCount` liczą się wszystkie zapisane sesje, w tym częściowe i „Poza planem”. Pasek dochodzi najwyżej do 100%. Statusy realizacji wylicza aplikacja. Miniony dzień bez wpisu jest opuszczony, a pozycja bez dnia staje się opuszczona dopiero po niedzieli.

### Zgodność ze starszym celem v1

Odczyt pokazuje v1 w układzie v2 bez zapisu. Pierwsza zmiana zapisuje nagłówek i pozycje v2 jedną partią. Przeniesiona pozycja może zachować oryginalną definicję w `legacyGoal`. Dopóki tydzień zawiera takie pozycje, cel liczy ukończone dopasowania, a przeniesiona pozycja zachowuje dopasowanie według planu lub rodzaju oraz osobny status częściowego wykonania. Edycja danej pozycji może zastąpić jej starszą definicję. Zapis i współbieżność opisuje [ADR 0018](adr/0018-recurring-and-scheduled-weeks.md).

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `weekStart` | poniedziałek `YYYY-MM-DD` | Równy ID dokumentu |
| `items` | lista `WeekPlanItem`, ≤ 14 | |
| `editedAfterWeekEnd` | boolean | Trwałe oznaczenie zapisu zakończonego tygodnia |
| `createdAt`, `updatedAt` | chwila | |

`WeekPlanItem` to jedno z dwóch:
- `{ id, kind: 'plan', workoutPlanId, planNameSnapshot }`: plan z aplikacji;
- `{ id, kind: 'category', category }`: trening spoza aplikacji wybrany po rodzaju, np. sparing w klubie (decyzja z 8.11).

Dokument ma też wymagane `editedAfterWeekEnd: boolean`. Przy świadomym zapisie zakończonego tygodnia aplikacja ustawia `true` i później go nie zeruje. UI pokazuje wtedy „Plan zmieniony po zakończeniu tygodnia”. Nowy bieżący lub przyszły plan zaczyna z `false`; kopiowanie nie przenosi flagi źródła. Dopisanie lub poprawienie sesji nie zmienia flagi. Przy edycji zachowujemy `createdAt`, a zmieniamy `updatedAt`. Flaga jest trwała, więc zmiana strefy urządzenia nie usuwa oznaczenia.

Lista zawiera 0–14 pozycji z unikalnymi ID. Ten sam plan można wybrać wielokrotnie. Schemat `zod/mini` sprawdza rzeczywistą datę poniedziałku, oba dokładne warianty pozycji, kategorie i identyfikatory zgodne z modelami planu/sesji. Reguły sprawdzają wymagane i dozwolone pola dokumentu, wersję, format daty oraz zgodność z ID ścieżki, znaczniki czasu, flagę i typ/limit listy; nie sprawdzają rzeczywistego dnia tygodnia ani elementów listy. Przy aktualizacji chronią `createdAt` i ustawioną flagę.

Dopasowanie liczymy czysto w `src/domain`, bez zmieniania sesji ani planu:
1. Wybieramy wpisy po utrwalonym `workoutDate` (poniedziałek–niedziela). Nie odtwarzamy dnia z UTC ani ze strefy urządzenia.
2. Ukończone sesje `plan` przypisujemy do wolnych pozycji o identycznym `workoutPlanId`.
3. Pozostałe ukończone sesje dowolnego źródła przypisujemy do wolnych pozycji rodzaju. Dla ręcznego v2 rodzaj musi wystąpić w `parts`; pozostałe wpisy wymagają identycznej `category`. Przypisanie maksymalizuje liczbę zaliczonych pozycji niezależnie od kolejności różnych celów: może przesunąć wcześniejsze przypisania wewnątrz tej fazy, bez naruszania dokładnych planów.
4. Następnie analogicznie przypisujemy częściowe: najpierw dokładny plan, potem rodzaj; zakończonych wcześniejszych faz już nie zmieniamy.
5. Każda sesja i pozycja uczestniczy najwyżej w jednym dopasowaniu. W każdej fazie kolejność to `workoutDate`, `startedAt` (sesje czasowe) lub `createdAt` (ręczne), następnie `id`; identyczne pozycje zachowują kolejność listy.
6. Pasek to **wyłącznie ukończone / zaplanowane**, najwyżej 100%. Częściowe, niewykonane i dodatkowe mają osobne liczniki. Pozostałe sesje są dodatkowe tylko przy istniejącym celu. Brak dokumentu lub `items: []` oznacza brak celu: liczba treningów i możliwość ułożenia planu, bez paska i „dodatkowych”. Loading, błąd, niepoprawne lub niepełne dane nie oznaczają braku celu ani zera sesji.

`mixed` nie jest dowolnym rodzajem, a podobna nazwa nie zastępuje ID planu. `planNameSnapshot` zachowuje historię po zmianie lub usunięciu planu treningowego. Niedostępny plan pozostaje na liście do świadomego usunięcia lub zastąpienia. Edycja celu (także pustej listy) nie usuwa sesji; realizacja przelicza się względem aktualnej listy.

## `readiness` (Samopoczucie, Q3, issue #146)

Wdrożone dzienne samooceny, bez rekomendacji i wyniku zbiorczego. Historyczna nazwa techniczna kolekcji pozostaje bez zmian; moduł w kodzie to `wellbeing` (ADR 0015).

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `questionsVersion` | `1` | Wersja zestawu pytań; zmiana rozpoczyna normę od nowa |
| `date` | `YYYY-MM-DD` | Równy ID dokumentu |
| `sleep`, `energy`, `soreness`, `stress` | liczba całkowita 1–5 | Wyżej zawsze znaczy lepiej; pełne etykiety w `feedback-system.md` |
| `note` | tekst do 300 znaków albo `null` | Opcjonalna, bez analizy |
| `createdAt`, `updatedAt` | chwila | Pierwszy zapis i ostatnia poprawka; `createdAt` jest niezmienne |

- Jeden dokument na lokalny dzień urządzenia. Formularz tworzy i poprawia tylko dzisiejszy wpis. Zapis działa offline; późniejsza synchronizacja nie porównuje daty do czasu serwera.
- Formularz i „Nie dziś” działają także po ponownym otwarciu aplikacji offline z migawką zgody w cache. Pełność kolekcji nie blokuje dziennego wpisu. Znane `createdAt` jest chronione lokalnie, a przy konflikcie z dokumentem nieznanym cache — przez reguły. Późniejsze odrzucenie jest widocznym błędem, nie zastąpieniem danych serwerowych.
- Zapis wymaga osobnej aktywnej zgody `wellbeingConsent` przez `get(/users/{uid})`, więc partia nadająca zgodę i tworząca wpis jest odrzucana. Dokładne klucze, całkowite oceny 1–5, limit notatki i zgodność ID z datą są sprawdzane przez reguły; prawdziwą datę sprawdza `zod/mini`. Odczyt i usunięcie pozostają dostępne zweryfikowanemu właścicielowi dla eksportu i sprzątania, tak jak w `bodyWeights`.
- Norma osobno dla każdego pytania: poprzednie 28 dni bez dnia ocenianego, ≥14 wpisów obejmujących ≥21 dni kalendarzowych z oboma końcami. Mediana, P25 i P75 z interpolacją liniową; brak imputacji. Kontekst RPE korzysta z `workoutDate`, nie daty dzisiejszej. Nie zapisujemy norm ani pochodnych kategorii w bazie.

## `bodyWeights` (masa ciała)

Wdrożone pomiary z datą jako kluczem dokumentu.

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `date` | `YYYY-MM-DD` | Równy ID dokumentu |
| `weightKg` | 30,0–250,0, krok 0,1 | |
| `createdAt`, `updatedAt` | chwila | `createdAt` nie zmienia się przy zastąpieniu pomiaru |

- Jeden wpis na dzień; zastąpienie po ostrzeżeniu. Data może być dowolnie wsteczna, ale nie przyszła. Przecinek i kropka są akceptowane w formularzu; zapis zaokrąglamy do 0,1 kg.
- Schemat `zod/mini` sprawdza prawdziwą datę i krok 0,1 z tolerancją błędu zmiennoprzecinkowego. Reguły sprawdzają zakres 30–250, format daty, zgodność z ID, dokładne klucze i znaczniki czasu; przy zmianie chronią `createdAt`. Utworzenie i zmiana wymagają zgody i braku aktywnej blokady sprawdzanych przez `get()` dokumentu profilu. Odczyt i usunięcie są dozwolone właścicielowi także podczas wycofywania i po jego zakończeniu.
- Średnia z 7 dni obejmuje dziś i 6 poprzednich dni w strefie urządzenia; wykres pokazuje 12 średnich tygodniowych (poniedziałek–niedziela), z przerwami zamiast zer. Kategoria pozostaje wyłącznie etykietą.
- Statystyki profilu liczymy z całego dziennika po zapisanym `workoutDate`, dla wszystkich źródeł i obu statusów; nieznane rundy nie są zerami.

## `controlTests` i `controlTestResults` (testy kontrolne, R4)

Nazwy są zarezerwowane dla kierunku rozwoju R4. Bieżący model nie ma dla nich wdrożonych schematów, nasłuchów ani dostępu w regułach. Decyzję o zakresie zapisuje [ADR 0021](adr/0021-control-tests-deferred.md).

## Dane poza Firestore

| Co | Gdzie | Dlaczego |
| --- | --- | --- |
| Motyw (D4) | `localStorage` urządzenia | Wybór dotyczy urządzenia |
| Przygotowanie przed treningiem i sygnały końca rundy i przerwy | `localStorage` urządzenia, bez `uid` | Ustawienia urządzenia, które zostają po usunięciu konta |
| Ostatnie ustawienia szybkiego stopera | `localStorage`, klucz `combat-training.quickTimer.{uid}` | Dyscyplina, rodzaj, format, liczba rund, czas pracy i przerwy na następny raz; zostają po wylogowaniu, usuwane razem z kontem |
| Zamknięte przypomnienia RPE | `localStorage`, klucz `combat-training.rpeDismissals.{uid}` | ID wpisów, przy których zamknięto przypomnienie o RPE na Start; zostają po wylogowaniu, usuwane razem z kontem |
| Trwający trening do wznowienia (Q8) | `localStorage`, klucz `combat-training.activeWorkout.<uid>`, wersja 1 | Migawka odtwarzania i rejestratora jest zapisywana przy zmianach stanu w widocznej karcie, przy przejściu do ukrytej karty i przy `pagehide`. Po udanym zapisie wpisu jest usuwana. |
| Szkic kreatora | stan Reacta na ekranie kreatora | Świadomy zapis tworzy lub aktualizuje plan w Firestore. |
| Pamięć podręczna Firestore | IndexedDB (`persistentLocalCache`) | Czyszczona przy wylogowaniu |

Stare klucze `localStorage` z planami i sesjami aplikacja usuwa raz, po przejściu na Firestore. Bez tego zostałyby w przeglądarce, widoczne dla każdego konta na tym komputerze.

## Reguły bezpieczeństwa

- Dostęp tylko do własnych danych: `request.auth.uid == uid` i `request.auth.token.email_verified == true` (ADR 0002). Konto Google ma potwierdzony adres.
- Wszystko, czego reguła nie zezwala wprost, jest zabronione.
- Wdrożone kolekcje: dozwolone i wymagane klucze, typy, wersja właściwa dla kolekcji i wariantu, tożsamość dokumentu, znaczniki czasu oraz limity pól, np. RPE 0–10.
- Profil wymaga dokładnych kluczy, wersji 1, poprawnych znaczników czasu oraz dokładnej mapy zgody z potwierdzeniem 18+. Kategoria 1–20 znaków musi być `null` bez zgody. Aktualizacja zachowuje `createdAt` i nie podmienia istniejącej zgody.
- `bodyWeights` i `readiness` wymagają przy zapisie własnej aktywnej zgody z `get(/users/{uid})`; odczyt i usunięcie pozostają dostępne zweryfikowanemu właścicielowi. `controlTests` i `controlTestResults` nadal odmawiają wszystkich operacji.
- Elementów list (`stepResults`, `blocks`) reguły nie sprawdzają pole po polu. Sprawdzają typ i rozmiar listy, a resztę schemat `zod/mini` w aplikacji.
- Gałąź `manual` wymaga kluczy wspólnych i `focusRatings` (lista ≤ 3), całkowitego RPE 0–10 i chwili jego podania, `null` czasów pracy i sparingu, całkowitego czasu 60–28 800 s oraz listy sparingu ≤ 1. Wersja 2 wymaga także `parts`. Reguły sprawdzają jej wartości, unikalność, zgodność z kategorią i obecność wpisu sparingu. Schemat klienta sprawdza również elementy ocen i ich unikalność. Zakresu 7 dni nie sprawdzamy względem `request.time`, aby późniejsza synchronizacja offline i edycja starszego wpisu mogły się powieść.
- Testy na emulatorze obejmują m.in. dostęp właściciela, drugiego konta, niezalogowanego i konta bez potwierdzonego e-maila, wersje dokumentów i nadmiarowe pola. Dla profilu i pomiarów sprawdzają również zgodę 18+, granice masy i usuwanie po wycofaniu zgody. Dla zarezerwowanych kolekcji sprawdzają odmowę.

## Odczyt (ADR 0007)

| Kolekcja | Co słuchamy przez `onSnapshot` |
| --- | --- |
| `workoutPlans`, `workoutSessions`, `focusSkills`, `exercises` | całą kolekcję |
| `weekPlans` | bieżący i 12 poprzednich tygodni oraz wszystkie przyszłe plany (`weekStart >=` dolna granica) |
| `recurringWeeks` | nagłówek i pozycje stałego tygodnia |
| `bodyWeights` | całą kolekcję tylko przy ważnej zgodzie; sortowanie w `src/domain` |
| `readiness` | całą kolekcję tylko przy osobnej aktywnej zgodzie; poprzednie dni są potrzebne do normy historycznego RPE i każdego punktu wykresu (ADR 0015) |
| `users/{uid}` | dokument zawsze po zalogowaniu |

Profil i pomiary mają wspólnego providera danych z pozostałymi kolekcjami. `hasPendingWrites` obu źródeł wchodzi do ostrzeżenia przy wylogowaniu. Gdy migawki nie pokazują zaległych zapisów, aplikacja sprawdza całą kolejkę Firestore przez `waitForPendingWrites` z limitem 1 s: zakończenie pozwala wylogować bez okna, a limit czasu lub błąd powoduje ostrzeżenie. Jeśli baza nie była jeszcze otwarta w tym uruchomieniu, aplikacja otwiera ją, żeby sprawdzić kolejkę. Obejmuje to także usunięcia i zapisy z poprzedniego uruchomienia. Wycofanie zgody zamyka nasłuch pomiarów, a wylogowanie zamyka wszystkie nasłuchy przed czyszczeniem cache. Wylogowanie czyści również pamięć IndexedDB z poprzednich uruchomień, gdy baza nie była jeszcze otwarta w tym uruchomieniu: tworzy instancję z tą samą konfiguracją (w tym emulatora), kończy ją i usuwa pamięć. Jeśli nie uda się wczytać samego modułu bazy, dotychczasowa obsługa błędu pozostaje bez zmian.

- Bez zapytań z dwoma polami sortowania, więc bez indeksów złożonych.
- **Koszt na planie Spark:** 50 000 odczytów dziennie. Po ponad 30 minutach bez połączenia Firestore liczy ponowne nasłuchiwanie jak nowe zapytanie, czyli odczyt wszystkich dokumentów kolekcji. Przy kilkudziesięciu wpisach na uczestnika badania to bezpieczne. Gdy użytkownik przekroczy 500 wpisów, historia dostanie stronicowanie.

## Eksport i usunięcie konta (Q7)

- **Eksport:** osobne pliki JSON, CSV dziennika, CSV samopoczucia i CSV prywatnych ćwiczeń, z lokalną datą w nazwie. JSON ma `format: 'combat-training-export'`, `formatVersion: 1`, chwilę ISO `exportedAt`, identyfikator i e-mail konta, surowy profil albo `null` oraz dokumenty z `IMPLEMENTED_USER_COLLECTIONS` w kolejności ID. Zachowuje pola i wersje surowych dokumentów, także niepoprawnych.
- **CSV dziennika:** UTF-8 z BOM, separator `;`, minuty z jedną cyfrą po przecinku i przecinkiem dziesiętnym; cudzysłowy i nowe linie są escapowane. Komórki zaczynające się od `=`, `+`, `-`, `@`, tabulatora lub CR dostają apostrof. Jeden wiersz na poprawny wpis, od najstarszego (`workoutDate`, `startedAt` lub `createdAt`, `id`); niepoprawne dokumenty nadal są dostępne w JSON. Polskie etykiety są współdzielone z UI, wartości nieznane pozostają puste. Realizacja rozróżnia ćwiczenia i rundy; ręczny wpis ma ją pustą. Szybki stoper bierze nazwę z `workoutSessionName`, nie ma ocen celu, a intensywność `null` pozostaje pusta. „RPE z pamięci” korzysta ze wspólnego obliczenia.
- **CSV samopoczucia:** osobny plik `combat-training-samopoczucie-RRRR-MM-DD.csv`, także UTF-8 z BOM, `;` i ochroną komórek. Wszystkie poprawne wpisy według daty, również dni bez treningów: cztery oceny, notatka, wersja pytań, utworzenie i poprawka. JSON zawiera także surowe niepoprawne wpisy `readiness`; ostrzeżenie eksportu obejmuje obie grupy danych o zdrowiu.
- **Źródło:** tylko serwer (`getDocFromServer`, `getDocsFromServer`); bez sieci lub przy `hasPendingWrites` eksport i usunięcie są zablokowane.
- **Usunięcie konta:** bez Cloud Functions i karencji (ADR 0013).
  1. Ponowne logowanie hasłem lub Google. Powrót z Google uznaje się za potwierdzony wyłącznie przy zgodnym `uid` znacznika i wyniku `reauthenticate` odebranym raz przez AuthProvider. Usunięcie zawsze wymaga osobnego przycisku.
  2. Odświeżenie tokenu i kontrola `authTime` (do 4 minut); błąd lub stare potwierdzenie nie usuwa żadnych danych.
  3. Odczyt z serwera i usunięcie kolejno `readiness`, `bodyWeights`, `workoutSessions`, `focusSkills`, `weekPlans`, `workoutPlans`, `exercises` i `recurringWeeks`, partiami najwyżej 500, także dokumentów niezgodnych ze schematem.
  4. Usunięcie `users/{uid}`, potem konta Authentication.
  5. Zamknięcie nasłuchów i wyczyszczenie Firestore; usunięcie wszystkich kluczy `localStorage` pasujących do `combat-training.*.{uid}` oraz znacznika przekierowania. Klucze innego konta i ustawienia bez `uid` (motyw, przygotowanie, sygnał 10 s) zostają. Sprzątanie jest niezależne od odmontowania ekranu.
  6. Jednorazowy komunikat na logowaniu. Trasa usuwania nigdy nie jest celem powrotu po logowaniu.

  Przerwany proces można powtórzyć. Na planie Spark bez Cloud Functions zaległy zapis offline z innego urządzenia może odtworzyć dokument po usunięciu konta, dopóki jego token pozostaje ważny (do godziny). Blokada `bodyWeightWithdrawal` działa w trakcie wycofywania zgody i jest przechowywana w usuwanym profilu. UI prosi o połączenie i wylogowanie innych urządzeń. Ręczną kontrolę właściciela opisuje `deployment.md`.
