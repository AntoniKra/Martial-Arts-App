# Spike: niewysłany zapis Firestore po zamknięciu — issue #22

Eksperyment jest odseparowany od aplikacji. Nie zmienia wyboru backendu w ADR 0001, kodu `src/`, modelu domenowego ani istniejących jobów CI. Strona jest budowana osobnym poleceniem i nie trafia do produkcyjnego buildu aplikacji.

## Środowisko i ograniczenia

- Wyłącznie projekt demonstracyjny `demo-combat-training`, Firestore Emulator pod `127.0.0.1:8080` i syntetyczne dokumenty `workouts` z losowym ID.
- Bez projektu w chmurze, Google Auth, kluczy, kont testowych i plików środowiskowych. Reguły zezwalające na dostęp do `workouts` służą tylko temu emulatorowi.
- Firebase `13.2.0`, firebase-tools `15.34.2`; konkretna wersja Playwright jest zamrożona w głównym `package-lock.json`. Firebase 13 wymaga Node co najmniej 24.12.0, dlatego osobny workflow używa dokładnie Node 24.12.0 (jak lokalna weryfikacja). Emulator uruchamia się z Javą 21.
- Lokalnie 3 listopada 2026 Java nie była dostępna w PATH. Pełna macierz jest uruchamiana w GitHub Actions przez `actions/setup-java`, bez instalowania Javy na komputerze użytkownika.
- WebKit z Playwright na Linuksie nie jest testem Safari na fizycznym iPhonie. Zamknięcie jest kontrolowane, nie symuluje zabicia procesu, awarii systemu, usunięcia danych przeglądarki ani presji na pamięć urządzenia.

## Co dokładnie mierzy test

Każdy test najpierw odczytuje nieistniejący dokument z serwera przy działającej sieci. Następnie ustawia kontekst przeglądarki w tryb offline (`setOffline(true)`), wywołuje `setDoc` **bez oczekiwania na potwierdzenie serwera** i wymaga lokalnego `hasPendingWrites: true` oraz pełnej zgodności danych. REST emulatora musi w tym momencie zwracać 404.

- **A — zamknięcie karty:** nowa karta w tym samym kontekście, nadal offline. Wymagany lokalny dokument z oczekującym zapisem. Po przywróceniu sieci REST emulatora musi zwrócić 200 i wszystkie zapisane pola.
- **B — zamknięcie przeglądarki:** `launchPersistentContext` z odrębnym katalogiem w systemowym folderze tymczasowym. Zamknięcie tego kontekstu zamyka całą przeglądarkę. Nowy proces korzysta z tego samego katalogu i od początku jest offline; pozostałe asercje jak w A. Profil nie jest eksportowany do JSON ani odtwarzany przez `storageState`.
- **C — kontrola w RAM:** `initializeFirestore(app, {})`, bez `persistentLocalCache`. Po zamknięciu karty dokument ma zniknąć z lokalnej pamięci; po powrocie sieci odczyt serwerowy potwierdza brak dokumentu, a niezależny REST nadal zwraca 404. **PASS kontroli oznacza oczekiwaną porażkę trwałości scenariusza A.**

W A/B używane są `persistentLocalCache` i `persistentMultipleTabManager`. Test nie wywołuje `waitForPendingWrites`, `terminate`, `disableNetwork` ani nie opróżnia kolejki przed zamknięciem.

### Dostarczenie strony bez sieci

Test wczytuje osobno zbudowany HTML i JavaScript z dysku i dostarcza je przez `context.route` pod stałym origin `http://127.0.0.1:4175`. Dzięki temu można uruchomić stronę także po restarcie przeglądarki przy wyłączonej sieci, bez dołączania service workera do eksperymentu. Przechwytywane są tylko pliki strony; ruch Firestore do emulatora nie jest zastępowany odpowiedziami. Pozostałe originy są odrzucane. Ten mechanizm nie dowodzi dostępności samej aplikacji PWA offline — mierzy wyłącznie trwałość kolejki Firestore.

## Uruchamianie i artefakty

Polecenia npm są zdefiniowane w `combat-training-app/package.json`:

- `spike:firestore:typecheck` — sprawdzenie typów strony, testów i konfiguracji eksperymentu;
- `spike:firestore:build` — osobny build do `spikes/firestore-offline/dist/`;
- `spike:firestore:test` — emulator demonstracyjny i sześć prób Playwright, bez ponowień i bez ukrywania niepowodzeń.

Osobny workflow `.github/workflows/firestore-offline.yml` obsługuje `workflow_dispatch`, PR ze zmianami eksperymentu oraz takie zmiany na `main`. Dotychczasowy `.github/workflows/ci.yml` pozostaje bez zmian. Zmiany zależności i samego workflow także wyzwalają eksperyment.

Raport Playwright: `playwright-report/firestore-offline/`. Wyniki maszynowe i tabela: `test-results/firestore-offline/results.json` oraz `summary.md`. Każda próba dołącza `observations.json` z kolejnymi etapami, pełnymi odpowiedziami REST, komunikatami konsoli, wersją Firebase, przeglądarki i Node; zrzuty pokazują stan przed zamknięciem, po ponownym otwarciu i po powrocie sieci, o ile test dotarł do tych etapów. Wersje Playwright, firebase-tools i Javy są również w logach CI. Artefakty CI są przechowywane przez 14 dni; trwałe podsumowanie wyników należy czytać w opisie PR i w `RESULTS.md`.

## Źródła metody

- [Firebase: konfiguracja trwałej pamięci i wielu kart](https://firebase.google.com/docs/firestore/manage-data/enable-offline).
- [Firebase: projekt demo, połączenie z emulatorem i niezależny REST](https://firebase.google.com/docs/emulator-suite/connect_firestore).
- [Playwright: trwały profil i zamknięcie całej przeglądarki](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context).
