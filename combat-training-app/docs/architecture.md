# Architektura aplikacji

## Zasada modularności

Kod jest organizowany według funkcji domenowych. Nie tworzymy jednego katalogu pełnego przypadkowych komponentów ani warstw enterprise bez potrzeby.

```text
src/
├── app/                 konfiguracja, router, providery
├── components/          współdzielone UI i layout
├── domain/              stabilne typy i czyste obliczenia
├── features/            moduły funkcjonalne
├── infrastructure/      Supabase, audio, Wake Lock, storage
├── pages/               komponenty tras
├── styles/
└── test/
```

## Granice odpowiedzialności

- komponent UI nie zawiera zapytań Supabase;
- logika czasu i średnich nie znajduje się w JSX;
- typy domenowe nie zależą od Reacta;
- infrastruktura implementuje interfejsy repozytoriów;
- mocki i seed nie są źródłem prawdy po podłączeniu bazy;
- kod prototypu Figmy nie definiuje architektury produkcyjnej.

## Stan

- routing: React Router;
- dane serwerowe: docelowo TanStack Query;
- formularze: React Hook Form i Zod tam, gdzie formularz ma klasyczną strukturę;
- kreator: reducer lub wyspecjalizowany hook domenowy;
- aktywny timer: osobny moduł stanów, nie ogólny globalny store;
- szkic lokalny: storage adapter.

## Rozbudowa

Nowe moduły przyszłe trafiają do `features`, np.:

- `goals`;
- `strength-training`;
- `athlete-profile`;
- `weight-tracking`;
- `analytics`;
- `combination-builder`.

Nie dodawaj pustych abstrakcji wyłącznie „na przyszłość”. Model ma nie blokować rozbudowy, ale implementujemy tylko potrzebne interfejsy.
