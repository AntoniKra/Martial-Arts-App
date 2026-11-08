# Architektura aplikacji

## Zasada modularności

Kod jest organizowany według funkcji domenowych. Nie tworzymy jednego katalogu pełnego przypadkowych komponentów ani warstw enterprise bez potrzeby.

```text
src/
├── app/                 konfiguracja, router, providery
├── components/          współdzielone UI i layout
├── domain/              stabilne typy i czyste obliczenia
├── features/            moduły funkcjonalne
├── infrastructure/      Firebase, audio, Wake Lock, storage
├── pages/               komponenty tras
├── styles/
└── test/
```

## Granice odpowiedzialności

- komponent UI nie wywołuje Firebase;
- logika czasu i średnich nie znajduje się w JSX;
- typy domenowe nie zależą od Reacta;
- infrastruktura implementuje interfejsy repozytoriów;
- mocki i seed nie są źródłem prawdy po podłączeniu bazy;
- kod prototypu Figmy nie definiuje architektury produkcyjnej.

## Stan

- routing: React Router;
- dane z Firestore: subskrypcje `onSnapshot` w repozytoriach i mały własny hook, bez TanStack Query (ADR 0007);
- formularze: kontrolowane pola Reacta i walidacja w czystej funkcji ze schematami `zod/mini` (ADR 0006);
- kreator: reducer lub wyspecjalizowany hook domenowy;
- aktywny timer: osobny moduł stanów, nie ogólny globalny store;
- szkic lokalny: storage adapter.

## Rozbudowa

Nowe moduły przyszłe trafiają do `features`, np.:

- `focus-skills` (ćwiczenia celu);
- `week-plan` (plan tygodnia, czyli cele);
- `readiness`;
- `athlete-profile` (waga i statystyki);
- `control-tests`;
- `analytics` (podsumowanie tygodnia i trendy);
- `strength-training` i `combination-builder` w kierunkach rozwoju.

Nie dodawaj pustych abstrakcji wyłącznie „na przyszłość”. Model ma nie blokować rozbudowy, ale implementujemy tylko potrzebne interfejsy.
