---
status: accepted
---

# Walidacja danych z `zod/mini`, bez biblioteki formularzy

Dane z zewnątrz sprawdzamy schematami z `zod/mini`: dokumenty Firestore przy odczycie i zapisie, dane z `localStorage`, import pliku „Moje dane” i pola formularzy. Formularze to zwykłe kontrolowane pola Reacta, a reguły walidacji są w czystej funkcji z testami jednostkowymi, na przykład `src/features/auth/validateAuthForm.ts`. Zastępuje to zapis „React Hook Form i Zod” z `docs/architecture.md`.

Formularze aplikacji mają po kilka pól, a największe z nich (kreator planu) ma już własny reduktor. React Hook Form niczego tu nie upraszcza, a dokłada kod do głównej paczki. Pełny import `zod` nie usuwa nieużywanych części przy budowaniu, a `zod/mini` ma to samo API funkcyjne i usuwa. Po zmianie formularza logowania główna paczka JS zmalała z 187,9 KB do 163,1 KB po gzip.

## Konsekwencje

- **Schematy dokumentów są w `src/infrastructure`**, przy repozytoriach. `src/domain` nie importuje `zod`: reguły domenowe (na przykład `workoutValidation.ts`) zostają zwykłymi funkcjami.
- **Komunikaty błędów są po polsku w module funkcji**, nie w schematach. Schemat mówi, czy dane są poprawne, a funkcja walidacji zamienia to na komunikat dla pola.
- **Istniejące ręczne schematy `localStorage`** (`workoutPlanStorageSchema.ts`, `workoutSessionStorageSchema.ts`) zostają do przejścia na repozytoria Firestore. Nowe schematy piszemy już w `zod/mini`.
- **Import tylko z `zod/mini`**, nigdy z `zod`. Biblioteka formularzy wymaga nowego ADR z formularzem, który jej potrzebuje.
