# Protokół testów wydajnościowych PWA — rozdział 5.2

Podstawa: issue #142 i wiążący komentarz koordynatora z 14.11.2026. Narzędzia przygotowuje wykonawca, pełną serię pomiarów wykonuje właściciel na commicie zamrożenia 22.11.2026. Podczas serii nie wdrażać zmian. Wyniki, surowe raporty, zrzuty i dane z panelu przechowywać lokalnie w ignorowanym `perf-results/`; nie commitować pomiarów ani danych treningów.

## Warunki wspólne

- Wynik produkcyjny pochodzi z builda produkcyjnego na Firebase Hosting (HTTPS, CDN, gzip/Brotli). `vite dev` ani `vite preview` nie są środowiskiem pomiaru produkcji.
- Zapisać commit, adres wdrożenia, datę i godziny w Europe/Warsaw. Potwierdzić, że Hosting i service worker udostępniają ten sam build. W trakcie serii bez wdrożeń.
- Windows: laptop podłączony do zasilania, zamknięte inne programy i karty, Chrome bez rozszerzeń (osobny profil lub incognito). Jeden przebieg naraz, ten sam komputer i łącze. Nie porównywać wyników po zmianie wersji narzędzia.
- Przypięte narzędzia: Lighthouse **13.6.0**, `@lhci/cli` **0.16.1** przez npm exec/npx, bez zależności w projekcie. Sprawdzić `lighthouseVersion` w JSON. CSV zapisuje też pełny `hostUserAgent` z wersją Chrome; wyniki różnych wersji są grupowane oddzielnie.
- Dla startu strony: **5 przebiegów** każdego wariantu, mediana i min–max, liczebność n i warunki. Dla S4: **10 prób na urządzenie i wariant**. Przy n = 5 nie liczyć p75; porównanie median z progami jest orientacyjne.
- Laboratorium, pomiary na telefonach i instalowalność mają osobne tabele. Nie mieszać wyników Lighthouse i web-vitals w jednej próbie.

## K1 — rozmiar paczek

W katalogu `combat-training-app` po buildzie:

```powershell
& { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Build failed' }; npm run perf:bundle }
```

`perf:bundle` nie wykonuje builda i nie łączy się z siecią. Czyta `dist/index.html`, sumuje rozmiary osobno kompresowanych plików wejściowych `<script src>` oraz `modulepreload` (bez podwójnego liczenia), podaje gzip i Brotli w **bajtach**. Gzip: domyślne parametry Node zlib; Brotli: jakość 11. Wynik konsolowy i `perf-results/bundle.json` obejmuje też:

- największy leniwy chunk według rozmiaru nieskompresowanego (również gzip/Brotli), liczbę chunków JS w `dist/assets`;
- sumę zasobów z manifestu precache `sw.js` i osobno wielkość skryptu SW; precache to całe zasoby offline, nie transfer pierwszego ekranu;
- CSS podłączony z HTML i fonty wskazane przez ten CSS / preload. Lista fontów to **kandydaci do pobrania**: `unicode-range`, użyte litery i ekran decydują o rzeczywistym pobraniu. Zmierzyć rzeczywisty transfer fontów w Network lub raporcie Lighthouse; nie traktować sumy wszystkich alfabetów jako transferu logowania;
- `legacyEntryOnly`: dotychczasowe liczenie wyłącznie `index-*.js`. To pomija współdzielone moduły i nie zastępuje sumy startowego JS. Wyświetlana przez Vite wartość gzip może się różnić od zlib; porównywać przed/po tą samą metodą.

W PR podawać startowy JS gzip przed i po według nowego skryptu, dodatkowo dotychczasową metodą. Plik wynikowy można nazwać jawnie:

```powershell
& { npm run perf:bundle -- dist perf-results/bundle-after.json }
```

Budżet orientacyjny web.dev to **poniżej 170 kB całej skompresowanej ścieżki krytycznej**: HTML, CSS, fonty i JS. Sam startowy JS projektu wynosi około 169 kB gzip, więc nie oznacza to spełnienia budżetu; po dodaniu CSS i fontów całość go przekracza. Sprawdzić również „Total byte weight” z Lighthouse; to suma transferu badanej strony, a nie sam JS. 1 kB = 1000 B, 1 KiB = 1024 B.

