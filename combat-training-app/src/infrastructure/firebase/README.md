# Firebase integration

`firebaseConfig.ts` sprawdza konfigurację z `.env`, a `firebaseAuthService.ts`
implementuje `AuthService` z `src/application/auth`. Sesja jest zapisywana w IndexedDB.
Używamy `initializeAuth` bez zależności okien i przekierowań Google. Nie ma tu jeszcze Firestore.

Tryb emulatora wymaga jawnego hosta `localhost:port` lub `127.0.0.1:port` oraz projektu
z prefiksem `demo-`. Projekt demo bez emulatora jest odrzucany. Testy E2E ustawiają
wyłącznie konfigurację `demo-combat-training` w `playwright.config.ts`.

Baner DOM dodawany przez SDK emulatora jest wyłączony: zasłaniał przyciski odtwarzacza
i znajdował się poza obszarami strony. Komunikat diagnostyczny SDK pozostaje w konsoli.
Ta opcja nie ma wpływu na weryfikację sesji ani blokadę projektu demo.

Polskie komunikaty błędów znajdują się w `src/features/auth`, poza adapterem.
Plany i historia pozostają w localStorage: są wspólne dla kont w tej samej przeglądarce,
nie są synchronizowane i nie są usuwane podczas wylogowania. Nie zawierają jeszcze UID.

Nie wywołuj Firebase w komponentach React. Zasady: `AGENTS.md` (Data and backend) i `docs/adr/0004-firebase-as-baas.md`.
