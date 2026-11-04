# Combat Training App

Progresywna aplikacja internetowa (PWA) do ewidencji i analizy treningów sportów walki: boks, kickboxing, Muay Thai, K-1 i MMA w stójce. Aplikacja powstaje w ramach pracy inżynierskiej. Temat i wymagania opisuje `docs/thesis-card.md`.

Stos: React, TypeScript, Vite, Tailwind CSS, docelowo Firebase (Authentication, Firestore, Hosting).

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

## Testy przeglądarkowe (E2E)

Z katalogu `combat-training-app/`, w PowerShell:

```powershell
& {
  npm ci
  npx playwright install --with-deps chromium
  npm run test:e2e
}
```

Playwright sam buduje aplikację i uruchamia `vite preview` pod adresem
`http://127.0.0.1:4173` (port musi być wolny). Nie wymaga osobnego serwera deweloperskiego.
Uruchamia Chromium w trzech rozmiarach: telefon 360×800, tablet 768×1024 i komputer 1440×900.
Każdy test ma osobny kontekst i pusty localStorage. Service worker działa tylko w teście offline.
Wspólne wejście do aplikacji i tworzenie planu znajdują się w `e2e/fixtures.ts`.

Testy obejmują kreator, edycję i usuwanie planu z zachowaniem historii, odtwarzacz
z kontrolowanym zegarem, zapamiętywanie motywu i uruchomienie `/workouts` offline.
axe sprawdza stronę startową, listę treningów, kreator i uruchomiony odtwarzacz
w obu motywach. Naruszenia `critical` blokują test; pozostałe są wypisywane w konsoli
i dołączane jako JSON do raportu wraz ze zrzutem każdego badanego ekranu.
Automatyczne skany nie zastępują ręcznej oceny dostępności.

Raport HTML: `npx playwright show-report`. Wyniki JSON są w `test-results/e2e-results.json`.
CI uruchamia osobny job `e2e`; przy niepowodzeniu udostępnia raport HTML, wyniki i ślady
jako artefakt `playwright-report` przechowywany przez 14 dni. Testy nie są automatycznie ponawiane.

## Zasady pracy

- Zasady dla agentów i ludzi: `../AGENTS.md`.
- Dokumentacja produktu i decyzje: `docs/` (zacznij od `docs/START-HERE.md`).
- Kod, nazwy i baza danych są po angielsku, interfejs po polsku.
