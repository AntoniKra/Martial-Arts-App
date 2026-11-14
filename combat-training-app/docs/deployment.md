# Wdrożenie na Firebase Hosting

Aplikacja działa pod adresem `https://combat-training-830fb.web.app`. Po zielonym CI na `main` wgrywa ją GitHub Actions. Wdrożenie z komputera właściciela zostaje jako droga awaryjna. Decyzja: `adr/0010-automatic-hosting-deploy.md`.

Workflow `CI` równolegle sprawdza typy, lint, testy jednostkowe i build w jobie `Typecheck, lint, test, build`, reguły Firestore w jobie `Firestore rules` oraz E2E na trzech maszynach w jobach `Playwright E2E (phone/tablet/desktop)`, po jednym rozmiarze ekranu na maszynę. Raporty E2E i zrzuty błędów są w artefaktach przebiegu Actions `playwright-report-phone`, `playwright-report-tablet` i `playwright-report-desktop` przez 14 dni; wdrożenie po scaleniu wymaga sukcesu wszystkich jobów CI.

## Automatyczne wdrożenie po scaleniu

Po udanym workflow `CI` na `main` (zdarzenie `push`) workflow `Hosting live deploy` wdraża hosting z tego commita na kanał `live`, ale tylko gdy commit jest nadal czubkiem `main`. Ponowne uruchomienie starszego CI nie wgrywa hostingu i nie cofa strony. Wdrożenia idą po kolei i nie przerywają trwającego. Najpierw buduje aplikację raz (`npm ci` i `npm run build:deploy`), potem wgrywa gotowy katalog `dist`. Żeby CLI nie zbudowało aplikacji drugi raz, job usuwa `predeploy` tylko w swojej kopii `firebase.json`. Plik w repozytorium się nie zmienia. Reguł Firestore ten workflow nie wdraża.

Ręczne uruchomienie: Actions → `Hosting live deploy` → Run workflow. Wdraża bieżący `main`, pomija porównanie reguł i zapisuje nowy znacznik opisany niżej. Służy do powtórzenia wdrożenia po ręcznym wgraniu reguł albo gdy automatyczne wdrożenie zostało pominięte.

## Najpierw reguły

Automat nie wdraża reguł. Zanim wgra hosting, szuka znacznika `firestore-rules-acknowledged`: ostatniego commita, którego reguły właściciel uznał za wdrożone. To zapis w GitHubie, nie wgranie pliku reguł. Zapis używa `deployments: write`.

Pierwsze uruchomienie nie ma tego znacznika. Poprzednie udane CI i pierwszy rodzic commita nie są potwierdzeniem, więc automatyczny hosting jest zablokowany. W podsumowaniu joba jest instrukcja: wdróż reguły ręcznie (`npx firebase deploy --only firestore:rules -P prod`), potem uruchom `Hosting live deploy` przez Run workflow. To ręczne uruchomienie pomija porównanie, wgrywa hosting z bieżącego `main` i dopiero wtedy zapisuje znacznik. Do tego momentu zablokowany jest też commit, który pliku reguł już nie zmienia.

Gdy znacznik jest, a `combat-training-app/firestore.rules` różni się od tamtego commita, hosting też jest pomijany. Blokada zostaje przy starym znaczniku, więc obejmuje kolejne commity, które samego pliku nie ruszają. Ostrzeżenie każe najpierw wgrać reguły ręcznie i uruchomić workflow ponownie. Znacznik przesuwa się dopiero po tym udanym wdrożeniu hostingu.

## Podgląd pull requesta

PR z tego repozytorium uruchamia `Hosting preview build`. Ten workflow nie dostaje sekretów i ma tylko `contents: read`, tak jak CI. To wystarcza, żeby zapisać artefakt. Buduje aplikację i na 3 dni zapisuje dwa artefakty: `hosting-preview-dist` (gotowy `dist`) oraz `hosting-preview-pr` (numer PR, zapisany w osobnym jobie po budowaniu).

Po udanym budowaniu `Hosting preview deploy` (musi być już na `main`) robi checkout tylko domyślnej gałęzi. Numer PR z artefaktu musi być liczbą i musi należeć do metadanych tego przebiegu: do pull requestów zapisanych przy runie, a gdy GitHub zostawi tę listę pustą — do pull requestów commita `head_sha`. Dodatkowo HEAD pull requesta musi być nadal tym commitem. Niezgodność albo starszy build zatrzymuje workflow przed wgraniem i przed komentarzem. Wgrania jednego PR idą po kolei i nie przerywają trwającego. Potem workflow pobiera `dist` i wgrywa same pliki statyczne na kanał `pr-<numer>`. Kanał wygasa po 7 dniach. Job nie uruchamia `npm ci`, `build:deploy` ani niczego z artefaktu. Akcja Firebase wywołuje u siebie `npx firebase-tools`, żeby wysłać pliki. Hook `predeploy` jest usuwany tylko w kopii roboczej joba (`jq 'del(.hosting.predeploy)'`), więc podgląd nie buduje kodu z `main`. Ręczne `npx firebase deploy --only hosting -P prod` nadal samo buduje aplikację.

