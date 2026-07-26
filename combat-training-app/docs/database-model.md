# Wstępny model danych Supabase

Dokument opisuje kierunek. Ostateczne migracje tworzymy dopiero po zatwierdzeniu modelu w kodzie domenowym.

## Lokalny storage v1 — WorkoutSession

W aplikacji lokalny envelope sesji jest oddzielony od planów:

- klucz namespaced, niezależny od `workout-plans`;
- `schemaVersion: 1`;
- `sessions: WorkoutSession[]`.

Storage v1 przechowuje wyłącznie ukończone sesje. Brak draftów, porzuconych treningów, RPE, ocen i feedbacku.

Każda sesja zawiera snapshot planu i wyniki kroków (`stepResults`) z outcome `completed`, `partial` lub `skipped`.

`activeDurationSeconds` nie jest zapisywany — jest wyliczany w domenie jako suma `performedDurationSeconds`.

Instrukcje ćwiczeń nie są zapisywane w storage v1, jeżeli nie są potrzebne do historii i podsumowania.

## `workouts`

- `id uuid`;
- `user_id uuid`;
- `status text` — draft/planned/in_progress/completed;
- `discipline_key text`;
- `custom_name text null`;
- `name_snapshot text`;
- `main_goal text null`;
- `created_at timestamptz`;
- `started_at timestamptz null`;
- `completed_at timestamptz null`;
- czasy planowane i rzeczywiste;
- feedback całej jednostki.

## `workout_blocks`

- `id uuid`;
- `workout_id uuid`;
- `block_type text`;
- `position integer`.

## `workout_items`

Wspólna oś elementów bloku:

- `id uuid`;
- `workout_block_id uuid`;
- `item_type text` — exercise/break;
- `position integer`;
- `exercise_mode text null` — rounds/continuous/strength;
- `combination_id uuid null`;
- `exercise_key text null`;
- `exercise_name_snapshot text null`;
- `instruction text null`;
- `rounds integer null`;
- `round_duration_seconds integer null`;
- `rest_between_rounds_seconds integer null`;
- `duration_seconds integer null`;
- rzeczywiste wykonanie: completed/skipped/partial, ukończone rundy, czasy;
- `execution_rating smallint null`.

## Biblioteka

### `combinations`

- `id uuid`;
- `combination_key text unique`;
- `name_pl text`;
- `name_en text null`;
- `is_system boolean`;
- `created_by uuid null`;
- `is_active boolean`.

### `combination_disciplines`

- `combination_id uuid`;
- `discipline_key text`.

### `combination_block_types`

- `combination_id uuid`;
- `block_type text`.

## Przyszły tryb siłowy

### `strength_sets`

- `id uuid`;
- `workout_item_id uuid`;
- `position integer`;
- `planned_weight_kg numeric null`;
- `planned_repetitions integer`;
- `actual_weight_kg numeric null`;
- `actual_repetitions integer null`;
- `status text`.

## Bezpieczeństwo

- wszystkie dane użytkownika mają `user_id` pośrednio lub bezpośrednio;
- anonimowy użytkownik Supabase otrzymuje własne UUID;
- RLS musi uniemożliwić odczyt i zapis cudzych danych;
- schemat jest zarządzany przez migracje SQL;
- komponenty React nie wykonują surowych zapytań Supabase bezpośrednio.