## S1/S2/S6 — Lighthouse: zimny i ciepły start

Konfiguracje: `lighthouserc.mobile.cjs`, `lighthouserc.desktop.cjs`. Domyślnie 5 przebiegów dla `/login` i `/register`, magazyn czyszczony, wyniki do systemu plików (`upload.target: filesystem`). URL jest argumentem: produkcja albo kanał podglądu. Nie ustawiać `staticDistDir` dla zdalnego hostingu.

```powershell
& { npm run perf:lighthouse -- mobile https://combat-training-830fb.web.app; if ($LASTEXITCODE -ne 0) { throw 'Mobile failed' }; npm run perf:lighthouse -- desktop https://combat-training-830fb.web.app }
```

Opcjonalne argumenty po adresie: liczba prób i `both`, `login` lub `register`. Przykład kontrolny z issue: `1 login` — pojedynczy przebieg, **nie pełna seria**. Nie uruchamiać go ponownie jako części tej samej próby.

| Parametr | Mobile | Desktop (`preset: desktop`) |
| --- | --- | --- |
| Ekran emulowany | Moto G Power, 412×823, DPR 1,75 | 1350×940, DPR 1 |
| Throttling | simulate | simulate |
| Sieć modelowana | RTT 150 ms, 1,6 Mb/s ↓, 750 kb/s ↑ | RTT 40 ms, 10 Mb/s |
| CPU | ×4 | ×1 |
| Magazyn w zimnej próbie | czyszczony (SW, Cache Storage) | czyszczony |

Porównać te parametry z `configSettings` w wygenerowanym JSON. `perf-results/lighthouse-mobile` i `perf-results/lighthouse-desktop` zawierają raporty JSON/HTML oraz `summary.csv`. Przed kolejną serią przenieść wyniki do osobnego katalogu, aby nie połączyć różnych commitów. `manifest.json` wskazuje reprezentatywny przebieg (`isRepresentativeRun`), ale statystyki CSV są liczone ze **wszystkich prób**, osobno dla URL, profilu, stanu magazynu, Lighthouse i Chrome. Nie utożsamiać raportu reprezentatywnego z osobnymi medianami każdej metryki.

CSV: FCP, LCP, TBT i SI w ms, CLS bez jednostki, Performance 0–100, „Total byte weight” w bajtach; każda metryka ma n, medianę, min i max. Do tabeli 3a przeliczyć ms na s oraz bajty na kB. Brak metryki lub błąd Lighthouse kończy konwersję błędem, nie zerem.

```powershell
& { npm run perf:csv -- perf-results/lighthouse-mobile perf-results/lighthouse-mobile/summary.csv }
```

**Ciepły start:** po jednej wizycie rozgrzewkowej i aktywacji SW wykonać 5 prób z `disableStorageReset: true` (CLI: `--disable-storage-reset`). Sprawdzić w Network / raporcie źródło zasobów z SW oraz `navigator.serviceWorker.controller`. Nie zakładać, że LHCI zachowuje SW lub wspólny profil między próbami. Jeżeli tego nie potwierdzono, wykonać ciepły start ręcznie w DevTools Performance: 5 przeładowań po instalacji, aktywacji i przejęciu strony przez SW. Podawać FCP/LCP i warunki, nie dopisywać nieistniejącego wyniku Lighthouse do śladu Performance.

**Ekrany po zalogowaniu:** właściciel loguje się sam. Lighthouse w DevTools z **wyłączonym czyszczeniem magazynu** (inaczej zniknie Firebase Auth i IndexedDB). Osobno zmierzyć ekran główny, listę treningów i ekran używany w badanym scenariuszu. Nie przekazywać haseł agentom ani skryptom. Wyniki oznaczyć jako sesję zalogowaną z zachowanym magazynem. Nie nazywać jej próbą z całkowicie pustym magazynem.

## S3 — start offline

