# Combat Training App

Progresywna aplikacja internetowa (PWA) do ewidencji i analizy treningów sportów walki: boks, kickboxing, Muay Thai, K-1 i MMA w stójce. Temat i wymagania pracy inżynierskiej opisuje [karta pracy](docs/thesis-card.md).

Aplikacja korzysta z Reacta, TypeScriptu, Vite i Tailwind CSS. Firebase Authentication obsługuje logowanie e-mailem i hasłem oraz kontem Google. Plany i historia są zapisywane w Cloud Firestore na koncie użytkownika, z pamięcią podręczną w IndexedDB. Aplikacja nie przechowuje planów ani historii w `localStorage`. Tam są m.in. ustawienia urządzenia i migawka aktywnego treningu do wznowienia. Szczegóły opisuje [model danych](docs/database-model.md).

## Uruchomienie

W katalogu `combat-training-app/` użyj Node.js 24.12.0 lub nowszego i npm. Konfigurację do pracy lokalnej opisuje `.env.example`. Przy braku konfiguracji aplikacja wyświetla komunikat.

```bash
npm ci
npm run dev
```

`npm run demo` uruchamia lokalny pokaz na emulatorach Auth i Firestore z fikcyjnymi danymi. `npm run showcase` służy właścicielowi do przygotowania osobnych kont pokazowych w produkcji i wymaga jawnego wybrania celu oraz potwierdzenia zapisu. Oba polecenia opisuje [instrukcja pokazu](docs/demo.md).

## Sprawdzanie jakości

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm test` obejmuje testy jednostkowe aplikacji, danych pokazowych i narzędzi wydajnościowych. Osobny `npm run test:rules` uruchamia testy reguł w emulatorze Firestore. Oba zestawy oraz E2E mają własne kroki w CI.

### Testy przeglądarkowe (E2E)

Po zainstalowaniu zależności uruchom w katalogu aplikacji:

```powershell
& {
  npx playwright install --with-deps chromium
  npm run test:e2e
}
```

Skrypt uruchamia emulatory Auth i Firestore z projektem `demo-combat-training`. Potrzebne są Java 21 i wolne porty 8080 oraz 9099. Playwright buduje wersję z konfiguracją demo, uruchamia `vite preview` na `127.0.0.1:4173` i testuje Chromium na telefonie 360×800, tablecie 768×1024 oraz komputerze 1440×900.

W CI każdy rozmiar ma osobny job i jedno automatyczne ponowienie nieudanego testu. Lokalnie domyślnie nie ma ponowień. Raport HTML można otworzyć przez `npx playwright show-report`. CI przez 14 dni przechowuje raporty i wyniki w artefaktach `playwright-report-phone`, `playwright-report-tablet` i `playwright-report-desktop`.

## Firebase Hosting

- **Live** po udanym CI dla aktualnego `main`. Workflow `Hosting live deploy` wdraża kanał `live`, jeśli reguły Firestore odpowiadają wersji potwierdzonej przez właściciela.
- **Podgląd PR** dla gałęzi z tego repozytorium. `Hosting preview build` buduje artefakt, a `Hosting preview deploy` wgrywa go na kanał `pr-<numer>`. Kanał wygasa po dwóch dniach. Link pojawia się w komentarzu w PR.

Szczegóły, w tym ręczne wdrożenie awaryjne i osobne wdrażanie reguł, opisuje [instrukcja wdrożenia](docs/deployment.md).

## Zrzuty i dokumentacja

- [Katalog zrzutów ekranu](docs/screenshots/README.md), [ekrany konta](docs/screenshots/auth/) i [przykładowe ekrany aplikacji](docs/screenshots/ui-audit-2026-11-07/).
- [Mapa dokumentacji](docs/START-HERE.md), [zakres wersji finalnej](docs/mvp-scope.md) i [zasady pracy](../AGENTS.md).
