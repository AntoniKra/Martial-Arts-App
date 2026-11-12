# Model danych w Firestore

Stan: 12 listopada 2026. Decyzje: `adr/0008-firestore-document-model.md` (ten model), `adr/0007-firestore-reads-with-onsnapshot.md` (pobieranie danych), `adr/0005-journal-entry-definitions.md` (wpis w dzienniku). Funkcje i oceny opisuje `feedback-system.md`.

Model zastępuje lokalny storage. Dane z `localStorage` to dane pokazowe: nie importujemy ich, Firestore zaczyna od zera (decyzja D2). Opis dawnego storage v1–v3 jest w historii Gita i w `domain-model.md`.

## Zasady

- **Wszystko pod `users/{uid}`.** Konta nie dzielą żadnych danych. Biblioteka kombinacji i opisy testów wbudowanych są w kodzie, nie w bazie.
- **`schemaVersion` w każdym dokumencie.** Każda kolekcja zaczyna od `1`, niezależnie od wersji dawnego `localStorage`. Zmiana kształtu dokumentu podnosi wersję, a odczyt obsługuje starsze wersje.
- **Identyfikatory nadaje aplikacja** (`crypto.randomUUID()`), żeby zapis działał bez sieci. Pole `id` w dokumencie jest równe ID dokumentu. Wyjątek: dokumenty „jeden na dzień” albo „jeden na tydzień” mają ID równe dacie (`weekPlans` oraz zaplanowane `readiness` i `bodyWeights`). Zapas zgodności dla ID sesji opisano w sekcji `workoutSessions`.
- **Daty jako tekst.** Dzień: `YYYY-MM-DD`. Chwila: ISO 8601 w UTC z `toISOString()`, np. `2026-11-08T01:51:00.000Z`, więc sortuje się jak tekst. Nie używamy `serverTimestamp()`: dokument zapisany offline ma od razu komplet pól.
- **`createdAt` i `updatedAt`** są w każdym dokumencie.
- **Jednostki:** czasy w sekundach, waga w kg z dokładnością do 0,1.
- **Snapshoty.** Sesja zapisuje nazwę planu, nazwy etapów, nazwę ćwiczenia celu i treść kryterium z chwili treningu. Późniejsza zmiana planu, biblioteki albo kryterium nie zmienia historii.
- **Bez dokumentów podsumowań.** Tydzień, trendy, plan tygodnia i statystyki profilu liczymy w `src/domain` z pobranych dokumentów. Przy kilkuset wpisach na osobę to tanie i nie może się rozjechać z danymi.
- **Walidacja:** każdy odczyt i zapis przechodzi przez schemat `zod/mini` w `src/infrastructure` (ADR 0006). Reguły Firestore sprawdzają to samo na płytkim poziomie.

## Kolekcje

| Ścieżka | Co przechowuje | ID dokumentu | Stan / pierwsze użycie |
| --- | --- | --- | --- |
| `users/{uid}` | zgoda na dane o zdrowiu | `uid` | **zaplanowane, jeszcze niewdrożone**: gotowość albo waga |
| `users/{uid}/workoutPlans/{planId}` | plany treningowe | UUID | wdrożone: przejście na Firestore |
| `users/{uid}/workoutSessions/{sessionId}` | wpisy w dzienniku z ocenami i RPE | UUID albo zapasowe ID opisane niżej | wdrożone: przejście na Firestore |
| `users/{uid}/focusSkills/{focusSkillId}` | ćwiczenia celu z kryterium | UUID | wdrożone: ćwiczenia celu (R1) |
| `users/{uid}/weekPlans/{weekStart}` | plan tygodnia, czyli moduł celów | poniedziałek `YYYY-MM-DD` | wdrożone: plan tygodnia (R3) |
| `users/{uid}/readiness/{date}` | gotowość przed treningiem | dzień `YYYY-MM-DD` | **zaplanowane, jeszcze niewdrożone**: gotowość (Q3) |
| `users/{uid}/bodyWeights/{date}` | historia wagi | dzień `YYYY-MM-DD` | **zaplanowane, jeszcze niewdrożone**: profil |
| `users/{uid}/controlTests/{testId}` | testy kontrolne z paszportem | UUID | **zaplanowane, jeszcze niewdrożone**: testy (R4) |
| `users/{uid}/controlTestResults/{resultId}` | wyniki testów | UUID | **zaplanowane, jeszcze niewdrożone**: testy (R4) |