Link jest w jednym komentarzu pod PR i jest aktualizowany przy kolejnym wgraniu, a nie dopisywany od nowa. Podgląd używa prawdziwego projektu Firebase i prawdziwych danych konta: testując PR z błędem, można zepsuć własne dane.

W PR, który dodaje te workflow, uruchamia się tylko budowanie. Wgranie podglądu i wdrożenie po scaleniu zaczną działać od następnego PR po scaleniu.

## Zmienne repozytorium

`npm run build:deploy` potrzebuje czterech zmiennych publicznych. To nie są sekrety: wartości i tak trafiają do przeglądarki, ale nie trzymamy ich w kodzie. Ustaw je w GitHubie: Settings → Secrets and variables → Actions → zakładka Variables. Wartości weź z lokalnego `.env`. Nie dodawaj zmiennych emulatora (`VITE_FIREBASE_AUTH_EMULATOR_HOST`, `VITE_FIREBASE_FIRESTORE_EMULATOR_HOST`).

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Gdy którejś brakuje, budowanie kończy się błędem z nazwą zmiennej i nic nie jest wgrywane.

`VITE_FIREBASE_AUTH_DOMAIN` ma wartość `combat-training-830fb.web.app` (domena aplikacji), nie `combat-training-830fb.firebaseapp.com`. Opis niżej, w części o logowaniu Google.

## Logowanie Google

Na telefonie i w zainstalowanej PWA aplikacja loguje przez przekierowanie, na komputerze z myszą przez okno. Przekierowanie wraca na stronę logowania, aplikacja odbiera wynik i wpuszcza użytkownika. Konto Google ma potwierdzony e-mail, więc nie widzi ekranu weryfikacji. Decyzja: dopisek w `adr/0002-email-password-and-google-auth.md`.

Safari i nowsze Chrome blokują dane stron trzecich. Gdyby `authDomain` wskazywał `…firebaseapp.com`, a aplikacja działała na `…web.app`, przekierowanie by się nie udało. Dlatego `authDomain` to domena aplikacji (zalecenie Firebase „Best practices for using signInWithRedirect on browsers that block third-party storage”, opcja 1). Hosting sam serwuje zastrzeżoną ścieżkę `/__/auth/handler`, a service worker jej nie podmienia (`navigateFallbackDenylist` w `vite.config.ts`).

Jednorazowa konfiguracja (właściciel, po scaleniu PR z logowaniem Google, w tej kolejności):

1. Poczekaj na automatyczne wdrożenie po scaleniu. Nowy service worker musi przepuszczać `/__/`, zanim zmieni się `authDomain`.
2. Google Cloud Console, projekt `combat-training-830fb` → APIs & Services → Credentials → klient OAuth 2.0 „Web client (auto created by Google Service)”:
   - Authorized JavaScript origins: dodaj `https://combat-training-830fb.web.app`;
   - Authorized redirect URIs: dodaj `https://combat-training-830fb.web.app/__/auth/handler`.
   Starych wpisów z `firebaseapp.com` nie usuwaj.
3. Konsola Firebase → Authentication → Settings → Authorized domains: sprawdź, że jest `combat-training-830fb.web.app` (dodawana domyślnie).
4. Lokalny `.env`: `VITE_FIREBASE_AUTH_DOMAIN=combat-training-830fb.web.app`.
5. GitHub → Settings → Secrets and variables → Actions → Variables: ta sama wartość `VITE_FIREBASE_AUTH_DOMAIN`.
6. Actions → `Hosting live deploy` → Run workflow, żeby zbudować aplikację z nowym `authDomain`.
7. Na każdym urządzeniu przyjmij aktualizację z banera „Nowa wersja” (albo zamknij aplikację całkiem i otwórz ponownie). Aplikacja aktualizuje się na żądanie (ADR 0003), więc do tego czasu działa stara wersja ze starym `authDomain` i starym service workerem, który podmienia `/__/auth/handler` na stronę aplikacji; logowanie Google by się nie udało.
8. Sprawdź na telefonie (Safari i Chrome, w przeglądarce i w zainstalowanej PWA) oraz na komputerze: rejestracja kontem Google, wylogowanie, ponowne logowanie.

Ten sam adres e-mail zarejestrowany wcześniej hasłem: aplikacja nie łączy kont. Gdy Google potwierdza adres (Gmail, Google Workspace), Firebase sam loguje do istniejącego konta: ten sam `uid`, dane zostają, a Google zostaje dopięty jako druga metoda. Jeśli tamto konto miało niepotwierdzony e-mail, Firebase usuwa jego hasło, bo właścicielem adresu jest konto Google. Gdy Firebase odmawia (`auth/account-exists-with-different-credential`), aplikacja prosi o logowanie hasłem.

