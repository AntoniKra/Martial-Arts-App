# Combat Training App

Progresywna aplikacja internetowa (PWA) do ewidencji i analizy treningów sportów walki: boks, kickboxing, Muay Thai, K-1 i MMA w stójce. Aplikacja powstaje w ramach pracy inżynierskiej. Temat i wymagania opisuje `docs/thesis-card.md`.

Stos: React, TypeScript, Vite, Tailwind CSS, docelowo Firebase (Authentication, Firestore, Hosting).

## Uruchomienie

Wymagany Node.js 24.12.0 lub nowszy i npm (także pakiety Firebase wymagają tej wersji).

Przed uruchomieniem ustaw konfigurację według `.env.example`. Brak konfiguracji
wyświetla polski komunikat zamiast pustej strony. Właściciel sam podłącza prawdziwy
projekt i włącza dostawcę Email/Password; agent i testy nie korzystają z tego projektu.
Lokalne testy używają wyłącznie emulatora Authentication.

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

`test:e2e` uruchamia `firebase emulators:exec --only auth --project demo-combat-training`.
W CI przed testami instalowana jest Java 21, tak jak w eksperymencie Firestore.
Sam emulator Authentication może działać bez Javy; emulatory Firestore jej wymagają.
Porty emulatora (9099 i 4400) muszą być wolne. Nie trzeba logować się do Firebase CLI.

Playwright sam buduje aplikację z jawną konfiguracją demo i uruchamia `vite preview` pod adresem
`http://127.0.0.1:4173` (port musi być wolny). Nie wymaga osobnego serwera deweloperskiego.
Uruchamia Chromium w trzech rozmiarach: telefon 360×800, tablet 768×1024 i komputer 1440×900.
Każdy test ma osobny kontekst, pusty localStorage i własny adres testowy. Service worker
działa tylko w teście offline. `WorkoutApp.open()` tworzy konto przez REST emulatora,
oznacza adres jako potwierdzony i loguje przez interfejs aplikacji.

Testy obejmują kreator, edycję i usuwanie planu z zachowaniem historii, odtwarzacz
z kontrolowanym zegarem, zapamiętywanie motywu i uruchomienie `/workouts` offline.
Nowe scenariusze obejmują rejestrację i lokalny link weryfikacyjny, blokadę ponownej wysyłki
przez 60 s, błędny login, powrót na chronioną stronę, reset hasła, wylogowanie oraz utratę
sesji w drugiej karcie podczas treningu. axe sprawdza także cztery ekrany logowania.
W obu motywach naruszenia `moderate`, `serious` i `critical` blokują test.
Do raportu trafiają wyniki axe i zrzuty ekranów.
Automatyczne skany nie zastępują ręcznej oceny dostępności.

Raport HTML: `npx playwright show-report`. Wyniki JSON są w `test-results/e2e-results.json`.
CI uruchamia osobny job `e2e`; zawsze udostępnia raport HTML, wyniki, zrzuty i ślady błędów
jako artefakt `playwright-report` przechowywany przez 14 dni. Testy nie są automatycznie ponawiane.

## Ograniczenie danych lokalnych

Logowanie chroni wejście do aplikacji, ale plany i historia nadal są w localStorage,
bez powiązania z kontem. Konta używane w tej samej przeglądarce widzą te same dane.
Wylogowanie ich nie usuwa. Firestore i logowanie Google są osobnymi zadaniami.

## Zasady pracy

- Zasady dla agentów i ludzi: `../AGENTS.md`.
- Dokumentacja produktu i decyzje: `docs/` (zacznij od `docs/START-HERE.md`).
- Kod, nazwy i baza danych są po angielsku, interfejs po polsku.
