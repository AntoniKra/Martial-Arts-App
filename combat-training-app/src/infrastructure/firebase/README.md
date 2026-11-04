# Firebase integration

Implementacja zostanie dodana razem z logowaniem (Firebase Authentication) i repozytoriami Firestore.

Docelowo katalog zawiera:

- inicjalizację aplikacji Firebase z konfiguracji `.env`, sprawdzanej przy starcie;
- adapter logowania zgodny z interfejsem z `src/application`;
- repozytoria Firestore z walidacją dokumentów przy odczycie i zapisie;
- mapowanie błędów Firebase na polskie komunikaty.

Nie wywołuj Firebase w komponentach React. Zasady: `AGENTS.md` (Data and backend) i `docs/adr/0004-firebase-as-baas.md`.