Lista jest zamknięta. Kod trzyma ją w `src/infrastructure/firebase/userCollections.ts` (`USER_COLLECTIONS`). Wdrożone w kodzie kolekcje to `workoutPlans`, `workoutSessions`, `focusSkills` i `weekPlans`; pozostałe nazwy opisują przyszłe funkcje. Sam rejestr nie otwiera reguł ani nasłuchów. Eksport i usunięcie konta, kiedy powstaną, mają korzystać z pełnej listy; dokument `users/{uid}` obsługują osobno. Nowa kolekcja wymaga dopisania jej do rejestru, reguł i testów reguł.

Profil `users/{uid}` oraz kolekcje `readiness`, `bodyWeights`, `controlTests` i `controlTestResults` nie mają jeszcze implementacji obsługi danych w aplikacji ani reguł zezwalających na dostęp. Ich poniższe modele, zgody i zasady odczytu są planem; obecne reguły odrzucają wszystkie operacje na tych ścieżkach.

## `users/{uid}`

**Zaplanowane, jeszcze niewdrożone.** Poniżej docelowy model profilu i obsługi zgody.

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

Nowa sesja z planu otrzymuje ID z `crypto.randomUUID()` przy rozpoczęciu pierwszego etapu (`src/features/workout-player/hooks/useWorkoutSessionRecorder.ts`). Jeśli odzyskiwany zapis przygotowania ma `sessionId: null`, a termin przygotowania już minął, `src/features/workout-player/utils/resolveActiveWorkout.ts` nadaje ID `planId-startedAtMs`, gdzie `startedAtMs` to termin końca przygotowania w milisekundach. To zapas zgodności dla wznowienia; istniejące `sessionId` jest zachowywane.

### Pola wspólne

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `id` | UUID albo `planId-startedAtMs` | Zapasowe ID tylko w opisanym wyżej przypadku wznowienia |
| `source` | `plan`, `quickTimer`, `manual` | ADR 0005 |
| `status` | `completed`, `partial` | Ręczny wpis ma zawsze `completed` |
| `disciplineKey` | klucz dyscypliny | |
| `category` | typ bloku bez rozgrzewki i rozluźnienia albo `mixed` | ADR 0005. Szybki stoper: wybór użytkownika, ustalimy w jego issue |
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

