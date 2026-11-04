# Wybór backendu (BaaS): Firebase czy Supabase

Stan na 3 listopada 2026. Materiał do rozdziałów 2.2 i 3.2 oraz do ADR o wyborze backendu.

Dokument łączy dwie niezależne analizy:

- **Grok Bot („Research – praca”):** arkusz `firebase_vs_supabase.xlsx` z 19 kryteriami, rejestrem ryzyk, rekomendacją, bibliografią i metodologią. Tylko źródła oficjalne, data dostępu 03.11.2026. Oryginał jest u Antoniego.
- **Claude:** własny przegląd dokumentacji, własny pomiar rozmiaru SDK oraz weryfikacja kluczowych faktów z arkusza.

Obie analizy, prowadzone osobno, kończą się tą samą rekomendacją.

> **Decyzja właściciela (4 listopada 2026): Firebase.** Zapisana w `docs/adr/0004-firebase-as-baas.md`. Test trwałości zapisu offline: `spikes/firestore-offline/RESULTS.md`.

## Wniosek

**Rekomendacja obu analiz: Firebase** (Authentication + Cloud Firestore w regionie `europe-central2`, Warszawa + Hosting) na darmowym planie Spark. To ocena, nie fakt. Decyzję podejmuje właściciel i zapisuje ją w ADR.

Rozstrzygają cztery wymagania tego projektu:

1. **Zapis zakończonego treningu bez sieci.** Firestore robi to natywnie: zapis trafia do kolejki w IndexedDB i wysyła się po powrocie sieci. Supabase wymaga własnej kolejki albo dodatkowej usługi (PowerSync, Legend-State).
2. **Samodzielna rejestracja uczestników badania.** Firebase wysyła e-maile z potwierdzeniem adresu (1000 dziennie) i resetem hasła (150 dziennie) bez własnego serwera SMTP. Domyślny SMTP Supabase wysyła tylko do członków zespołu projektu, 2 wiadomości na godzinę.
3. **Działanie do obrony.** Supabase usypia darmowy projekt po tygodniu niskiej aktywności. Dla Firebase Spark takiej reguły w dokumentacji nie znaleziono, ale nie ma też gwarancji, że jej nie ma.
4. **Hosting w tej samej platformie.** Firebase Hosting jest w pakiecie. Supabase nie hostuje frontendu.

Supabase byłby lepszy, gdyby rdzeniem pracy była analiza w SQL, a działanie offline nie było wymagane.

## Porównanie (fakty)

| Kryterium | Firebase | Supabase |
| --- | --- | --- |
| Darmowy plan | Spark, bez karty. Przekroczenie limitu wyłącza usługę do końca miesiąca | Free, maksymalnie 2 aktywne projekty |
| Baza (darmowo) | Firestore: 1 GiB, 50 tys. odczytów, 20 tys. zapisów i 20 tys. usunięć dziennie | 500 MB, 5 GB transferu, 50 tys. aktywnych użytkowników miesięcznie, bez automatycznych kopii |
| Hosting frontendu | 10 GB, 360 MB transferu dziennie, własna domena i SSL | Brak w ofercie |
| Usypianie | Nie znaleziono reguły ani gwarancji jej braku | Pauza po 7 dniach niskiej aktywności, przywrócenie z panelu |
| E-maile logowania bez SMTP | Tak: potwierdzenie 1000 dziennie, reset 150 dziennie, tworzenie kont 100 na godzinę z jednego IP | Tylko do członków zespołu, 2 na godzinę. Po podpięciu własnego SMTP 30 na godzinę |
| Offline w przeglądarce | `persistentLocalCache` (IndexedDB), domyślnie wyłączony. Zapisy synchronizują się po powrocie sieci. `writeBatch` działa offline, transakcje nie | Brak wbudowanej kolejki zapisów |
| Wiele kart | `persistentMultipleTabManager` | Nie dotyczy |
| Agregacje na serwerze | `count`, `sum`, `average` z filtrami, bez grupowania, tylko online | Pełny SQL, widoki, funkcje |
| Testy reguł w CI | Emulator i `@firebase/rules-unit-testing` | Supabase CLI, pgTAP, lokalny stos |
| Eksport danych | Zarządzany eksport wymaga planu Blaze. Konta można wyeksportować przez CLI | `supabase db dump` |
| Region danych | Firestore w Warszawie (`europe-central2`). **Konta Firebase Authentication przetwarzane wyłącznie w centrach danych w USA** | Jeden wybrany region, na przykład Frankfurt |
| Pliki (Storage) | Od 2026 roku wymaga planu Blaze (aplikacja nie potrzebuje plików) | 1 GB |

**Rozmiar SDK w przeglądarce** (minifikacja i gzip, firebase 13.2.0, @supabase/supabase-js 2.118.0):

| Pakiet | Pomiar Groka | Pomiar Claude |
| --- | --- | --- |
| Firebase: logowanie + Firestore z offline | 202,5 KB | 194 KB |
| Firestore Lite (bez offline, więc odpada) | 70,0 KB z logowaniem | nie mierzono |
| supabase-js | 59,2 KB | 56 KB |