1. Online otworzyć aplikację i potrzebne ekrany, poczekać na precache i aktywację SW. Przeładować, potwierdzić kontrolę przez SW. Dla danych zalogować się i poczekać na snapshoty Firestore.
2. W Chrome: DevTools → Application → Service workers → Offline (lub Network → Offline). Nie czyścić IndexedDB ani Cache Storage.
3. Wykonać 5 przeładowań z nagrywaniem Performance. Zapisać FCP i LCP, błędy oraz dostępność ekranu/danych z cache.
4. Sprawdzić bezpośrednią nawigację do zagnieżdżonej trasy SPA (fallback), nie tylko `/`. Zanotować, które dane nie były wcześniej dostępne w cache.
5. Przywrócić sieć. Nie porównywać tego startu z zimną próbą online mającą pusty magazyn.

## S4 — zapis offline i synchronizacja

Panel jest dostępny pod `?perf=1`, np. `/workout-sessions/new?perf=1`. Flaga jest zapamiętana w `sessionStorage` na czas karty; `?perf=0` ją usuwa. Po wyłączeniu przeładować dokument. Bez flagi kod panelu i web-vitals nie jest wykonywany ani pobierany przez precache; krótki warunek w HTML decyduje o imporcie, nie powiększa grafu startowego JS. Panel ma własne style, nie zmienia głównego arkusza. Przed testem offline **włączyć panel online** i pozostawić tę kartę otwartą (panel celowo nie należy do precache).

Panel na dole można zwinąć, żeby wypełnić formularz na telefonie. Pokazuje metryki, kontekst standalone, `navigator.onLine`, kontrolę SW i tryb offline SDK. „Kopiuj wyniki (JSON)” kopiuje liczby, znaczniki monotonicznego zegara, kontekst i wersje. Gdy schowek jest niedostępny, pojawia się pole do ręcznego zaznaczenia i skopiowania. Wyniki pozostają w pamięci strony; **skopiować przed przeładowaniem lub zamknięciem karty**. Zapisane treningi pozostają normalnymi danymi użytkownika.

1. Zalogować się, poczekać na dane i włączyć panel. Skopiować początkowy kontekst. Wersje: Firebase 13.2.0, web-vitals 6.2.3; panel zapisuje wersje z bieżącego buildu. Cache: `persistentLocalCache` + `persistentMultipleTabManager`.
2. Wariant A: „Symuluj brak sieci” korzysta z `disableNetwork()` / `enableNetwork()`. To odłączenie **SDK Firestore**; `navigator.onLine` może pozostać true. Wariant B: prawdziwy tryb samolotowy, odłączenie sieci albo DevTools Offline. Testować oba warianty osobno.
3. Otworzyć „Trening spoza aplikacji”, uzupełnić poprawny nowy wpis. Nacisnąć „Zapisz”. Przy komunikacie o duplikacie pomiar zaczyna się od ostatecznego potwierdzenia zapisu. Formularz i snapshot są instrumentowane tylko w kilku miejscach; brak nowych kolekcji lub reguł.
4. **T_lokalny** = znacznik pierwszego snapshotu zawierającego nowy wpis z `hasPendingWrites === true` minus znacznik „Zapisz” (z walidacją). Jest to czas obserwacji lokalnej zmiany, **nie dowód zapisu na dysku / zakończenia IndexedDB**. Nie mierzyć przez `await setDoc()`: offline czekałoby na serwer. Panel obserwuje zwykły zapis ręcznego treningu, nie syntetyczny dokument.
5. Przywrócić połączenie (zdarzenie `online`) albo przyciskiem „Przywróć sieć Firestore”. **T_sync** = snapshot bez `hasPendingWrites` i spoza cache minus zdarzenie `online` / początek `enableNetwork()`. Znacznik jest zapisywany przed włączeniem sieci, aby nie zgubić szybkiego potwierdzenia. Przy kilku wpisach w kolejce koniec oznacza snapshot kolekcji bez oczekujących zapisów. Nie mierzy się czasu spędzonego offline.
6. Zrobić n = 10 dla pojedynczego zapisu i n = 10 dla kilku zapisów w kolejce, na każdym urządzeniu i wariancie offline. Zapisać liczbę wpisów w kolejce, sieć po powrocie i rozrzut. Przed nową próbą poczekać na opróżnienie kolejki.
7. Sprawdzić, że panel wyświetla T_lokalny, potem T_sync; skopiować JSON. „Oczekiwanie” nie jest wynikiem 0. Błąd zapisu lub zamknięcie subskrypcji oznacza nieudaną/przerwaną obserwację. Po badaniach właściciel sam usuwa testowe wpisy z dziennika.

