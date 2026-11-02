# Combat Training App

Progresywna aplikacja internetowa (PWA) do ewidencji i analizy treningów sportów walki: boks, kickboxing, Muay Thai, K-1 i MMA w stójce. Aplikacja powstaje w ramach pracy inżynierskiej. Temat i wymagania opisuje `docs/thesis-card.md`.

Stos: React, TypeScript, Vite, Tailwind CSS, docelowo Supabase.

## Uruchomienie

Wymagany Node.js 22 i npm.

```bash
npm ci
npm run dev
```

## Sprawdzanie jakości

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # testy jednostkowe (Vitest)
npm run build       # build produkcyjny
```

Te same kroki uruchamia CI przy każdym pull requeście.

## Zasady pracy

- Zasady dla agentów i ludzi: `../AGENTS.md`.
- Dokumentacja produktu i decyzje: `docs/` (zacznij od `docs/START-HERE.md`).
- Kod, nazwy i baza danych są po angielsku, interfejs po polsku.