Dla porównania cała obecna aplikacja waży 127 KB po gzip.

## Ryzyka i ograniczenia

| Ryzyko | Platforma | Ograniczenie |
| --- | --- | --- |
| Interfejs „wisi” offline, bo czeka na potwierdzenie zapisu (obietnica `setDoc` kończy się dopiero po zapisie na serwerze) | Firebase | Nie czekać na zapis w interfejsie. Stan „czeka na wysłanie” z `hasPendingWrites` |
| Safari kasuje dane witryny po 7 dniach używania przeglądarki bez wejścia na stronę. Zainstalowana PWA ma własny licznik | obie | Zachęcać do instalacji na iPhonie, `navigator.storage.persist()`, widoczny licznik niewysłanych treningów |
| Błędnie napisane reguły dostępu | obie | Testy reguł w CI, w tym testy negatywne. Dane pod `users/{uid}/...` |
| Brak grupowania w zapytaniach | Firebase | Liczenie w aplikacji (kilkaset wpisów na osobę) albo dokument z podsumowaniem tygodnia aktualizowany przy zapisie |
| Większa biblioteka obniża wynik Lighthouse | Firebase | Ładowanie Firestore po pierwszym renderze, pomiar w Lighthouse |
| Konta w USA | Firebase | Informacja w zgodzie uczestnika badania, tylko e-mail jako dane konta |
| Brak darmowych kopii zapasowych | obie | Eksport „Moje dane” do JSON w aplikacji (przydaje się też przy prawie do przenoszenia danych, art. 20 RODO), kopia przed obroną |
| Zmiana warunków darmowych planów przed obroną | obie | Sprawdzić cenniki przed badaniem i przed obroną. Warstwa repozytoriów w kodzie ułatwia migrację |
| Uzależnienie od dostawcy | Firebase | Typy i logika w `src/domain`, Firebase tylko w `src/infrastructure` |

## Zalecenia implementacyjne (ocena)

1. `initializeFirestore` z `persistentLocalCache` i `persistentMultipleTabManager`.
2. Zapisy bez czekania w interfejsie, wskaźnik niewysłanych zmian.
3. Struktura `users/{uid}/plans`, `users/{uid}/workouts`, `users/{uid}/goals`, `users/{uid}/weights`.
4. Analiza tygodniowa liczona w aplikacji, opcjonalnie dokument z podsumowaniem tygodnia.
5. Testy reguł z `@firebase/rules-unit-testing` w GitHub Actions.
6. Ładowanie Firestore po pierwszym renderze i pomiar w Lighthouse.
7. Eksport „Moje dane” do JSON.
8. Na iOS zachęta do instalacji PWA i `navigator.storage.persist()`.
9. Przy wylogowaniu wyczyścić lokalną pamięć Firestore, żeby kolejna osoba na tym samym urządzeniu nie zobaczyła cudzych danych.

## Do sprawdzenia testem (niepotwierdzone w dokumentacji wprost)

- Niewysłany zapis przetrwa przeładowanie i zamknięcie karty. Dowody pośrednie: opis `waitForPendingWrites` („poprzednia sesja aplikacji”), `clearIndexedDbPersistence` („pending writes”) i kod SDK. Test: DevTools offline, zapis, zamknięcie karty, ponowne otwarcie online.
- Zachowanie w Safari na iPhonie i w zainstalowanej PWA. Zgłoszenia na GitHubie: firebase-js-sdk #6806, #8860, #1670.
- Wpływ na wynik Lighthouse w profilu mobilnym.
- Brak usypiania projektów Spark.

## Weryfikacja Claude (3 listopada 2026)

Sprawdzone w źródłach i zgodne z arkuszem:

- **Limity planu Spark** (Firestore, logowanie, hosting) oraz brak Cloud Functions na Spark: [firebase.google.com/pricing](https://firebase.google.com/pricing).
- **Limity e-maili** 1000, 150 i 5 dziennie: [firebase.google.com/docs/auth/limits](https://firebase.google.com/docs/auth/limits).
- **Offline na webie:** domyślnie wyłączony, `persistentLocalCache`, wsparcie Chrome, Safari i Firefox: [Access data offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline?hl=en).
- **Agregacje** `count`, `sum` i `average`: [Aggregation queries](https://firebase.google.com/docs/firestore/query-data/aggregation-queries).
- **Region Warszawa** `europe-central2`: [Firestore locations](https://docs.cloud.google.com/firestore/docs/locations).
- **Firebase Authentication działa wyłącznie z centrów danych w USA** („The Firebase Authentication service is run only from US data centers”): [Privacy and Security in Firebase](https://firebase.google.com/support/privacy).
- **Supabase:** usypianie po tygodniu i ograniczenia domyślnego SMTP: [free project pausing](https://supabase.com/kb/faqs/platform/free-project-pausing), [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- **Firebase Data Connect** (PostgreSQL w Firebase) na Spark to tylko 90-dniowa wersja próbna, po której baza jest archiwizowana: [Data Connect pricing](https://firebase.google.com/docs/data-connect/pricing). Dlatego nie jest alternatywą na czas pracy.
- **Pomiar rozmiaru SDK:** własny pomiar Claude zgodny z pomiarem Groka z dokładnością do kilku KB.

## Bibliografia (DOI potwierdzone przez Grok Bota na doi.org; pełnych tekstów nie czytano)

1. Cattell, R. (2011). Scalable SQL and NoSQL data stores. *ACM SIGMOD Record*, 39(4), 12–27. https://doi.org/10.1145/1978915.1978919 (klasyfikacja magazynów danych).
2. Davoudian, A., Chen, L., Liu, M. (2018). A Survey on NoSQL Stores. *ACM Computing Surveys*, 51(2), 1–43. https://doi.org/10.1145/3158661 (tło teoretyczne baz dokumentowych).
3. Gessert, F., Wingerath, W., Friedrich, S., Ritter, N. (2017). NoSQL database systems: a survey and decision guidance. *Computer Science – Research and Development*, 32(3–4), 353–365. https://doi.org/10.1007/s00450-016-0334-3 (kryteria wyboru bazy).
4. Lourenço, J. R. i in. (2015). Choosing the right NoSQL database for the job: a quality attribute evaluation. *Journal of Big Data*, 2, 18. https://doi.org/10.1186/s40537-015-0025-0
5. Kleppmann, M., Wiggins, A., van Hardenberg, P., McGranaghan, M. (2019). Local-first software: you own your data, in spite of the cloud. *Onward! 2019*, 154–178. https://doi.org/10.1145/3359591.3359737 (uzasadnienie działania offline).
6. Castro, P., Ishakian, V., Muthusamy, V., Slominski, A. (2019). The rise of serverless computing. *Communications of the ACM*, 62(12), 44–54. https://doi.org/10.1145/3368454 (definicja modelu serverless i BaaS).
7. Baldini, I. i in. (2017). Serverless Computing: Current Trends and Open Problems. W: *Research Advances in Cloud Computing*, 1–20. Springer. https://doi.org/10.1007/978-981-10-5026-8_1 (ryzyka, w tym uzależnienie od dostawcy).
8. Biørn-Hansen, A., Grønli, T.-M., Ghinea, G. (2018). A Survey and Taxonomy of Core Concepts and Research Challenges in Cross-Platform Mobile Development. *ACM Computing Surveys*, 51(5), 1–34. https://doi.org/10.1145/3241739 (miejsce PWA wśród podejść wieloplatformowych).
9. Rezerwa: Stonebraker, M. (2010). SQL databases v. NoSQL databases. *Communications of the ACM*, 53(4), 10–11. https://doi.org/10.1145/1721654.1721659
10. Rezerwa: Codd, E. F. (1970). A relational model of data for large shared data banks. *Communications of the ACM*, 13(6), 377–387. https://doi.org/10.1145/362384.362685

**Uwaga do pisania pracy:** publikacje, na których opierasz kluczowe argumenty, przeczytaj w pełnym tekście (dostęp przez bibliotekę uczelni). Bezpośredniego naukowego porównania Firebase i Supabase nie znaleziono, więc w pracy opierasz się na literaturze o bazach NoSQL i relacyjnych, serverless/BaaS i local-first oraz na dokumentacji producentów.

## Pomiar Lighthouse (Claude, 3 listopada 2026)

Warunki: Lighthouse 13.6, profil telefonu (symulowane wolne 4G i telefon średniej klasy), pierwsza wizyta, strona startowa, build produkcyjny (`vite preview`), po 5 pomiarów, mediana. Firebase i Supabase z fikcyjną konfiguracją, bez połączenia z bazą. Pomiar pokazuje więc koszt pobrania i uruchomienia biblioteki, a nie czas zapytań.

| Wersja | Wynik (zakres) | LCP | TBT | Transfer |
| --- | --- | --- | --- | --- |
| Aplikacja dziś (bez backendu) | 92 (88–99) | 3,25 s | 75 ms | 374 KB |
| + Supabase (klient i sesja) | 88 (83–90) | 3,79 s | 149 ms | 427 KB |
| + Firebase, logowanie i Firestore od razu | 82 (80–84) | 4,38 s | 180 ms | 550 KB |
| + Firebase, Firestore zaraz po pierwszym renderze | 81 (79–83) | 4,37 s | 283 ms | 551 KB |
| + Firebase, Firestore po zdarzeniu `load` i `requestIdleCallback` | 88 (83–96) | 3,62 s | 178 ms | 402 KB |

Wniosek: koszt biblioteki Firebase da się opanować. Gdy Firestore ładuje się po wczytaniu strony, wynik jest taki sam jak przy Supabase (88). Ekrany logowania potrzebują tylko modułu logowania (+28 KB). Kolejne wizyty korzystają z pamięci service workera. Pomiar powtórzyć na gotowej aplikacji, bo pokaże też czas pierwszych danych.