## S5 — instalowalność

Lighthouse 12 usunął kategorię PWA. Stosować listę kontrolną i zrzuty, nie szukać „wyniku PWA”. Chrome desktop/Android: DevTools → Application → Manifest; HTTPS, `name`/`short_name`, ikony 192 i 512, `start_url`, `display`, brak błędów manifestu, możliwość instalacji po spełnieniu heurystyki zaangażowania. Zainstalować, uruchomić z ikony i sprawdzić start offline po ponownym otwarciu.

Na iPhonie (iOS 26): Safari → Udostępnij → „Do ekranu początkowego”. Uruchomić z ikony, sprawdzić kontekst standalone w panelu, potem zamknąć aplikację, odłączyć sieć i ponownie otworzyć. Zanotować ograniczenia i wynik tak/nie; sama obecność ikony nie potwierdza działania offline.

## S7 — urządzenia właściciela

- **Windows + Chrome:** laboratorium Lighthouse/DevTools, osobno obserwacje panelu.
- **iPhone bez Maca:** brak Web Inspectora. Wszystkie metryki zbierać z panelu na ekranie i eksportu JSON; bez wymagania odczytu konsoli Safari. web-vitals korzysta z dostępnych API: LCP/INP/FCP/TTFB w obsługujących je wersjach, w Safari wymagane odpowiednie API (research: 26.2+). CLS na iPhonie oznaczyć **„n/d (brak API)”**; panel sprawdza dostępność API, nie zgaduje wartości 0. INP wymaga interakcji; część metryk finalizuje się po ukryciu strony. Wejść w interakcję, przełączyć aplikację i wrócić przed skopiowaniem wyników.
- **Android kolegi:** USB debugging, Chrome na Windows → `chrome://inspect#devices`. Wybrać kartę/PWA na urządzeniu; nagrywać Performance i sprawdzać SW/Network. Nie mylić emulacji mobile na laptopie z rzeczywistym telefonem.

Na każdym telefonie: 5× zimny, 5× ciepły, 5× offline oraz po 10× wariantów S4. Dla zimnego startu opisać dokładnie opróżnienie cache; nie kasować jedynej kopii niezsynchronicznych treningów. Zimna sesja po czyszczeniu magazynu wymaga ponownego logowania. Zapisać model, wersję systemu, przeglądarkę, baterię, wyłączony tryb oszczędzania i sieć. Dla ciepłego i offline zachować cache po wizycie rozgrzewkowej. Wyniki z telefonów to studium przypadku, nie reprezentatywne dane terenowe.

## Progi i interpretacja

CWV „dobre”: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. Pomocniczo FCP ≤ 1,8 s, TTFB ≤ 0,8 s. TBT < 200 ms to wskaźnik laboratoryjny, **nie INP**. Cel własny T_lokalny ≤ 100 ms; dla T_sync bez progu — mediana i rozrzut.

| Metryka Lighthouse | Mobile: dobry / zły od | Desktop: dobry / zły od | Waga |
| --- | --- | --- | --- |
| FCP | 1,8 / 3 s | 0,9 / 1,6 s | 10% |
| SI | 3,4 / 5,8 s | 1,3 / 2,3 s | 10% |
| LCP | 2,5 / 4 s | 1,2 / 2,4 s | 25% |
| TBT | 200 / 600 ms | 150 / 350 ms | 30% |
| CLS | 0,1 / 0,25 | 0,1 / 0,25 | 25% |

Performance 90–100: dobry, 50–89: do poprawy, 0–49: słaby. Progi kolorów desktop i mobile różnią się. Nie traktować kilku punktów różnicy przy n = 5 jako rozstrzygającego dowodu poprawy.

## Wzory tabel do rozdziału 5.2