Po korekcie zegara `−15 s` / `+15 s` (issue #91) `stepResults[].plannedDurationSeconds` oznacza czas docelowy etapu po korektach, minimum 1 s, a nie pierwotny czas z planu. Dla `completed` nadal obowiązuje `performedDurationSeconds === plannedDurationSeconds`; np. runda 180 s wydłużona o 15 s zapisuje obie wartości jako 195 i wnosi 195 s do pracy. Licznik `completion` nie zmienia znaczenia. Korekta nie zmienia planu ani pól dokumentu sesji, więc schemat wersji 1 i reguły Firestore pozostają bez zmian. Lokalny zapis wznowienia ma opcjonalne `stepDurations` z celami etapów; brak pola w starym zapisie oznacza czasy z planu. Wynik wcześniejszej próby zachowuje własny czas docelowy także po restarcie etapu.

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
- Schowanie ustawia `archivedAt` i `updatedAt` oraz zdejmuje `focusSkillId` (ustawia `null`) ze wszystkich wystąpień we wszystkich planach, aktualizując ich `updatedAt`. Dokument ćwiczenia celu i zmiany planów zapisujemy jednym `writeBatch`, działającym również offline. Ćwiczenia pozostają w planach, historyczne oceny i wykres zostają. UI potwierdza zapis lokalny i pokazuje „Czeka na wysłanie” do potwierdzenia serwera.
- Przywrócenie ustawia `archivedAt: null` i nowe `updatedAt`. Nie przywraca `focusSkillId` w planach; oznaczenie CEL można ponownie ustawić w kreatorze.
- Usunąć można ćwiczenie celu bez **żadnego wpisu** w `focusRatings` jakiejkolwiek sesji (również `assessment: null` i `unableToRate` blokują usunięcie). Wtedy usunięcie dokumentu i zdjęcie `focusSkillId` w planach odbywa się jednym `writeBatch`. Ćwiczenie celu z wpisami można tylko schować.
- Operacje te nie zmieniają lokalnej kopii planu i migawek ocen trwającego treningu. Plan ze schowanym ID, np. starszy szkic, pozostaje poprawny do zapisu, ale schowane ćwiczenie celu nie jest oferowane jako nowy wybór.
- `openCorrection` zmienia się razem z zapisem ocen, w jednym zapisie zbiorczym (`writeBatch`), który działa także offline. Zasady: `feedback-system.md`.

## `weekPlans` (plan tygodnia i moduł celów)

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
3. Pozostałe ukończone sesje dowolnego źródła przypisujemy do wolnych pozycji rodzaju z identyczną `category`.
4. Następnie analogicznie przypisujemy częściowe: najpierw dokładny plan, potem rodzaj.
5. Każda sesja i pozycja uczestniczy najwyżej w jednym dopasowaniu. W każdej fazie kolejność to `workoutDate`, `startedAt` (sesje czasowe) lub `createdAt` (ręczne), następnie `id`; identyczne pozycje zachowują kolejność listy.
6. Pasek to **wyłącznie ukończone / zaplanowane**, najwyżej 100%. Częściowe, niewykonane i dodatkowe mają osobne liczniki. Pozostałe sesje są dodatkowe tylko przy istniejącym celu. Brak dokumentu lub `items: []` oznacza brak celu: liczba treningów i możliwość ułożenia planu, bez paska i „dodatkowych”. Loading, błąd, niepoprawne lub niepełne dane nie oznaczają braku celu ani zera sesji.

`mixed` nie jest dowolnym rodzajem, a podobna nazwa nie zastępuje ID planu. `planNameSnapshot` zachowuje historię po zmianie lub usunięciu planu treningowego. Niedostępny plan pozostaje na liście do świadomego usunięcia lub zastąpienia. Edycja celu (także pustej listy) nie usuwa sesji; realizacja przelicza się względem aktualnej listy.

Nie ma automatycznego przenoszenia. Kopiowanie wybranych pozycji lub całej listy z poprzedniego tygodnia obejmuje także ukończone cele; nadaje nowe ID, dopisuje do szkicu celu i wymaga zapisu. Nie kopiuje sesji, statusów ani flagi, nie zmienia źródła. Przekroczenie 14 blokuje całą operację.

Home pokazuje zwięzły cel, a „Postęp” prowadzi do leniwie ładowanych szczegółów z wyborem tygodnia i edycją. Jeden nasłuch na konto obejmuje bieżący i 12 poprzednich tygodni oraz przyszłość (`weekStart >=` dolna granica). Po zmianie tygodnia lub powrocie z tła granica odświeża się bez przeładowania; starszych dokumentów nie usuwamy. Tydzień spoza zakresu nie jest prezentowany jako pusty. Niepełny cache bez dokumentu blokuje tworzenie planu; poprawny dokument z cache można edytować offline. Liczniki sesji wymagają pełnego, poprawnego odczytu; błąd ćwiczeń celu nie blokuje niezależnego celu tygodnia.

Zapis potwierdza lokalny snapshot i pokazuje „Czeka na wysłanie” do potwierdzenia serwera. Późniejsze odrzucenie pokazuje błąd i wymaga ponowienia odczytu, zamiast pozostawiać komunikat sukcesu. Zmiana konta i wylogowanie zamykają nasłuch oraz czyszczą jego dane; cel nie trafia do globalnego `localStorage`.

## `readiness` (gotowość, Q3)

**Zaplanowane, jeszcze niewdrożone.** Poniżej docelowy model, bez obsługi danych i zezwalających reguł.

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `date` | `YYYY-MM-DD` | Równy ID dokumentu |
| `sleep`, `fatigue`, `soreness`, `stress` | liczba całkowita 1–5 | Opisy stopni ustalimy w issue gotowości |
| `recordedAt`, `updatedAt` | chwila | |

- Jeden dokument na dzień, przed pierwszym treningiem. Poprawka nadpisuje ten sam dokument.
- Zapis wymaga zgody w `users/{uid}`.

## `bodyWeights` (waga)

**Zaplanowane, jeszcze niewdrożone.** Poniżej docelowy model, bez obsługi danych i zezwalających reguł.

| Pole | Typ | Opis |
| --- | --- | --- |
| `schemaVersion` | `1` | |
| `date` | `YYYY-MM-DD` | Równy ID dokumentu |
| `weightKg` | 30,0–250,0, krok 0,1 | |
| `recordedAt`, `updatedAt` | chwila | |

- Jeden wpis na dzień. Zapis wymaga tej samej zgody co gotowość.
- Pozostałe statystyki profilu liczymy z dziennika.

## `controlTests` i `controlTestResults` (testy kontrolne, R4)

**Zaplanowane, jeszcze niewdrożone.** Kształt wstępny, bez obsługi danych i zezwalających reguł. Szczegóły pól doprecyzujemy w issue testów, bo ekranów jeszcze nie projektowaliśmy.

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
- Wdrożone kolekcje: dozwolone klucze (`hasOnly`) i wymagane klucze (`hasAll`), typy, `schemaVersion == 1`, tożsamość dokumentu (`id`, a w `weekPlans` — `weekStart`), znaczniki czasu oraz odpowiednie dla modelu długości tekstów, rozmiary list i zakresy liczb, np. RPE 0–10.
- **Zaplanowane:** `readiness` i `bodyWeights` mają pozwalać na utworzenie i zmianę tylko przy zgodzie w `users/{uid}`, a na usunięcie także po wycofaniu zgody. Obecnie reguły nie dopuszczają żadnej z tych operacji.
- Elementów list (`stepResults`, `blocks`) reguły nie sprawdzają pole po polu. Sprawdzają typ i rozmiar listy, a resztę schemat `zod/mini` w aplikacji.
- Testy na emulatorze dla wdrożonych kolekcji: właściciel, drugie konto, niezalogowany, konto bez potwierdzonego e-maila, zły `schemaVersion`, nadmiarowe pole. Dla profilu i zaplanowanych kolekcji testy sprawdzają odmowę dostępu; testy zapisu danych o zdrowiu bez zgody dojdą przy wdrożeniu tych funkcji.

## Odczyt (ADR 0007)

| Kolekcja | Co słuchamy przez `onSnapshot` |
| --- | --- |
| `workoutPlans`, `workoutSessions`, `focusSkills` | całą kolekcję; sortowanie w `src/domain` |
| `weekPlans` | bieżący i 12 poprzednich tygodni oraz wszystkie przyszłe plany (`weekStart >=` dolna granica) |
| `bodyWeights`, `controlTests`, `controlTestResults` | **zaplanowane, jeszcze niewdrożone:** całą kolekcję; sortowanie w `src/domain` |
| `readiness` | **zaplanowane, jeszcze niewdrożone:** ostatnie 28 dni (`date >=`) |
| `users/{uid}` | **zaplanowane, jeszcze niewdrożone:** dokument |

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
