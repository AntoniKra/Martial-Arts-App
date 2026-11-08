# Firebase integration

`firebaseConfig.ts` sprawdza konfigurację z `.env`, a `firebaseAuthService.ts`
implementuje `AuthService` z `src/application/auth`. Sesja jest zapisywana w IndexedDB.
Używamy `initializeAuth` bez zależności okien i przekierowań Google.

`createFirestoreRepositories.ts` jest importowany dynamicznie po pierwszym renderze
i potwierdzeniu konta. Firestore używa `persistentLocalCache` z
`persistentMultipleTabManager`. Każde konto otrzymuje repozytoria ograniczone do
`users/{uid}/workoutPlans` i `users/{uid}/workoutSessions`.

Provider utrzymuje po jednej subskrypcji na kolekcję. Schematy `zod/mini` sprawdzają
każdy dokument przy odczycie i zapisie; błędne dokumenty są pomijane z widocznym
komunikatem. Zapis kończy się po lokalnym snapshotcie, a nie po odpowiedzi serwera.
Błąd późniejszego wysłania jest zgłaszany providerowi, bez nieobsłużonej obietnicy.
Aktualizacja notatki zmienia tylko notatkę i `updatedAt`.

Tryb emulatora wymaga jawnego hosta `localhost:port` lub `127.0.0.1:port` oraz projektu
z prefiksem `demo-`. Projekt demo bez emulatora jest odrzucany. Testy E2E ustawiają
wyłącznie konfigurację `demo-combat-training` w `playwright.config.ts`.
Firestore wymaga dodatkowo `VITE_FIREBASE_FIRESTORE_EMULATOR_HOST`. `npm run test:e2e`
uruchamia oba emulatory; wymaga Javy 21 lub nowszej. Testy odczytują serwer emulatora,
więc lokalny snapshot sam w sobie nie wystarcza do potwierdzenia synchronizacji.

Baner DOM dodawany przez SDK emulatora jest wyłączony: zasłaniał przyciski odtwarzacza
i znajdował się poza obszarami strony. Komunikat diagnostyczny SDK pozostaje w konsoli.
Ta opcja nie ma wpływu na weryfikację sesji ani blokadę projektu demo.

Polskie komunikaty błędów znajdują się w `src/features/auth`, poza adapterem.
Stare pokazowe klucze localStorage są usuwane raz, bez importowania danych (D2).
Zmiana konta odłącza subskrypcje poprzedniego UID. Ostrzeżenie o niewysłanych danych
przy wylogowaniu i czyszczenie pamięci Firestore pozostają w issue #51.

Nie wywołuj Firebase w komponentach React. Zasady: `AGENTS.md` (Data and backend) i `docs/adr/0004-firebase-as-baas.md`.