### 3a — Lighthouse (wyłącznie laboratorium)

W polach metryk wpisywać „mediana (min–max)”; dla śladów Performance niedostępne metryki oznaczyć n/d.

| Ekran (URL) | Profil | Stan (zimny/ciepły/offline) | n | FCP [s] | LCP [s] | TBT [ms] | CLS | SI [s] | Wynik | Transfer [kB] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| do uzupełnienia | mobile / desktop | do uzupełnienia | 5 | — | — | — | — | — | — | — |

### 3b — urządzenia (web-vitals)

| Urządzenie / system / przeglądarka | Sieć | Scenariusz | n | FCP [ms] | LCP [ms] | INP [ms] | CLS | Uwagi |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| do uzupełnienia | do uzupełnienia | zimny / ciepły / offline | 5 | — | — | — | — | TTFB, standalone, kontrola SW, brak API |

### 3c — Firestore

| Urządzenie | Wariant offline | Zapisów w kolejce | n | T_lokalny mediana (min–max) [ms] | T_sync mediana (min–max) [ms] | Sieć po powrocie |
| --- | --- | --- | --- | --- | --- | --- |
| do uzupełnienia | SDK / tryb samolotowy / DevTools | 1 / kilka (podać liczbę) | 10 | — | — | do uzupełnienia |

### 3d — instalowalność

| Kryterium | Chrome desktop | Chrome Android | Safari iOS | Dowód |
| --- | --- | --- | --- | --- |
| HTTPS | tak / nie | tak / nie | tak / nie | adres / zrzut |
| Manifest: nazwa, ikony 192 i 512, start_url, display | tak / nie | tak / nie | tak / nie / n/d | Application → Manifest |
| Instalacja / Do ekranu początkowego | tak / nie | tak / nie | tak / nie | zrzut |
| Uruchomienie z ikony, standalone | tak / nie | tak / nie | tak / nie | zrzut panelu |
| Ponowne uruchomienie offline, fallback SPA i cache danych | tak / nie | tak / nie | tak / nie | zrzut i opis |

### 3e — opis warunków (akapit do uzupełnienia)

Pomiary wykonano [data, godziny Europe/Warsaw] na [CPU, RAM, system], przy zasilaniu [sieciowym], w Chrome [wersja], Lighthouse [wersja z JSON], LHCI/CLI [wersja], w profilu bez rozszerzeń. Badano produkcyjny build [commit zamrożenia] pod [adres]. Zastosowano preset [mobile/desktop], ekran [rozmiar, DPR], throttling simulate, sieć [RTT, przepustowość], spowolnienie CPU [×4/×1]. Każdy wariant startu wykonano pięciokrotnie i podano medianę (min–max). Zimny start oznaczał [stan magazynu], ciepły [rozgrzewka, kontrola SW i metoda], łącze bazowe [opis]. Telefony: [model/system/przeglądarka/bateria/wyłączone oszczędzanie/sieć], web-vitals [wersja]. Firestore: Firebase SDK [wersja], persistentLocalCache z persistentMultipleTabManager, n = 10 na wariant, kolejka [liczba], offline [SDK / rzeczywisty].

## Ograniczenia i rzeczy do potwierdzenia

Laboratorium nie jest polem: jedno urządzenie i sieć, brak danych CrUX przy małym ruchu. Telefony to studium przypadku. Throttling symulowany jest modelem, profil mobile emuluje Androida, nie iPhone'a. Lighthouse nie mierzy INP. `disableNetwork()` odłącza SDK, dlatego potrzebny jest osobny rzeczywisty offline. Zmienność przy n = 5 ogranicza wnioski.

Do potwierdzenia podczas pełnej serii: zachowanie SW między przebiegami CLI/LHCI ze wspólnym profilem i wyłączonym resetem magazynu; kolejność snapshotu `hasPendingWrites` względem trwałego zapisu w IndexedDB. Panel nie potwierdza trwałości na dysku. Jego obsługa, rozwijanie i kopiowanie także są interakcjami, więc wyniki INP raportować z opisem działań, a serię Lighthouse wykonywać bez flagi panelu.