Podgląd PR: logowanie Google nie działa na kanałach `combat-training-830fb--pr-…web.app`, bo tych domen nie ma w Authorized domains, a ich nazwy zmieniają się z każdym kanałem. Nawet po ich dodaniu `authDomain` wskazuje domenę produkcyjną, inną niż domena podglądu, więc przekierowanie w Safari i nowszym Chrome i tak trafi na blokadę danych stron trzecich. Logowanie Google testujemy na emulatorze (`npm run test:e2e`, plik `e2e/googleSignIn.spec.ts`) i po wdrożeniu na produkcję. Logowanie hasłem w podglądzie działa jak dotąd.

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

Plik `firestore.rules` dopuszcza cztery kolekcje pod `users/{uid}`: `workoutPlans` (plany), `workoutSessions` (sesje), `focusSkills` (ćwiczenia celu) i `weekPlans` (plany tygodnia), wyłącznie dla właściciela z potwierdzonym e-mailem. Dokument profilu `users/{uid}` i pozostałe kolekcje są zabronione do czasu wdrożenia ich funkcji. Reguły sprawdzają dokument płytko; elementy list sprawdzają schematy `zod/mini` w aplikacji (`database-model.md`).

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
| `/`, `/index.html`, trasy aplikacji, `/sw.js`, `/manifest.webmanifest`, `/theme-bootstrap.js` | `no-cache` | Nowa wersja ma być widoczna od razu, a service worker pyta o aktualizację. |
| `/assets/**`, `/workbox-*.js` | `max-age=31536000, immutable` | Nazwy plików zawierają skrót treści, więc się nie zmieniają. |

Wszystkie odpowiedzi mają `X-Content-Type-Options: nosniff` i `Referrer-Policy: strict-origin-when-cross-origin`. Odpowiedzi aplikacji mają też wymuszający nagłówek `Content-Security-Policy` z `firebase.json` (ADR 0014):

```text
default-src 'self'; script-src 'self' https://apis.google.com; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; frame-src 'self'; img-src 'self' data: https://www.google.com/images/cleardot.gif; font-src 'self'; style-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'
```

- `default-src 'self'` ogranicza pozostałe zasoby do domeny aplikacji.
- `script-src` pozwala na własne skrypty i `apis.google.com/js/api.js`, ładowany przez Firebase Auth przy logowaniu Google. Nie dopuszcza skryptów wbudowanych w HTML ani `eval`.
- `connect-src` dopuszcza własną domenę oraz Firestore, operacje Authentication (`identitytoolkit`) i odświeżanie tokenów (`securetoken`). Źródła sprawdzono w zainstalowanym SDK: `@firebase/auth` (konfiguracja hostów, `getIframeUrl`, `_loadGapi`) i `@firebase/firestore` (domyślny host i transport HTTP). Aplikacja nie używa telefonu/reCAPTCHA, App Check ani Analytics; ich domen nie dodajemy na zapas.
- `frame-src 'self'` pozwala na `/__/auth/iframe`, bo produkcyjny `authDomain` to domena aplikacji. Strona dostawcy Google otwiera się w osobnym oknie albo przez przekierowanie, a nie w ramce aplikacji.
- `img-src 'self' data:` dopuszcza własne obrazy i dane obrazu w adresie oraz dokładną ścieżkę `https://www.google.com/images/cleardot.gif` (parametry zapytania mogą się zmieniać). Transport Firestore (`@firebase/webchannel-wrapper`, funkcja `R`) używa tego obrazka diagnostycznego po błędzie połączenia, także offline; E2E potwierdził próbę jego pobrania. Nie dopuszczamy pozostałych obrazów Google; `font-src 'self'` i `style-src 'self'` ograniczają fonty i arkusze do aplikacji. Build zapisuje CSS w pliku, nie wstrzykuje `<style>`. Ustawianie pojedynczych właściwości stylu przez React nie wymaga `'unsafe-inline'`.
- `worker-src 'self'` i `manifest-src 'self'` dopuszczają własnego service workera i manifest PWA.
- `object-src 'none'` blokuje osadzone obiekty; `base-uri 'self'` blokuje obcy adres bazowy; `form-action 'self'` ogranicza wysyłanie formularzy; `frame-ancestors 'self'` chroni przed osadzaniem aplikacji na obcej stronie.

