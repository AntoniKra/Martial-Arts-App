# Wyniki spike Firestore offline — issue #22

**PASS z uwagami.** W kontrolowanym eksperymencie niewysłany zapis przetrwał zamknięcie karty i całej przeglądarki w Chromium oraz WebKit. Po przywróceniu sieci wszystkie cztery dokumenty dotarły do emulatora. W obu próbach kontrolnych pamięć RAM utraciła zapis zgodnie z oczekiwaniem.

## Przebieg stanowiący dowód

- Data: **3 listopada 2026, 23:51 czasu polskiego** (22:51 UTC).
- Kod eksperymentu: `4fff59c472ecddd31120169ee35542b70149408d`; baza gałęzi: `1207c89f22997557152195893c89feee9b36ddae`.
- [Log i podsumowanie eksperymentu w CI, run 41734183109](https://github.com/AntoniKra/Martial-Arts-App/actions/runs/41734183109).
- [Kontrole aplikacji i E2E, run 41734183466](https://github.com/AntoniKra/Martial-Arts-App/actions/runs/41734183466).
- **6 PASS, 0 FAIL, 0 SKIP, 0 flaky**, 22,3 s testów Playwright, bez automatycznych ponowień.
- Pełny raport HTML, JSON, log emulatora i 18 zrzutów znajdują się w artefakcie `firestore-offline-results` przebiegu CI (retencja 14 dni). Poniższe obserwacje JSON i sześć najważniejszych zrzutów są zapisane także w repozytorium, aby dowody pozostały dostępne po wygaśnięciu artefaktu.

## Macierz scenariuszy

W kolumnie REST podano stan **po ponownym otwarciu, nadal offline → po odzyskaniu sieci**. W A/B sprawdzono wszystkie pola dokumentu i następnie wyzerowanie `hasPendingWrites`.

| Scenariusz | Przeglądarka | Wynik testu | Dokument po ponownym otwarciu offline | REST emulatora | Dowody |
| --- | --- | --- | --- | --- | --- |
| A — zamknięcie karty | Chromium | PASS | obecny, `hasPendingWrites=true` | 404 → 200 | [log JSON](evidence/chromium-A.json), [zrzut](evidence/chromium-A-offline-after-reopen.png) |
| A — zamknięcie karty | WebKit | PASS | obecny, `hasPendingWrites=true` | 404 → 200 | [log JSON](evidence/webkit-A.json), [zrzut](evidence/webkit-A-offline-after-reopen.png) |
| B — zamknięcie przeglądarki | Chromium | PASS | obecny, `hasPendingWrites=true` | 404 → 200 | [log JSON](evidence/chromium-B.json), [zrzut](evidence/chromium-B-offline-after-reopen.png) |
| B — zamknięcie przeglądarki | WebKit | PASS | obecny, `hasPendingWrites=true` | 404 → 200 | [log JSON](evidence/webkit-B.json), [zrzut](evidence/webkit-B-offline-after-reopen.png) |
| C — kontrola w RAM | Chromium | PASS kontroli | brak, `hasPendingWrites=false` | 404 → 404 | [log JSON](evidence/chromium-C.json), [zrzut](evidence/chromium-C-offline-after-reopen.png) |
| C — kontrola w RAM | WebKit | PASS kontroli | brak, `hasPendingWrites=false` | 404 → 404 | [log JSON](evidence/webkit-C.json), [zrzut](evidence/webkit-C-offline-after-reopen.png) |

**C: trwałość nie została zachowana — to oczekiwany wynik.** Przed zamknięciem oba dokumenty istniały lokalnie z `hasPendingWrites=true`, a REST zwracał 404. Po zamknięciu karty `getDocFromCache` zwrócił `unavailable`, ponieważ nowa instancja SDK miała pustą pamięć RAM. Po przywróceniu sieci odczyt z serwera i niezależny REST potwierdziły brak dokumentu. Kontrola pokazuje, że A/B nie zostały zaliczone przez wcześniejsze wysłanie dokumentu lub odczyt z emulatora zamiast lokalnego cache.

## Wersje faktycznie użyte w CI

| Składnik | Wersja |
| --- | --- |
| firebase | 13.2.0 |
| firebase-tools | 15.34.2 |
| Firestore Emulator | 1.22.0 |
| @playwright/test | 1.64.1 |
| Chromium | 156.0.8078.4 |
| WebKit | 27.2 |
| Node w eksperymencie | 24.12.0 |
| Java | Temurin OpenJDK 21.0.13+9 LTS |
| Środowisko | Linux, GitHub Actions `ubuntu-latest`, tryb headless |

Wersje Firebase, przeglądarki i Node są również w pierwszym zdarzeniu każdego pliku obserwacji. Wersje pakietów i Javy pochodzą z kroku `Record package and Java versions`, a emulatora z logu jego uruchomienia.

## Kontrole aplikacji

| Polecenie | Wynik |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS: 0 błędów, 21 istniejących ostrzeżeń w `src/` |
| `npm test` | PASS: 17 plików, 161 testów, 0 FAIL, 0 SKIP |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS: 39 testów Chromium, 0 FAIL |
| `npm run spike:firestore:typecheck` | PASS |
| osobny build strony eksperymentu | PASS, ostrzeżenie o paczce JS >500 kB |

Cztery wymagane kontrole oraz typy i build eksperymentu przeszły także lokalnie w izolowanej kopii w systemowym folderze tymczasowym. Java nie była dostępna w lokalnym PATH, dlatego macierz emulatora wykonano w CI z `actions/setup-java`. Nie instalowano Javy na komputerze użytkownika.

## Problemy wykryte podczas przygotowania

Nie są to porażki trwałości Firestore; wcześniejsze przebiegi nie dotarły do wszystkich asercji scenariuszy:

1. [Run 41732697608](https://github.com/AntoniKra/Martial-Arts-App/actions/runs/41732697608): `npm ci` na Linuksie zgłosiło niekompletny lockfile zależności opcjonalnych (`@emnapi/runtime`, `@emnapi/core`). Lockfile uzupełniono w czystym katalogu, sprawdzono przez npm 10.9.9 dla Linuksa; później oba workflow poprawnie wykonały `npm ci`. Wersje istniejących wcześniej pakietów nie zostały podniesione.
2. [Run 41733085516](https://github.com/AntoniKra/Martial-Arts-App/actions/runs/41733085516): emulator działał, ale serwer podglądu szukał konfiguracji względem katalogu konfiguracji Playwright. Ustawiono jawny katalog aplikacji i bezwzględne ścieżki raportów.
3. [Run 41733575956](https://github.com/AntoniKra/Martial-Arts-App/actions/runs/41733575956): Chromium odmówiło dostępu do adresu `loopback` stronie dostarczonej przez routing testu. Dodatkowo SDK WebChannel uruchamiało sondę `www.google.com/images/cleardot.gif` po błędach transportu, a blokada tej sondy przerywała test. Nadano standardowe uprawnienie `local-network-access` dla origin strony testowej; sonda jest nadal blokowana przed wysłaniem, ale jej zablokowanie jest zapisywane jako obserwacja. Nie wyłączono zabezpieczeń przeglądarki ani nie zmieniono asercji trwałości.

## Zakres, odstępstwa i ryzyka

- **Odstępstwa od issue: brak.** Dodanie osobnego workflow w `.github/workflows/` wynika wprost z issue. Strona, testy i dowody są w `spikes/firestore-offline/`; `src/`, `.github/workflows/ci.yml`, folder referencyjny Figmy i decyzje architektoniczne pozostały bez zmian.
- **P1:** brak wykrytych problemów blokujących eksperyment.
- **P2 — zakres wniosku:** wynik dotyczy kontrolowanego zamknięcia w tych wersjach silników na Linuksie. Nie dowodzi odporności na awarię procesu, usunięcie danych, ograniczenia pamięci ani działania na fizycznym iPhonie. Dlatego nie stanowi samodzielnej decyzji o zmianie backendu.
- **P3 — narzędzia eksperymentu:** Firebase 13 wymaga Node >=24.12.0; istniejące joby aplikacji na Node 22 zgłaszają ostrzeżenia `EBADENGINE` podczas instalacji tych devDependencies, ale wszystkie kontrole przechodzą. Osobny job eksperymentu ma przypięty Node 24.12.0. Build testowej strony ostrzega o rozmiarze JS; paczka nie jest częścią buildu aplikacji. Zależności CLI emitują także ostrzeżenia o przestarzałych pakietach.
- **P3 — diagnostyka offline:** logi zawierają błędy transportu i komunikaty WebKit podczas celowego odcięcia sieci. Zachowano je w JSON; nie pominięto żadnej próby i nie włączono ponowień. Końcowe asercje sześciu prób są zaliczone.

Wyłącznie emulator `demo-combat-training`, bez prawdziwego projektu Firebase, Google Auth, kluczy, produkcji, zmian ustawień projektu i wdrożeń. Commity i push wykonano na jawne polecenie użytkownika; PR nie został scalony. Raporty i zrzuty zapisano wyłącznie w tym repozytorium lub systemowym folderze tymczasowym.
