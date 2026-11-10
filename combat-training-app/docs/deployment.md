# Wdrożenie na Firebase Hosting

Aplikacja działa pod adresem `https://combat-training-830fb.web.app`. Po zielonym CI na `main` wgrywa ją GitHub Actions. Wdrożenie z komputera właściciela zostaje jako droga awaryjna. Decyzja: `adr/0010-automatic-hosting-deploy.md`.

## Automatyczne wdrożenie po scaleniu

Po udanym workflow `CI` na `main` (zdarzenie `push`) workflow `Hosting live deploy` wdraża hosting z commita, który właśnie przeszedł CI, na kanał `live`. Najpierw buduje aplikację raz (`npm ci` i `npm run build:deploy`), potem wgrywa gotowy katalog `dist`. Żeby CLI nie zbudowało aplikacji drugi raz, job usuwa `predeploy` tylko w swojej kopii `firebase.json`. Plik w repozytorium się nie zmienia. Reguł Firestore ten workflow nie wdraża.

Ręczne uruchomienie: Actions → `Hosting live deploy` → Run workflow. Wdraża bieżący `main` i nie sprawdza, czy commit zmienia reguły. Służy do powtórzenia wdrożenia po ręcznym wgraniu reguł albo gdy automatyczne wdrożenie zostało pominięte.

## Najpierw reguły

Gdy commit wdrażany po CI zmienia `combat-training-app/firestore.rules` względem pierwszego rodzica, workflow nie wdraża hostingu. W podsumowaniu joba jest ostrzeżenie: najpierw ręcznie `npx firebase deploy --only firestore:rules -P prod`, potem Run workflow. Ręczne uruchomienie tego sprawdzenia nie wykonuje.

## Podgląd pull requesta

PR z tego repozytorium uruchamia `Hosting preview build`. Ten workflow nie dostaje sekretów. Buduje aplikację i na 3 dni zapisuje dwa artefakty: `hosting-preview-dist` (gotowy `dist`) oraz `hosting-preview-pr` (numer PR, zapisany w osobnym jobie po budowaniu).

Uprawnienia budowania to `contents: read` i `actions: write`. Sam odczyt zawartości nie pozwala zapisać artefaktu.

Po udanym budowaniu `Hosting preview deploy` (musi być już na `main`) robi checkout tylko domyślnej gałęzi, pobiera artefakty i wgrywa same pliki statyczne na kanał `pr-<numer>`. Kanał wygasa po 7 dniach. Job nie uruchamia `npm ci`, `build:deploy` ani niczego z artefaktu. Akcja Firebase wywołuje u siebie `npx firebase-tools`, żeby wysłać pliki. Hook `predeploy` jest usuwany tylko w kopii roboczej joba (`jq 'del(.hosting.predeploy)'`), więc podgląd nie buduje kodu z `main`. Ręczne `npx firebase deploy --only hosting -P prod` nadal samo buduje aplikację.

Link jest w jednym komentarzu pod PR i jest aktualizowany przy kolejnym wgraniu, a nie dopisywany od nowa. Podgląd używa prawdziwego projektu Firebase i prawdziwych danych konta: testując PR z błędem, można zepsuć własne dane.

W PR, który dodaje te workflow, uruchamia się tylko budowanie. Wgranie podglądu i wdrożenie po scaleniu zaczną działać od następnego PR po scaleniu.

## Zmienne repozytorium

`npm run build:deploy` potrzebuje czterech zmiennych publicznych. To nie są sekrety: wartości i tak trafiają do przeglądarki, ale nie trzymamy ich w kodzie. Ustaw je w GitHubie: Settings → Secrets and variables → Actions → zakładka Variables. Wartości weź z lokalnego `.env`. Nie dodawaj zmiennych emulatora (`VITE_FIREBASE_AUTH_EMULATOR_HOST`, `VITE_FIREBASE_FIRESTORE_EMULATOR_HOST`).

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Gdy którejś brakuje, budowanie kończy się błędem z nazwą zmiennej i nic nie jest wgrywane.

## Zabezpieczenia

- **`.firebaserc` nie ma domyślnego projektu.** Prawdziwy projekt ma tylko alias `prod`, więc polecenie bez `-P prod` nie trafi do produkcji. Testy i emulatory zawsze podają `--project demo-combat-training`.
- **Firebase przed wysłaniem uruchamia `npm run build:deploy`.** Ten build przerywa się z błędem, gdy:
  - w `.env` brakuje którejś z czterech wartości;
  - ustawiony jest emulator;
  - projekt jest inny niż `combat-training-830fb`.

  Dzięki temu nie da się opublikować ekranu z błędem konfiguracji. Dotyczy to wdrożenia ręcznego. Automatyczne joby budują raz samymi krokami workflow i na czas wgrywania wyłączają `predeploy` w kopii roboczej.

## Wdrożenie ręczne

Zostaje, gdy automat nie zadziała albo trzeba wdrożyć hosting bez czekania na CI. W folderze `combat-training-app/`:

1. Uzupełnij `.env` wartościami z konsoli Firebase (Ustawienia projektu → Twoje aplikacje → Konfiguracja). Pole `VITE_FIREBASE_AUTH_EMULATOR_HOST` zostaw puste.
2. Zaloguj się raz do Firebase CLI: `npx firebase login`. Logujesz się sam, w przeglądarce.
3. Wdróż: `npx firebase deploy --only hosting -P prod`.
4. Otwórz `https://combat-training-830fb.web.app` i zarejestruj konto testowe.

Gdy automat nie działa, po `git pull` na `main` powtórz krok 3.

## Reguły Firestore

Plik `firestore.rules` dopuszcza tylko plany i sesje pod `users/{uid}`, wyłącznie dla właściciela z potwierdzonym e-mailem. Pozostałe kolekcje są zabronione do czasu wdrożenia ich funkcji. Reguły sprawdzają dokument płytko; elementy list sprawdzają schematy `zod/mini` w aplikacji (`database-model.md`).

Przed wdrożeniem uruchom `npm run test:rules` (Node.js 24.12.0 lub nowszy i Java 21). Skrypt startuje wyłącznie emulator Firestore na `127.0.0.1:8080`, z projektem `demo-combat-training`, uruchamia osobny zestaw testów i zatrzymuje emulator. Nie korzysta z produkcji ani z kont Firebase. `npm test` nadal uruchamia tylko testy aplikacji, bez Javy. CI wykonuje oba zestawy.

Reguły na produkcję wdraża ręcznie właściciel, osobno od Hostingu, po sprawdzeniu wyników testów i scaleniu PR. Polecenie zapisane poniżej nie jest częścią testów, CI ani automatycznego wdrożenia hostingu:

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