Dotychczasowy wzorzec `source: "**"` pasuje także do `/__/auth/handler` i `/__/auth/iframe` (sprawdzone matcherem używanym przez emulator Hosting w `superstatic`). Dlatego CSP ma oddzielny wzorzec `!/__/**`, wyłączający zastrzeżone ścieżki Firebase. Strony obsługi logowania są zarządzane przez Firebase i mogą potrzebować własnych skryptów oraz stylów; polityka aplikacji nie powinna ich ograniczać. Pozostałe nagłówki pozostają bez zmian. Sprawdzenie lokalne nie zastępuje kontroli odpowiedzi zarządzanych przez produkcyjny Hosting po wdrożeniu.

Skrypt `/theme-bootstrap.js` wykonuje się synchronicznie w `<head>`, przed uruchomieniem React, bez `async` i `defer`. Odczytuje motyw przed pierwszym wyświetleniem i jest precache'owany do pracy offline. Ma `no-cache`, ponieważ jego nazwa nie zawiera skrótu treści.

`vite preview` czyta tę samą politykę z `firebase.json` przez `config/contentSecurityPolicy.ts`. Dodaje wyłącznie połączenia HTTP do emulatorów `127.0.0.1:8080` i `127.0.0.1:9099` oraz ramkę Auth na `127.0.0.1:9099`; produkcyjny nagłówek pozostaje bez adresów lokalnych. Test jednostkowy pilnuje tej różnicy oraz braku `'unsafe-inline'` i `'unsafe-eval'`. E2E zbiera `securitypolicyviolation` i komunikaty konsoli przy starcie, logowaniu hasłem, zapisie sesji i nawigacji offline przez service workera; sprawdza też nagłówek odpowiedzi sieciowej i odpowiedzi z cache.

Reguły sprawdzono w emulatorze Hosting. Po pierwszym wdrożeniu sprawdź produkcję:

```bash
curl -sI https://combat-training-830fb.web.app/workouts
curl -sI https://combat-training-830fb.web.app/sw.js
```

Obie odpowiedzi powinny mieć `cache-control: no-cache`.

Kontrola CSP przez właściciela:

1. Na podglądzie PR: zaloguj się e-mailem, zapisz trening i sprawdź konsolę przeglądarki na komputerze — bez błędów CSP. Uwaga: workflow podglądu pobiera `firebase.json` z `main`, a z PR tylko `dist`. Dlatego podgląd PR wprowadzającego CSP nie dostanie jeszcze nowego nagłówka; pełną politykę przed scaleniem sprawdza lokalny E2E na `vite preview`. Nie zmieniamy mechanizmu wdrażania w tym zadaniu.
2. Po scaleniu i wdrożeniu: sprawdź logowanie Google na komputerze i iPhonie. W odpowiedzi dokumentu w zakładce Network sprawdź wymuszający `Content-Security-Policy`. Sprawdź też odpowiedzi `/__/auth/handler` i `/__/auth/iframe`: nie powinny otrzymywać CSP aplikacji.
3. Jeśli logowanie nie działa: Firebase Console → Hosting → poprzednia wersja → „Rollback”, potem komentarz w PR.

## Test na telefonie po wdrożeniu

- [ ] Instalacja PWA: Android (Chrome) i iPhone (Safari → Udostępnij → Do ekranu początkowego).
- [ ] Gong przy przejściu rundy, z wyciszonym i niewyciszonym telefonem.
- [ ] Ekran nie gaśnie podczas treningu (Wake Lock).
- [ ] Trening jest poprawny po wygaszeniu i ponownym włączeniu ekranu.
- [ ] Aplikacja otwiera się w trybie samolotowym po pierwszej wizycie.
- [ ] Rejestracja, e-mail weryfikacyjny, logowanie, reset hasła, wylogowanie.
- [ ] Logowanie Google przez przekierowanie: Safari i Chrome, w przeglądarce i w zainstalowanej PWA.

## Eksport i usunięcie konta: dodatkowy test na telefonie

- [ ] iPhone (Safari i PWA): pobranie JSON i CSV, poprawna nazwa pliku, odczyt CSV w polskim Excelu. W PWA zapis może użyć arkusza udostępniania pliku, gdy system wspiera `navigator.canShare({ files })`.
- [ ] iPhone (Safari i PWA): potwierdzenie kontem Google przez przekierowanie wraca do ekranu z przyciskiem końcowym, bez automatycznego usuwania; anulowanie i wybór innego konta nie usuwają danych.
- [ ] Usunięcie własnego konta testowego wymaga osobnego przycisku końcowego; sprawdź powrót na logowanie i komunikat sukcesu. Przed testem połącz i wyloguj inne urządzenia.
- [ ] Właściciel w konsoli Firebase sprawdza po usunięciu (ponownie po upływie godziny), czy pod `users/{uid}` nie pojawiły się nowe dokumenty, również w podkolekcjach bez dokumentu rodzica. Zaległy zapis z innego urządzenia może przejść na nadal ważnym tokenie. Ewentualne pozostałości usuwa ręcznie właściciel; blokada w regułach jest pracą przyszłą (ADR 0013).
