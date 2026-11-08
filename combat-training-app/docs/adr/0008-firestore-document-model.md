---
status: accepted
---

# Model dokumentów w Firestore

Ustalenia z 4–8 listopada 2026 (rundy Q1–Q10, R1–R4, D1–D4 i pytania z 8 listopada). Pełny opis pól: `docs/database-model.md`.

Dane użytkownika leżą w dziewięciu miejscach pod `users/{uid}`: dokument ze zgodą na dane o zdrowiu oraz kolekcje `workoutPlans`, `workoutSessions`, `focusSkills`, `weekPlans`, `readiness`, `bodyWeights`, `controlTests` i `controlTestResults`. Każdy dokument ma `schemaVersion` (każda kolekcja zaczyna od 1), identyfikator nadany w aplikacji, `createdAt` i `updatedAt`. Daty zapisujemy jako tekst: dzień `YYYY-MM-DD`, chwilę jako ISO 8601 w UTC. Firestore zaczyna od zera, bez importu z `localStorage` (D2).

## Najważniejsze wybory

- **Oceny, RPE i sparing są w dokumencie sesji**, a nie w osobnych kolekcjach. Wpis i jego oceny zapisują się razem, także offline, a usunięcie wpisu usuwa jego oceny. Pola przyszłych funkcji są w sesji od pierwszej wersji, więc ich wdrożenie nie wymaga migracji danych.
- **Ćwiczenie celu to osobny dokument** (`focusSkills`) z nazwą i kryterium, wskazywany z ćwiczeń w wielu planach. Wykres ocen jednej umiejętności zbiera oceny ze wszystkich planów (decyzja właściciela z 8.11). Ocena w sesji zapisuje kopię nazwy i kryterium.
- **Plan tygodnia jest modułem celów z karty pracy** (decyzja z 8.11). Pozycja to plan z aplikacji albo rodzaj treningu spoza aplikacji, np. sparing w klubie. Dopasowanie wpisów do pozycji liczymy w aplikacji.
- **Jedna zgoda na dane o zdrowiu** obejmuje gotowość i wagę (decyzja z 8.11). Reguły Firestore odrzucają zapis gotowości i wagi bez tej zgody. Wycofanie zgody usuwa oba rodzaje danych.
- **Dokumenty „jeden na dzień” i „jeden na tydzień”** mają ID równe dacie. Firestore pilnuje wtedy jednego dokumentu bez dodatkowego zapytania.
- **Bez dokumentów podsumowań.** Tydzień, trendy i statystyki liczymy w `src/domain` z pobranych dokumentów, tak jak zapowiadał ADR 0004.
- **Zamknięta lista kolekcji** w jednej stałej w kodzie. Eksport i usunięcie konta działają bez Cloud Functions, więc muszą znać wszystkie kolekcje.

## Konsekwencje

- `WorkoutSession` staje się unią według źródła (`plan`, `quickTimer`, `manual`), a `completion` dostaje jednostkę (`exercise` albo `round`).
- `WorkoutFeedback` (koncentracja, dyskomfort, realizacja celu, odczuwany postęp) przechodzi do kierunków rozwoju.
- Reguły sprawdzają klucze, typy, zakresy i rozmiary list. Elementy list sprawdza schemat `zod/mini` w aplikacji.
- Przy ponad 500 wpisach na osobę historia będzie potrzebowała stronicowania (koszt odczytów na planie Spark).

## Rozważone opcje

- **Oceny w osobnej kolekcji:** łatwiejsze zapytania o trend, ale dwa zapisy na jeden trening i ryzyko ocen bez wpisu. Przy kilkuset wpisach trend i tak liczymy z pobranych sesji.
- **Ćwiczenie celu w planie albo łączone po nazwie:** prostsze, ale ta sama umiejętność w dwóch planach miałaby dwa wykresy, a zmiana nazwy rozbijałaby trend.
- **Dokument podsumowania tygodnia aktualizowany przy zapisie:** mniej odczytów, ale łatwo się rozjeżdża z danymi, a bez Cloud Functions trzeba by go poprawiać przy każdej edycji i usunięciu wpisu.
- **`serverTimestamp()`:** czas serwera, ale dokument zapisany offline ma do synchronizacji puste pole daty.
