# Słownik domenowy

| Polski interfejs | Nazwa w kodzie |
|---|---|
| trening | `workout` |
| plan treningu | `workoutPlan` |
| blok treningowy | `workoutBlock` |
| element bloku | `workoutItem` |
| ćwiczenie | `exercise` |
| kombinacja | `combination` |
| runda | `round` |
| odpoczynek między rundami | `roundRest` |
| przerwa między ćwiczeniami | `break` |
| dyscyplina | `discipline` |
| tryb rundowy | `rounds` |
| tryb ciągły | `continuous` |
| tryb siłowy | `strength` |
| ocena wykonania | `executionRating` |
| główny cel | `mainGoal` |
| realizacja celu | `goalCompletionRating` |
| odczuwany postęp | `perceivedProgress` |
| koncentracja | `concentrationRating` |
| dyskomfort | `discomfort` |
| wnioski | `workoutConclusions` |
| wpis w dzienniku | `workoutSession` |
| źródło wpisu | `source`: `plan`, `quickTimer`, `manual` |
| szybki stoper | `quickTimer` |
| ręczny wpis | `manual` |
| rodzaj treningu | `category` (typ bloku bez rozgrzewki albo `mixed`) |
| trening ukończony | `completed` |
| trening częściowy | `partial` |
| czas treningu | `durationSeconds` |
| czas pracy | `workSeconds` |
| czas sparingu | `sparringSeconds` |
| realizacja | `completion` |
| dzień treningu | `workoutDate` |
| ćwiczenie celu | `focusSkill` (dokument z nazwą i kryterium); w planie `WorkoutExercise.focusSkillId` |
| kryterium | `criterion` |
| ocena ćwiczenia celu | `focusRating.assessment` (1–5 albo `unableToRate`) |
| „Nie umiem ocenić” | `unableToRate` |
| notatka „problem i poprawka” | `correction` (`problem`, `fix`) |
| lepiej / bez zmian / nie sprawdzono | `better` / `same` / `notChecked` |
| RPE treningu | `rpe` |
| obciążenie | RPE × minuty czasu treningu, liczone, nie zapisywane |
| intensywność sparingu | `sparringIntensity`: `light`, `technical`, `hard` |
| twarde rundy | suma `rounds` we wpisach `sparring` z `hard` |
| plan tygodnia (cele) | `weekPlan`; pozycja `weekPlanItem` |
| gotowość | `readiness`: `sleep`, `fatigue`, `soreness`, `stress` |
| zgoda na dane o zdrowiu | `healthDataConsent` |
| waga | `bodyWeight`, `weightKg` |
| test kontrolny | `controlTest` |
| paszport testu | `passport` |
| wynik testu | `controlTestResult` |

## Identyfikatory i tłumaczenia

Klucze techniczne są neutralne językowo i zapisane po angielsku, np.:

- `boxing`;
- `heavy_bag`;
- `jab_cross_lead_hook`.

Tekst widoczny użytkownikowi jest polski, np.:

- „Boks”;
- „Worek”;
- „Jab → prawy prosty → lewy sierpowy”.

Nie używaj polskich znaków w nazwach zmiennych, tabel ani kolumn.
