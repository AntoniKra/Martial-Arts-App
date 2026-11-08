# Wdrożenie na Firebase Hosting

Aplikacja działa pod adresem `https://combat-training-830fb.web.app`. Wdraża ją ręcznie właściciel ze swojego komputera. Automatyczne wdrażanie przez GitHub Actions to osobna decyzja, jeszcze niepodjęta.

## Zabezpieczenia

- **`.firebaserc` nie ma domyślnego projektu.** Prawdziwy projekt ma tylko alias `prod`, więc polecenie bez `-P prod` nie trafi do produkcji. Testy i emulatory zawsze podają `--project demo-combat-training`.
- **Firebase przed wysłaniem uruchamia `npm run build:deploy`.** Ten build przerywa się z błędem, gdy:
  - w `.env` brakuje którejś z czterech wartości;
  - ustawiony jest emulator;
  - projekt jest inny niż `combat-training-830fb`.

  Dzięki temu nie da się opublikować ekranu z błędem konfiguracji.

## Pierwsze wdrożenie

W folderze `combat-training-app/`:

1. Uzupełnij `.env` wartościami z konsoli Firebase (Ustawienia projektu → Twoje aplikacje → Konfiguracja). Pole `VITE_FIREBASE_AUTH_EMULATOR_HOST` zostaw puste.
2. Zaloguj się raz do Firebase CLI: `npx firebase login`. Logujesz się sam, w przeglądarce.
3. Wdróż: `npx firebase deploy --only hosting -P prod`.
4. Otwórz `https://combat-training-830fb.web.app` i zarejestruj konto testowe.

Kolejne wdrożenia to tylko krok 3, po scaleniu zmian do `main` i `git pull`.

## Reguły Firestore

Plik `firestore.rules` dopuszcza tylko plany i sesje pod `users/{uid}`, wyłącznie dla właściciela z potwierdzonym e-mailem. Pozostałe kolekcje są zabronione do czasu wdrożenia ich funkcji. Reguły sprawdzają dokument płytko; elementy list sprawdzają schematy `zod/mini` w aplikacji (`database-model.md`).

Przed wdrożeniem uruchom `npm run test:rules` (Node.js 24.12.0 lub nowszy i Java 21). Skrypt startuje wyłącznie emulator Firestore na `127.0.0.1:8080`, z projektem `demo-combat-training`, uruchamia osobny zestaw testów i zatrzymuje emulator. Nie korzysta z produkcji ani z kont Firebase. `npm test` nadal uruchamia tylko testy aplikacji, bez Javy. CI wykonuje oba zestawy.

Reguły na produkcję wdraża ręcznie właściciel, osobno od Hostingu, po sprawdzeniu wyników testów i scaleniu PR. Polecenie zapisane poniżej nie jest częścią testów ani CI:

```powershell
& {
  Set-Location -LiteralPath 'C:\dev\Martial-Arts-App\combat-training-app'
  npx firebase deploy --only firestore:rules -P prod
}
```

## Nagłówki i pamięć podręczna

| Ścieżka | `Cache-Control` | Powód |
| --- | --- | --- |
| `/`, `/index.html`, trasy aplikacji, `/sw.js`, `/manifest.webmanifest` | `no-cache` | Nowa wersja ma być widoczna od razu, a service worker pyta o aktualizację. |
| `/assets/**`, `/workbox-*.js` | `max-age=31536000, immutable` | Nazwy plików zawierają skrót treści, więc się nie zmieniają. |

Wszystkie odpowiedzi mają `X-Content-Type-Options: nosniff` i `Referrer-Policy: strict-origin-when-cross-origin`. Polityka CSP i nagłówki ramek dojdą razem z logowaniem Google, bo przekierowanie logowania korzysta z ramki `/__/auth/`.

Reguły sprawdzono w emulatorze Hosting. Po pierwszym wdrożeniu sprawdź produkcję:

```bash
curl -sI https://combat-training-830fb.web.app/workouts
curl -sI https://combat-training-830fb.web.app/sw.js
```

Obie odpowiedzi powinny mieć `cache-control: no-cache`.

## Test na telefonie po wdrożeniu

- [ ] Instalacja PWA: Android (Chrome) i iPhone (Safari → Udostępnij → Do ekranu początkowego).
- [ ] Gong przy przejściu rundy, z wyciszonym i niewyciszonym telefonem.
- [ ] Ekran nie gaśnie podczas treningu (Wake Lock).
- [ ] Trening jest poprawny po wygaszeniu i ponownym włączeniu ekranu.
- [ ] Aplikacja otwiera się w trybie samolotowym po pierwszej wizycie.
- [ ] Rejestracja, e-mail weryfikacyjny, logowanie, reset hasła, wylogowanie.
