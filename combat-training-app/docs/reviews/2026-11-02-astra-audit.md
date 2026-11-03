# Niezależny audyt i plan wersji finalnej

Data w nazwie pliku: 2 listopada 2026, zgodnie ze zleceniem. Aktualizacja diagnozy: **3 listopada 2026**. Termin przyjęty do planowania: **16 grudnia 2026**.

**Badana podstawa:** `origin/main`, commit `1b2ab1e4d59c08604ae2e84b5cc9a937bababfeb`, po pobraniu zmian i scaleniu PR #10, #11 i #6. Raport przygotowano na `docs/astra-audit` w oddzielnej kopii roboczej. Numery linii poniżej odnoszą się do tej podstawy. Ścieżki `src/`, `docs/` i `supabase/` oznaczają katalogi wewnątrz `combat-training-app/`.

**Status raportu: PASS z uwagami. Status aplikacji: działający prototyp lokalny, jeszcze nie wersja finalna zgodna z tematem pracy.** To dwa różne werdykty. Kontrole kodu przechodzą, ale chmura, uwierzytelnianie, cele, profil i analiza wymagają implementacji. Sześć tygodni to ambitny termin o wysokim ryzyku przekroczenia. Zamknięcie definicji danych w pierwszym tygodniu, mały zakres analizy i zachowanie czasu na badania są warunkami koniecznymi, nie gwarancją powodzenia.

Oznaczenia: **Fakt** opisuje sprawdzony kod, dokument lub wynik polecenia. **Ocena/rekomendacja** jest propozycją audytu, a nie przyjętą decyzją właściciela. **Ryzyko** oznacza możliwy skutek wskazanego mechanizmu. Priorytety ustaleń: P1 — zagrożenie podstawowego przepływu lub wiarygodności danych; P2 — istotne przed oddaniem; P3 — usprawnienie. Osobno używam P0 w planie produktu jako zakresu koniecznego. Raport nie zmienia ADR-ów ani zakresu automatycznie.

## 1. Podstawa oceny i stan po ostatnich PR-ach

Przeczytano [AGENTS.md](../../../AGENTS.md), wszystkie dokumenty w `docs/` wraz z ADR-ami, sprawozdaniem MD/HTML i instrukcją zrzutów oraz cały kod `src/`, łącznie z testami i plikami README. Dodatkowo sprawdzono konfigurację kompilacji, testów, lintowania, zależności i stan zadań na GitHubie. Nie modyfikowano kodu aplikacji, konfiguracji ani katalogu referencji Figma.

Dokumentem nadrzędnym jest [karta tematu](../thesis-card.md), zwłaszcza cel pracy, rozdziały 3–5 i lista funkcjonalności. Wiążące są **ewidencja, analiza, PWA i architektura chmurowa**. Sama rozbudowa kreatora i odtwarzacza nie realizuje całego tematu. Lista technologii z karty dopuszcza uzasadnione zmiany; wzmianka o czerwcu jest historyczna, nie wyznacza aktualnego harmonogramu. Nie interpretuję opisu BaaS jako obowiązku dodania subskrypcji Realtime do jednoosobowego dziennika.

**Fakty po aktualizacji main — nie są zgłaszane jako braki:**

- [PR #7](https://github.com/AntoniKra/Martial-Arts-App/pull/7), zadanie #2: Home korzysta z zapisanych sesji; licznik ćwiczeń grupuje rundy po `workoutItemId`, a ukończenie ćwiczenia wymaga ukończenia jego kroków. Dowody: [HomePage](../../src/pages/HomePage.tsx), [obliczenia sesji](../../src/domain/workout-session/workoutSessionCalculations.ts), linie 62–107, testy mapperów Home/historii.
- [PR #8](https://github.com/AntoniKra/Martial-Arts-App/pull/8), zadanie #4: jasny motyw, wybór systemowy/użytkownika, zapis preferencji, inicjalizacja przed renderowaniem i testy kolorów już istnieją. Dowody: [ThemeProvider](../../src/features/theme/ThemeProvider.tsx), [themeStorage](../../src/features/theme/themeStorage.ts), [testy kolorów](../../src/features/theme/themeColors.test.ts). Nie jest to dowód dostępności każdego ekranu.
- [PR #10](https://github.com/AntoniKra/Martial-Arts-App/pull/10), zadanie #3: gong i Wake Lock są zaimplementowane, również obsługa odmowy API i porządkowanie zasobów. Dowody: [adapter audio](../../src/infrastructure/audio/webAudioWorkoutGong.ts), [adapter Wake Lock](../../src/infrastructure/wake-lock/browserScreenWakeLock.ts), ich testy oraz hooki odtwarzacza.
- [PR #11](https://github.com/AntoniKra/Martial-Arts-App/pull/11), zadanie #9: wspólna odmiana liczebników i etykiety bloków są naprawione. Dowody: [polishPlural](../../src/domain/language/polishPlural.ts), [etykiety bloków](../../src/domain/workout/workoutBlockLabels.ts).
- [PR #6](https://github.com/AntoniKra/Martial-Arts-App/pull/6): dodano sprawozdanie demonstracyjne, a nie backend czy kolejne funkcje produktu. [Sprawozdanie](../sprawozdanie-demo.md) ma jeszcze historyczne informacje opisane w sekcji 3.

W chwili sprawdzenia zadania #2–#4 są zamknięte, a [#5 — PWA](https://github.com/AntoniKra/Martial-Arts-App/issues/5) pozostaje otwarte i zgodnie z informacją właściciela jest realizowane. Plan poniżej przewiduje odbiór tej pracy, nie jej ponowne zlecenie. #5 obejmuje powłokę offline, fonty, instalowalność i bezpieczne aktualizacje; **nie obejmuje trwałego ponawiania zapisu sesji ani testu instalacji na telefonie przez HTTPS**.

## 2. Kod i architektura

### 2.1. Co warto zachować

**Fakty:**

1. Domena jest wydzielona z Reacta: [typy planu](../../src/domain/workout/workout.types.ts), [obliczenia planu](../../src/domain/workout/workoutCalculations.ts), [walidacja](../../src/domain/workout/workoutValidation.ts). Funkcje mają testy. Kreator używa reduktora, osobnych selektorów i fabryk zamiast jednego komponentu z całą logiką.
2. Są asynchroniczne [interfejsy repozytoriów planów](../../src/application/workout/workoutPlanRepository.ts) i [sesji](../../src/application/workout-session/workoutSessionRepository.ts). Integracje audio/Wake Lock również mają interfejsy. Adapter chmurowy można dołączyć bez przepisywania całego UI.
3. [Schemat planów](../../src/infrastructure/storage/workoutPlanStorageSchema.ts) i [schemat sesji](../../src/infrastructure/storage/workoutSessionStorageSchema.ts) walidują odczytane dane i wersje dokumentu; notatki mają normalizację i limit. To rzeczywista granica zaufania, nie samo rzutowanie JSON na typ TypeScript.
4. [Resolver timera](../../src/features/workout-player/utils/resolveRunningPlaybackAtTime.ts) oblicza czas z terminu końcowego, potrafi nadrobić wiele etapów. [Hook odtwarzania](../../src/features/workout-player/hooks/useWorkoutPlayback.ts) chroni nawigację numerem rewizji kroku. [Kontroler gongu](../../src/features/workout-player/utils/createWorkoutGongController.ts) scala serię nadrobionych przejść do jednego sygnału.
5. Historia przechowuje nazwy jako snapshoty. Plany i sesje są odrębne. UI ma tokeny motywów, widoczny fokus, elementy semantyczne i obsługę ograniczenia animacji; wspólne przyciski mają rozmiary dotykowe.

**Ocena:** to sensowny fundament małej aplikacji inżynierskiej. Nie rekomenduję nowego frameworka, globalnego store'a, event sourcingu ani przebudowy całego kreatora. Największe ryzyko leży dziś w kontrakcie sesji i niezawodności zapisu, nie w wyborze Reacta czy wyglądzie katalogów.

### 2.2. Ustalenia wymagające działania

**A1 — P1: sesja i możliwość ponowienia zapisu istnieją tylko w pamięci otwartego odtwarzacza.**

- **Fakt:** [recorder](../../src/features/workout-player/hooks/useWorkoutSessionRecorder.ts), linie 26–33, trzyma przebieg w referencjach; [auto-save](../../src/features/workout-player/hooks/useWorkoutSessionAutoSave.ts), linie 34, 113–128, przechowuje oczekującą sesję w `pendingSessionRef`. Przycisk ponowienia istnieje. [Widok odtwarzacza](../../src/features/workout-player/components/WorkoutPlayerView.tsx), linia 329, pozwala wrócić do planu w trakcie treningu. Nie ma trwałego dziennika oczekujących zapisów ani odtwarzania przebiegu po przeładowaniu.
- **Ryzyko:** błąd zapisu i opuszczenie strony mogą zniszczyć jedyną kopię wyniku. Po podłączeniu sieci problem będzie istotniejszy niż przy localStorage. Sam komunikat błędu i retry w aktualnym komponencie go nie rozwiązują.
- **Rekomendacja:** P0 dla trwałego zabezpieczenia **zakończonej, jeszcze niewysłanej sesji**, ze stabilnym UUID, przypisaniem do użytkownika, stanem „oczekuje na zapis” i ponowieniem po powrocie. Przy wyjściu z aktywnego treningu: jawne potwierdzenie zakończenia/porzucenia. Pełne wznowienie aktywnego treningu po odświeżeniu można odłożyć, ale trzeba to jasno opisać. To nie jest pełna synchronizacja offline wszystkich danych.

**A2 — P1: aktualny czas sesji nie jest całkowitym czasem wykonania, jeśli użytkownik wraca do etapów.**

- **Fakt:** [mergeTrackedStepResult](../../src/features/workout-player/utils/mergeTrackedStepResult.ts), linie 25–48, zachowuje lepszy wynik albo maksimum częściowych czasów dla danego kroku; nie sumuje kolejnych podejść. [Podsumowanie](../../src/domain/workout-session/workoutSessionCalculations.ts), linia 48, sumuje tak zachowane wartości wszystkich kroków, także odpoczynków.
- **Przykład wynikający z kodu:** ukończenie tej samej rundy 60 s dwukrotnie po cofnięciu wnosi do podsumowania 60 s tej rundy, nie 120 s. Mechanizm może być poprawny dla realizacji planu, ale nie dla czasu całej sesji.
- **Rekomendacja:** oddzielić rozliczenie pozycji planu od licznika rzeczywistego czasu uruchomionego timera. Nie wystarczy zmienić `max` na sumę: wtedy powtórzenia mogłyby sztucznie zmieniać realizację planu. Definicje w sekcji 4.

**A3 — P1: zakończenie osi odtwarzacza nie oznacza wykonania treningu.**

- **Fakt:** [useWorkoutPlayback](../../src/features/workout-player/hooks/useWorkoutPlayback.ts), linie 500–522, emituje `completed` po przejściu za ostatni krok również przy ręcznym pomijaniu. [WorkoutSession](../../src/domain/workout-session/workoutSession.types.ts), linie 22–31, nie ma statusu sesji; istnienie wpisu oznacza ukończenie. Recorder zapisuje taki wynik. Poprawiony licznik ćwiczeń pokazuje wówczas prawidłowo np. 0% — ta naprawa pozostaje skuteczna.
- **Ryzyko:** przyszły cel oparty na samym `COUNT(sessions)` zaliczy także pusty przebieg. Nie twierdzę, że istniejący moduł celów liczy źle — tego modułu jeszcze nie ma.
- **Rekomendacja:** przed celami określić status i kwalifikację jednostki; zerowa wykonana praca oraz samo przewinięcie nie zaliczają treningu. Nie odkładać tego jako kosmetyki P1 backlogu.

**A4 — P2: pauza zaokrągla wewnętrzny czas w górę do pełnej sekundy.**

- **Fakt:** [useWorkoutPlayback](../../src/features/workout-player/hooks/useWorkoutPlayback.ts), linia 321, używa `Math.ceil`, a wznowienie w linii 351 buduje termin z tak zaokrąglonych sekund.
- **Wniosek statyczny:** pauza po 0,1 s z 60 s zachowuje 60 s; powtarzanie dodaje ułamki sekund. To nie jest zmierzony dryf przeglądarki, lecz konsekwencja kodu.
- **Rekomendacja:** zachować pozostałe milisekundy w stanie wykonawczym, zaokrąglać wyłącznie prezentację. Dodać test rzeczywistej sekwencji start/pauza/wznów, nie tylko czystego resolvera.

**A5 — P2: data historii może oznaczać moment wznowienia przeglądarki, a nie koniec treningu.**

- **Fakt:** po nadrobieniu zakończonego treningu [emitElapsedTransitions](../../src/features/workout-player/hooks/useWorkoutPlayback.ts), linia 145, emituje aktualne `nowMs`; [recorder](../../src/features/workout-player/hooks/useWorkoutSessionRecorder.ts), linia 102, zapisuje je jako `completedAt`; [mapper historii](../../src/features/workouts/mappers/workoutSessionHistoryListItemMapper.ts), linie 18–20, wyświetla tę datę.
- **Ryzyko:** powrót po północy może przypisać wpis do innego dnia. Staje się to błędem celów tygodniowych, jeśli dzień będzie wyprowadzany z tej wartości.
- **Rekomendacja:** utrwalić osobno dzień treningu i strefę czasową; koniec wyliczać z rzeczywistej osi czasu, a czas odbioru/zapisu przechowywać osobno. Ręczny wpis z samą datą nie potrzebuje fikcyjnej godziny 00:00.

**A6 — P1 dla finalnej wersji: chmura pozostaje planem, nie integracją.**

- **Fakt:** [fabryka planów](../../src/app/createWorkoutPlanRepository.ts) i [fabryka sesji](../../src/app/createWorkoutSessionRepository.ts) tworzą adaptery localStorage. [Katalog Supabase](../../src/infrastructure/supabase/README.md) opisuje przyszłą implementację; [supabase/README](../../supabase/README.md) przyszłe migracje. [Router](../../src/app/router.tsx), linie 19–25, zawiera placeholdery edycji, osobnego podglądu, raportu i feedbacku. **Podgląd w kreatorze już działa.** Brakuje ścieżek konta, ręcznego wpisu, szybkiego stopera, celów i profilu.
- **Ocena:** to przewidziana luka zakresu, nie dowód błędnych polityk RLS. Bez uruchomionego backendu nie da się jeszcze potwierdzić izolacji danych ani zgodności z chmurową częścią tematu.
- **Rekomendacja:** pierwszy pełny przepływ chmurowy w tygodniu 1; nie zaczynać od dekoracyjnego dashboardu na fikcyjnych danych.

**A7 — P2: snapshoty i kontrakty wymagają doprecyzowania przy migracji.**

- **Fakt:** [typ wyniku kroku](../../src/domain/workout-session/workoutSession.types.ts) zachowuje nazwę, ale nie `combinationId`; identyfikator nie przechodzi przez [typ kroku odtwarzania](../../src/features/workout-player/types/workoutPlayback.types.ts) i [mapper wyniku](../../src/features/workout-player/mappers/mapPlaybackStepToSessionStepResult.ts). Plan ma odnośnik do kombinacji. To rozbieżność z wymaganiem AGENTS.md, aby zachować go, gdy jest dostępny.
- **Rekomendacja:** snapshot nazwy oraz stabilny identyfikator/kod ćwiczenia przenosić przy wykonaniu. Nie rekonstruować historii z obecnej wersji planu. Usunięcie planu nie może kasować sesji. Przy bibliotece statycznej obecne tekstowe ID wymagają jawnego mapowania, jeżeli przyszła tabela użyje UUID.
- **Fakt:** lokalne repozytoria odczytują i zapisują cały dokument; walidacja jednej niepoprawnej sesji może przerwać odczyt zbioru. **Ocena:** wystarczające na prototyp, ale nie wzorzec zapisu całej historii do jednego rekordu w chmurze. Ewentualny import danych lokalnych powinien być świadomy, jednorazowy i odporny na duplikaty, bez przypisywania ich automatycznie pierwszemu zalogowanemu kontu.

**A8 — P2/P3: testy i jakość UI mają granice, mimo zielonego zestawu.**

- **Fakt:** [konfiguracja Vitest](../../vite.config.ts) uruchamia `src/**/*.test.ts` w środowisku Node. Są także testy statycznego renderowania, ale nie ma pełnych testów interakcji przeglądarki, hooków przebiegu sesji ani integracji SQL/RLS. Zielone testy gongu używają atrap API, nie głośnika telefonu.
- **Fakt:** lint ma 21 ostrzeżeń. [Konfiguracja ESLint](../../eslint.config.js) jawnie uzasadnia tymczasowe ostrzeżenia dotyczące referencji i ustawiania stanu w efektach. **Rekomendacja P2:** domknąć je przy zmianach dostępu do danych i hooka timera, pod osłoną testów zachowania; nie wykonywać hurtowego refaktoringu tylko dla wyglądu kodu.
- **Fakt:** [nawigacja](../../src/components/layout/NavigationLink.tsx) zawiera etykiety 9 px; przyciski otwierające edycję notatki i usuwanie w [karcie historii](../../src/features/workouts/components/WorkoutHistoryCard.tsx) mają tekst 11 px i nie deklarują minimalnej wysokości ani wewnętrznego odstępu. **Ocena P2:** sprawdzić ich rzeczywisty obszar dotyku oraz dostępność gotowych ekranów w obu motywach i przy powiększeniu. Test kontrastu oznaczeń dyscyplin nie obejmuje całej aplikacji.
- **Fakt:** `npm audit --json` zgłosił 12 pozycji moderate, 0 high i 0 critical, w łańcuchu narzędzi ESLint/TypeScript ESLint/minimatch. **Rekomendacja P3:** osobna kontrolowana aktualizacja narzędzi; nie używać automatycznie `audit fix --force`. Liczba obejmuje pakiety zależne i nie oznacza 12 niezależnych podatności aplikacji dostępnych przez UI.

## 3. Zakres: czego brakuje, co uprościć

**Fakty o niespójnościach dokumentacji:**

- [mvp-scope](../mvp-scope.md) wymaga edycji planów, feedbacku i ponowienia zapisu w rdzeniu, lecz [backlog](../backlog.md) umieszcza je w P1. Backlog nadal wymienia naprawy Home, motywu, gongu i Wake Lock jako pracę do wykonania.
- [Specyfikacja playera](../workout-player-spec.md) przewiduje odzyskiwanie po odświeżeniu, a zakres finalny odkłada je do rozwoju. Specyfikacja przycisku „poprzedni” opisuje restart bieżącego etapu, następnie cofnięcie; kod przechodzi od razu do poprzedniego kroku i blokuje przycisk na pierwszym.
- [Model domeny](../domain-model.md), [przepływy](../user-flows.md) i stary fragment [modelu bazy](../database-model.md) nie są w pełni uzgodnione z oddzielnymi, wielokrotnie uruchamianymi planami i sesjami. Stare `workouts` łączy plan i wykonanie w jednym cyklu statusów. Aktualny dokument bazy uczciwie oznacza ten fragment jako wymagający przeprojektowania.
- [Feedback](../feedback-system.md) ma więcej skal niż aktualny zakres finalny. [Architektura](../architecture.md) wymienia biblioteki docelowe, gdy zakres część wyborów nadal uznaje za otwarte.
- Nowe [sprawozdanie MD](../sprawozdanie-demo.md) i [HTML](../sprawozdanie-demo.html) nadal zapowiadają anonimowe konto, gong i Wake Lock; anonimowość jest sprzeczna z [ADR 0002](../adr/0002-email-password-and-google-auth.md), a dwie pozostałe funkcje są już wdrożone. Także oba README dotyczące Supabase nadal wspominają anonimowość. HTML ma historyczną datę 26 lipca 2026. To materiał roboczy, nie aktualny dowód walidacji.

**Rekomendowany P0 finalnej wersji:** konto zgodne z ADR 0002, migracje i RLS, jeden dziennik dla trzech źródeł, przegląd/edycja/usunięcie wpisów, istniejące plany z podstawową edycją i usuwaniem, wiarygodne czasy i statusy, trwałe zabezpieczenie wyniku, prosty cel liczbowy, historia wagi, minimalna analiza opisana w sekcji 6, odbiór PWA, publiczna wersja demonstracyjna i badania. Istniejących funkcji nie trzeba projektować od nowa.

**Proponowane ograniczenia wymagające zatwierdzenia:** przenieść oceny poszczególnych ćwiczeń z rdzenia do dodatków; zostawić opcjonalne RPE i notatkę. Odłożyć ±15 s, wielowymiarowy feedback, zaawansowane porównania ćwiczeń, powiadomienia, pełną synchronizację offline, prywatną bibliotekę i tryb siłowy. Zachować prosty przycisk „Zakończ wcześniej” z potwierdzeniem — jest potrzebny do uczciwego wpisu częściowego. Nie budować osobnego systemu planowania w kalendarzu: zapisany plan jest szablonem wielokrotnego użycia, cel jest zobowiązaniem liczbowym na okres.

**Dlaczego:** pełny, mały przepływ ewidencji i analizy ma większą wartość dla tematu pracy niż wiele niedokończonych wariantów ocen. Uproszczenia nie mogą usuwać chmury, izolacji kont, PWA ani analizy. Ewentualne ograniczenie Google wymaga osobnej zmiany przyjętego ADR; nie traktuję go jako milcząco usuniętej funkcji.

Do rozstrzygnięcia na początku: zakres trwałego odzyskiwania, semantyka „poprzedni”, źródła sesji i miary, model bazy, zakres feedbacku, hosting. Decyzje zapisać w kolejnych wolnych ADR-ach po uzgodnieniu; numer 0003 jest przewidziany w zadaniu #5. W tym PR nie tworzę konkurencyjnych decyzji.

## 4. Otwarte decyzje: dodawanie i dane treningu

### D1. Trzy wejścia, jeden wpis dziennika — rekomenduję, z różnym poziomem szczegółów

- **Szybki stoper:** dyscyplina, liczba rund, czas pracy i odpoczynku; ten sam silnik czasu co plan. Konfiguracja tworzy chwilową oś wykonania, bez obowiązku zapisywania sztucznego planu na liście.
- **Plan:** wybór zapisanego planu i jego wykonanie; sesja otrzymuje snapshot. Zakończenie treningu nie usuwa szablonu.
- **Ręczny wpis:** data, dyscyplina, kategoria, czas; opcjonalne RPE i notatka. Nie generuje fikcyjnych rund, procentu realizacji ani dokładnych godzin, których użytkownik nie podał.

Wspólna encja `workout_sessions` ma `source = plan | quick_timer | manual` i wspólny ekran historii. „Jeden typ wpisu” nie znaczy „identyczne wymagane pola i szczegóły”. Istniejący typ wymagający `workoutPlanId`, obu timestampów i kroków nie wystarczy; potrzebne są warianty źródeł z walidacją ich warunków.

**Alternatywy:** tylko plan + ręczny wpis to sensowny wariant awaryjny zakresu, ale pomija wygodny przypadek treningu interwałowego z karty tematu; wymaga akceptacji właściciela. Trzy osobne dzienniki komplikują cele i korekty danych. Jeden ogromny formularz dla wszystkich wymusza niepotrzebne pola i utrudnia użycie na telefonie.

### D2. Dane po treningu — minimum potrzebne do późniejszych odpowiedzi

**Rekomendowany zapis:**

1. Obowiązkowo: UUID, właściciel, źródło, dzień treningu, dyscyplina, kategoria, czas trwania, status. Dla timera dane powstają automatycznie; dla wpisu ręcznego są deklarowane. Kategoria z karty tematu nie jest tym samym co dyscyplina: proponuję mały słownik `technique`, `pads`, `bag`, `sparring`, `conditioning`, `mixed`. Dla wieloblokowego planu domyślnie `mixed`; szczegóły pozostają w krokach. Ostateczne etykiety uzgodnić z użytkownikiem.
2. Opcjonalnie: RPE 0–10 z opisami skali, notatka do 1000 znaków. `null` oznacza brak odpowiedzi, 0 jest poprawną odpowiedzią RPE. Nie wpisywać domyślnie środka skali i nie uzależniać zapisu sesji od feedbacku.
3. Dla sterowanego treningu: snapshot nazwy planu/ćwiczeń, stabilne identyfikatory, konfiguracja oraz wyniki kroków. Wpis ręczny nie musi mieć kroków.
4. Ewentualna ocena wykonania 1–5 dotyczy **ćwiczenia raz po jego rundach**, a nie każdej rundy. Jest opcjonalna i edytowalna w podsumowaniu; nie wstrzymuje odpoczynku. Pominięte i nieocenione ćwiczenia nie wchodzą do średnich, braku nie zamienia się na zero.

**Alternatywy:** sama notatka jest najtańsza i wystarcza do dziennika, ale nie daje ustrukturyzowanego opisu odczuwanego wysiłku. RPE + oceny ćwiczeń zwiększają możliwości, lecz także liczbę interakcji i nieporównywalnych danych. Koncentrację, dyskomfort, realizację celu jakościowego i „odczuwany postęp 1–7” odłożyć: nie ma jeszcze określonej analizy, która uzasadniałaby koszt zbierania tych danych.

RPE nazywać subiektywną oceną wysiłku. Nie przedstawiać go jako obiektywnej jakości techniki ani dowodu poprawy formy. Na tę wersję nie rekomenduję syntetycznego „wyniku zawodnika” ani wskaźnika obciążenia z mnożenia czasu przez RPE bez ustalonego protokołu pomiaru.

### D3. Status, czas i dzień — kontrakt przed implementacją statystyk

**Rekomendacja:**

- Status sesji: `completed` — zakończona bez pominiętej pracy planu; `partial` — zakończona wcześniej lub z pominięciami, ale z wykonaną pracą; `abandoned` — bez wykonanej pracy. Wpis ręczny jest deklaracją wykonanego treningu z dodatnim czasem. Pominięcie samej przerwy nie obniża ukończenia ćwiczenia.
- Jednostka do celu: jedna unikalna sesja `completed` albo `partial` z dodatnią wykonaną pracą; ręczna z dodatnim deklarowanym czasem. Sama przerwa, pusty przebieg i `abandoned` nie liczą się. Historia pokazuje częściowość. To jawna definicja regularności, nie twierdzenie, że 1 minuta zastępuje pełny trening. Nie dodawać arbitralnego progu 10 minut bez uzasadnienia.
- `duration_seconds`: dla timera czas, w którym odtwarzanie biegło, **z odpoczynkami i powtórzeniami, bez pauz**; dla wpisu ręcznego deklarowany czas całej jednostki. Nazwa w UI: „Czas treningu”. Opcjonalne `work_seconds` obejmuje tylko pracę; dla wpisu ręcznego może być nieznane. Zegar nie dowodzi, że użytkownik faktycznie ćwiczył — źródło pomiaru pozostaje widoczne.
- Realizacja planu pozostaje osobną miarą: ukończone ćwiczenia / zaplanowane ćwiczenia, ewentualnie ukończone rundy / zaplanowane rundy. Nie wyliczać jej z czasu ani RPE. Dla ręcznego wpisu: „nie dotyczy”, nie 100%.
- `workout_date` jest datą w strefie użytkownika utrwaloną przy zapisie; `timezone` zachowuje kontekst. Dla timera domyślnie dzień rozpoczęcia, nawet gdy kończy po północy. Późniejsza zmiana strefy profilu nie przesuwa dawnych treningów. `created_at` oznacza zapis, nie dzień wykonania.

**Alternatywy:** liczyć do celów tylko sesje w 100% zgodne z planem — prostsza nazwa „ukończony”, ale dyskryminuje skrócone treningi i nie daje porównywalności z ręcznymi. Czas `koniec − początek` jest prosty, lecz zawiera pauzy; suma najlepszych wyników kroków jest miarą realizacji, lecz gubi powtórzenia. Dlatego potrzebne są odrębne wartości. Granice czasu i liczby rund ustalić jako rozsądne limity wejścia, aby błędne dane nie tworzyły ogromnej osi odtwarzania.

## 5. Supabase: rekomendowany szkic modelu i RLS

To **propozycja projektu**, nie gotowa migracja. [ADR 0001](../adr/0001-supabase-as-baas.md) rozstrzyga wybór Supabase; [ADR 0002](../adr/0002-email-password-and-google-auth.md) rozstrzyga sposoby logowania. Proponuję oddzielne plany, sesje, cele i pomiary wagi. Nie przenosić starej tabeli `workouts` z cyklem draft → completed bez zmian.

### D4. Tabele i integralność

Wszystkie rekordy użytkownika mają właściciela; UUID obiektów tworzone po stronie klienta umożliwiają ponowienie zapisu. Dane konfiguracyjne i demo pozostają oddzielone od danych konta.

| Tabela | Najważniejsze pola i reguły |
| --- | --- |
| `profiles` | `id uuid PK → auth.users`, opcjonalne `display_name`, `default_discipline_key`, `timezone`, timestampy. Bez kopii hasła ani zbędnych danych biometrycznych. |
| `weight_measurements` | `id`, `user_id`, `measured_on date`, `weight_kg numeric(5,2) > 0`, timestampy; propozycja `UNIQUE(user_id, measured_on)` — jeden korygowalny pomiar dziennie. |
| `workout_plans` | `id`, `user_id`, nazwa, `discipline_key`, opcjonalny cel opisowy, `revision`, timestampy; szablon wielokrotnego użycia. |
| `workout_plan_blocks` | `id`, `user_id`, `plan_id`, `block_type`, `position >= 0`, unikalna pozycja w planie. |
| `workout_plan_items` | `id`, `user_id`, `block_id`, `position`, `item_type`, `exercise_mode`, snapshot nazwy, opcjonalny identyfikator biblioteki, parametry rund/przerw lub czas ciągły; warunki CHECK zależne od wariantu. |
| `workout_sessions` | `id`, `user_id`, opcjonalny `plan_id`, `source`, `status`, `workout_date`, `timezone`, dyscyplina, kategoria, `name_snapshot`, `duration_seconds`, opcjonalne `work_seconds`, `started_at`, `ended_at`, `rpe`, `note`, `revision`, timestampy. Dla manual godziny i plan mogą być NULL. |
| `workout_session_steps` | `id`, `user_id`, `session_id`, `position`, logiczny identyfikator ćwiczenia w snapshotcie, typ kroku/bloku, nazwa i identyfikator biblioteki, runda, planowany czas, wykonanie i wynik; unikalna pozycja w sesji. Bez zależności od istnienia bieżącego elementu planu. |
| `training_goals` | `id`, `user_id`, `starts_on`, `ends_on`, `target_sessions > 0`, opcjonalna dyscyplina, nazwa; koniec nie wcześniej niż początek. Postęp wyliczany z dziennika, nie edytowalny licznik. |

Jeżeli oceny ćwiczeń zostaną zaakceptowane, dodać `session_exercise_ratings(user_id, session_id, exercise_snapshot_id, rating)` z unikalnością na ćwiczenie w sesji i zakresem 1–5. Nie powielać jednej oceny w każdej rundzie. Historia czasu wymaga licznika całego przebiegu albo sumowania podejść niezależnie od najlepszego wykonania kroku; nie wystarczy bez zmian skopiować obecnego `stepResults`.

**Integralność, którą należy zaprojektować razem z tabelami:**

- Każdy rodzic udostępnia `UNIQUE(id, user_id)`, a dzieci mają złożony FK, np. `(session_id, user_id) → workout_sessions(id, user_id)`. RLS na samym `user_id` dziecka nie zapobiegnie wskazaniu rodzica innego konta, jeżeli relacja nie sprawdza właściciela.
- Usunięcie sesji usuwa jej kroki/oceny; usunięcie planu usuwa bloki i elementy, **nie historię**. Dla opcjonalnej relacji sesja–plan wyzerować tylko `plan_id` i zachować `user_id` oraz snapshot. Nie stosować bezmyślnie `SET NULL` do obu kolumn złożonego FK. Sesja o źródle `plan` musi pozostać poprawna po wyzerowaniu tej relacji. Alternatywą jest archiwizacja planu.
- Sprawdzić dozwolone słowniki, zakresy RPE i ocen, długość notatki, dodatnie czasy dla wykonanych sesji, `0 <= work_seconds <= duration_seconds`, zgodność źródła z polami, porządek dat, unikalność pozycji. Własność i wartości obowiązują także przy bezpośrednim wywołaniu API, nie tylko formularzu.
- Sesja z krokami zapisuje się **w jednej transakcji**, np. przez wąską funkcję RPC. Awaria nie może pozostawić samego nagłówka. Serwer weryfikuje przesłane podsumowanie, status i szczegóły; nie ufa procentowi realizacji z UI. Pełnego czasu deklarowanego przez człowieka nie da się zweryfikować automatycznie.
- Ponowienie używa tego samego UUID. Ten sam właściciel i ten sam pierwotny payload dają ten sam rezultat; inne dane pod tym ID wymagają jawnej korekty/konfliktu, a nie nadpisania historii. Nie używać ślepego upsert do ponowień. Edycja notatki/RPE nie powinna zostać cofnięta przez spóźniony retry. `revision` pomaga wykryć równoległe edycje.
- Indeksy: sesje `(user_id, workout_date)`, waga `(user_id, measured_on)`, cele według właściciela/okresu oraz klucze rodziców i kolejności. Listę historii stronicować; wykresów nie liczyć wyłącznie z aktualnie pobranej strony.

**Alternatywy:** plan i snapshot wykonania w walidowanym JSONB przy relacyjnych nagłówkach sesji/cełów/wagi to dopuszczalne uproszczenie. Zmniejsza liczbę tabel, lecz przenosi sporo integralności do walidacji serwerowej i utrudnia przekrojowe zapytania. Rekomenduję model relacyjny powyżej jako czytelniejszy do rozdziału 3 i testów RLS. Nie rekomenduję pojedynczego JSON-a całego konta ani pełnej biblioteki tabel technik, wariantów i serii siłowych na ten termin. Istniejący katalog ćwiczeń może pozostać wersjonowany w kodzie; jeśli trafi do bazy, użytkownik ma odczyt, a aktualizacje wykonują kontrolowane migracje.

### D5. Polityki dostępu i operacje

**Rekomendacja:** RLS na każdej tabeli użytkownika, brak dostępu roli `anon`, dostęp właściciela dla `authenticated`. Poniższy wzorzec dotyczy własności, nie uprawnia automatycznie do zmiany każdej kolumny:

```sql
alter table public.workout_sessions enable row level security;

create policy sessions_read on public.workout_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy sessions_insert on public.workout_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy sessions_update on public.workout_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy sessions_delete on public.workout_sessions
  for delete to authenticated
  using ((select auth.uid()) = user_id);
```

Dla `profiles` porównanie dotyczy `id`, dla pozostałych tabel `user_id`. UPDATE potrzebuje widoczności SELECT, a `WITH CHECK` zabezpiecza również nowy stan wiersza. Widoki analityczne muszą respektować kontekst wywołującego (`security_invoker`); zwykły widok może ominąć oczekiwaną ochronę. Podstawa tych zasad: [oficjalna dokumentacja RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Projektowe uzupełnienia:** jawne uprawnienia tabel/kolumn i funkcji; niezmienność właściciela oraz snapshotów wykonania zabezpieczyć także grantami/triggerem. Dopuszczać korekty notatki/RPE, a dla ręcznego wpisu daty/kategorii/czasu. Korekta metadanych nie ma przepisywać historycznej nazwy ćwiczenia z aktualnego katalogu. Domyślnie funkcje `SECURITY INVOKER`; ewentualna funkcja uprzywilejowana wymaga osobnego uzasadnienia, ograniczonego EXECUTE, ustalonego `search_path` i sprawdzenia konta. Wartości właściciela nie brać z dowolnego parametru bez porównania z tożsamością sesji.

Nie używać service-role w przeglądarce ani w testach mających dowodzić RLS. Logowanie: e-mail/hasło z potwierdzeniem i resetem oraz Google zgodnie z ADR. Po zmianie konta czyścić pamięć zapytań i oddzielać lokalne oczekujące sesje według właściciela; nigdy nie wysyłać wyniku konta A jako B. Cache service workera z #5 ma zawierać powłokę, nie odpowiedzi prywatnego API. Obsłużyć wygasłe logowanie podczas zapisu i ponowienie po odzyskaniu sesji.

**Alternatywa:** autoryzacja tylko w osobnym backendzie może być poprawna, ale tworzy dodatkową warstwę do utrzymania i testowania. Dla tego projektu Supabase Auth + RLS + małe transakcyjne funkcje są prostsze. Sam filtr `user_id` w zapytaniu Reacta nie jest zabezpieczeniem.

## 6. Analiza postępów, cele i profil

### D6. Co uczciwie nazwać analizą

**Rekomenduję ekran „Aktywność i cele” z minimum:**

1. Liczba zapisanych jednostek i łączny czas w tygodniach, zakres ostatnich 8 tygodni, filtr dyscypliny i źródła. Pokazać także tygodnie z zerem wpisów; etykieta „brak zapisanych treningów” nie oznacza pewności, że osoba nie ćwiczyła.
2. Postęp konkretnego celu liczbowego oraz widoczne daty okresu. Bieżący niepełny tydzień oznaczyć; porównanie procentowe robić dla równych okresów. Gdy poprzedni wynik wynosi zero, nie pokazywać nieskończonego wzrostu.
3. Rozkład kategorii/dyscyplin i ewentualna seria RPE z liczbą odpowiedzi. RPE brakujące wykluczać z średniej i pokazywać pokrycie, np. „oceniono 3 z 5 treningów”. Mniej odpowiedzi może zmienić wynik bez zmiany wysiłku.
4. Osobno wykres zapisanych pomiarów masy ciała. Dla planu raport realizacji ćwiczeń/rund; nie porównywać tego procentu z ręcznym wpisem bez planu.

To analiza regularności, objętości i deklarowanych odczuć. **Nie dowodzi poprawy techniki, kondycji ani skuteczności w walce.** W pracy można wprost zawęzić operacjonalizację „postępów” do realizacji celów i trendów rejestrowanej aktywności. Jeśli promotor wymaga oceny poprawy sportowej, potrzebny jest osobny, powtarzalny test zewnętrzny; same dane aplikacji jej nie identyfikują.

**Alternatywy:** tylko liczba treningów na karcie profilu to zbyt mało dla analizy w tytule. Zaawansowane trendy jakości ćwiczeń wymagają stałego identyfikatora, podobnej konfiguracji i odpowiedniej liczby obserwacji; odłożyć. Jeśli pozostaną średnie ocen, zawsze pokazać liczebność i nazwać je samooceną, bez mieszania z realizacją. Nie generować porad treningowych, przewidywań kontuzji ani jednego rankingu formy.

### D7. Cel: konkretna liczba jednostek w ustalonym okresie

Przykład: „8 treningów boksu od 9 do 29 listopada”. Pola: dodatnia liczba docelowa, początek, koniec, opcjonalna dyscyplina. Licznik obejmuje sesje spełniające D3 z `workout_date` w domkniętym okresie. Pasek: `min(100, 100 * liczba / cel)`; obok rzeczywista wartość, np. „9/8”. Nie ucinać informacji o przekroczeniu.

Cel opisowy planu, np. „praca nad obroną”, pozostaje notatką, a nie automatycznym celem liczbowym. Edycja/usunięcie wpisu przelicza wynik; duplikat retry nie daje drugiej jednostki. Cele mogą mieć nakładające się okresy — jedna sesja może spełniać dwa cele, ale liczy się raz w każdym z nich. Nie potrzeba tabeli ręcznych przydziałów sesji do celu ani przechowywania procentu postępu.

**Alternatywy:** cel minutowy jest użyteczny, lecz bardziej zależy od poprawnej definicji czasu; można dodać później. Automatyczny kalendarz cyklicznych planów i serie dni bez przerwy komplikują model i nie wynikają z wymaganego paska postępu. Cele wagi nie są potrzebne do zrealizowania profilu.

### D8. Profil i waga

Profil: opcjonalna nazwa, domyślna dyscyplina, strefa czasowa i skrót statystyk z tego samego dziennika. Pomiar: data oraz masa w kg z precyzją do 0,01; ostatnia waga to pomiar z najpóźniejszą **datą pomiaru**, nie ostatnio dodany rekord. Dopuścić korektę i usunięcie. Brak pomiarów daje czytelny stan pusty, nie 0 kg. Nie łączyć wagi obowiązkowo z każdą sesją.

**Alternatywy:** pojedyncza nadpisywana `current_weight` jest prostsza, ale niszczy historię wymaganą w aktualnym zakresie. Pełny profil biometryczny zwiększa koszt i ilość danych bez określonego zastosowania. Rekomendacja: bez obowiązkowego wieku, płci, wzrostu, BMI, norm, kategorii wagowych i porad redukcji masy. Wykres pokazuje dane użytkownika, nie ocenę zdrowia.

## 7. Testy i pytania badawcze do rozdziału 5

### 7.1. Wyniki wykonane w tym audycie

Na wskazanym SHA, w oddzielnej kopii poza roboczym repozytorium, po `npm ci --ignore-scripts`:

| Polecenie | Wynik |
| --- | --- |
| `npm run typecheck` | PASS, kod wyjścia 0 |
| `npm run lint` | PASS, 0 błędów, 21 ostrzeżeń |
| `npm test -- --no-cache` | PASS, 13 plików, 133 testy zaliczone, 0 niezaliczonych, 0 pominiętych |
| `npm run build` | PASS, 137 przetworzonych modułów; JS 442,57 kB / gzip 125,95 kB, CSS 32,07 kB / gzip 6,88 kB |
| `npm audit --json` | 12 moderate, 0 high, 0 critical; uwaga A8 |

Nie wykonano w tym audycie badań SUS, pomiarów Lighthouse, testów na fizycznych telefonach ani RLS na działającej bazie. Nie przedstawiam propozycji progów poniżej jako osiągniętych wyników. Wielkość paczki nie jest pomiarem szybkości ekranu. Nie zmieniano testów ani reguł, aby uzyskać PASS.

### 7.2. Pytania badawcze i sposób odpowiedzi

**PB1. Czy trzy sposoby rejestracji dają spójny i trwały dziennik przy zachowaniu izolacji kont?**

- Testy jednostkowe kontraktów: plan/szybki/manual, brak ocen, RPE=0, częściowe wykonanie, same pominięcia, przerwy, powtórzenia, data/strefa. Testy integracyjne repozytoriów i transakcji na testowej bazie.
- Scenariusze E2E: utworzenie i odczyt na drugim urządzeniu, edycja, usunięcie, błąd sieci, utrata odpowiedzi już po zapisie serwera, wielokrotne retry, ponowne otwarcie, wygaśnięcie logowania, zmiana konta. Oczekiwany wynik: dokładnie jeden właściwy wpis, zgodne wartości, brak cudzego wyniku.
- RLS: konta A i B oraz niezalogowane żądanie. Próby SELECT/INSERT/UPDATE/DELETE na każdej tabeli, podmiana `user_id`, FK do rodzica B, dostęp po znanym UUID, zagnieżdżone relacje, widoki, RPC. Sprawdzać zawartość odpowiedzi **i stan bazy po operacji**, nie tylko status HTTP; brak widocznego wiersza może być poprawną odmową.
- Test migracji od pustej bazy, test zachowania historii po zmianie/usunięciu planu, test atomowości przy błędnym kroku. Kryterium wydania: wszystkie scenariusze krytyczne zaliczone; jakikolwiek dostęp do cudzego rekordu blokuje wydanie.

**PB2. Na ile odtwarzacz zachowuje poprawny czas i przebieg w warunkach mobilnych?**

- Kontrolowany zegar: granica etapu, wiele etapów pominiętych przez opóźnienie wywołań, 20 pauz w ułamku sekundy, poprzedni/następny, ponowne wykonanie, zakończenie i restart. Testować hook i zapis sesji, nie tylko obliczenie pozostałego czasu. Sprawdzić także zmianę zegara systemowego i opisać zachowanie.
- Fizyczny Android/Chrome i iPhone/Safari, w karcie i po instalacji: 30-minutowy scenariusz, tło 5 min, zgaszenie ekranu, powrót, odmowa Wake Lock i audio, ograniczenia energii. Zanotować wersję systemu, przeglądarki, urządzenie i ustawienia. Co najmniej 3 powtórzenia scenariusza na platformę.
- Proponowane kryteria inżynierskie: błąd granic w foreground do 1 s względem niezależnego zegara; po wznowieniu wykonania JS poprawny etap i czas do 1 s, bez narastającego błędu od liczby pauz; najwyżej jeden aktualny gong po nadrobieniu, bez serii zaległych sygnałów. Osobno raportować opóźnienie dźwięku i błąd logicznego czasu.
- Wake Lock wymaga widocznego, aktywnego dokumentu i może zostać cofnięty; nie gwarantuje dźwięku o czasie po uśpieniu telefonu. Wymaganie powinno dotyczyć poprawnego odtworzenia stanu po powrocie, a nie obietnicy natywnego działania w tle. Źródło ograniczeń API: [MDN — Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

**PB3. Czy użytkownik potrafi samodzielnie wykonać kluczowe zadania na telefonie?**

- Rekrutacja 5–8 osób trenujących sporty walki, różny staż; próba dogodnościowa, badanie eksploracyjne. Rekrutować od tygodnia 1, pilot na 1–2 osobach przed właściwym badaniem. Ustalić zgodę i anonimowe identyfikatory; do publikowanych materiałów używać danych testowych, bez haseł i rzeczywistej historii masy ciała.
- Zadania: dodać wczorajszy trening, uruchomić szybki stoper, wykonać plan i go skrócić, poprawić wpis, założyć cel, dodać pomiar wagi i odnaleźć wynik. Przygotować dane startowe i jednolitą instrukcję, zapisywać pomoc moderatora.
- Miary: sukces bez pomocy (licznik/mianownik), czas, liczba pomyłek i interwencji, komentarze, SUS po całej sesji. Przykładowy próg projektowy: przynajmniej 80% wykonuje każde podstawowe zadanie bez pomocy; przy małej próbie podać także surowe liczby. Nie dowodzi to reprezentatywności dla wszystkich zawodników.
- SUS: 10 pozycji, wynik 0–100, nie procent sukcesu. Punktacja: dla nieparzystych odpowiedź minus 1, dla parzystych 5 minus odpowiedź; suma razy 2,5. Podać wykorzystaną polską wersję i ewentualne ograniczenia tłumaczenia. Raportować rozkład/medianę, nie tylko jedną średnią. Podstawa metody: [John Brooke, SUS](https://hci-studies.org/methods-and-measures/downloads/SUS_Brooke1996.pdf).

**PB4. Czy użytkownik poprawnie rozumie prezentowane cele i trendy?**

- Zadania interpretacyjne na tej samej syntetycznej historii: ile sesji brakuje do celu, czy obecny tydzień można porównać z całym poprzednim, co znaczy brak RPE, czy 100% planu oznacza dobrą technikę, który pomiar jest ostatni.
- Mierzyć liczbę poprawnych odpowiedzi i typy błędów. Porównać obliczenia z ręcznie policzonym zbiorem kontrolnym: zero wpisów, granica tygodnia, północ, częściowa sesja, duplikat, korekta daty, usunięcie, brak ocen. Nie formułować hipotezy „aplikacja poprawia wyniki sportowe” — potrzebowałaby dłuższego badania i niezależnego pomiaru efektu.

### 7.3. Wydajność, RWD, PWA i materiał do pracy

- Trzy rozdzielczości E2E, np. 360×800, 768×1024, 1440×900: główne przepływy w obu motywach, brak poziomego przewijania, klawiatura, fokus, powiększenie 200%, cele dotykowe i ograniczenie animacji. Automatyczne testy dostępności uzupełnić ręcznymi.
- PWA: instalacja i otwarcie przez HTTPS na telefonach, ponowne wejście offline na podstronę, start już dostępnego planu/szybkiego stopera, brak wymuszonej aktualizacji w aktywnej sesji. Powłoka offline nie oznacza dostępności całej historii po wylogowaniu. Test #5 na localhost nie zastępuje odbioru mobilnego.
- Wydajność: produkcyjny build, powtarzalna sieć i urządzenie; Lighthouse 5 uruchomień dla zimnego startu, mediana i zakres wyników, oddzielnie mobilny i desktopowy profil. Dla operacji historii/zapisu co najmniej 30 prób, mediana i p95, jawny rozmiar syntetycznego zbioru, np. 1000 sesji; odróżnić czas API od widocznej reakcji UI. Proponowane budżety projektu: LCP do 2,5 s i CLS do 0,1 w zdefiniowanych warunkach; przekroczenia opisać z przyczyną. To założenia badania, nie uzyskane pomiary.
- Każdy wynik w rozdziale 5 powinien mieć identyfikator wymagania/scenariusza, SHA wersji, datę, środowisko, oczekiwanie, wynik, surowe dane i ograniczenia. Niezaliczone próby oraz poprawki z retestem pozostają widoczne. Nie używać zrzutów demonstracyjnych jako dowodu bezpieczeństwa, dokładności czasu czy użyteczności.

## 8. Kolejność prac na sześć tygodni

**Założenie planistyczne, nie deklaracja dostępności:** jeden wykonawca, około 25–30 godzin skupionej pracy tygodniowo, 150–180 godzin łącznie, z czego 20–25% na integrację, poprawki i rezerwę. Jeśli rzeczywista dostępność jest mniejsza, zakres trzeba zmniejszyć od razu. Brak danych o tempie autora nie pozwala obiecać terminu. Szczególnie obciążony jest tydzień 2: dla osoby poznającej Auth, SQL i RLS jego pełny zakres może wymagać więcej czasu. Najpierw kończyć trwały dziennik; w razie przekroczenia bramy uzgodnić ograniczenie szybkiej ścieżki lub edycji planów, a nie zabierać cały czas przeznaczony na badania. Prace w jednej kopii wykonywać kolejno, w małych PR-ach.

### Tydzień 1: 2–8 listopada — definicje i pierwszy zapis chmurowy

- Przyjąć D1–D8 lub jawne alternatywy, poprawić sprzeczności dokumentacji i kryteria odbioru. Zamknąć słowniki, znaczenie czasu/statusu, zakres feedbacku i uprawnienia edycji.
- Zaimplementować minimalne migracje, Auth e-mail, adaptery i test dwóch kont. Pierwszy scenariusz: zalogowany użytkownik zapisuje sesję, odczytuje ją po ponownym logowaniu, drugie konto jej nie widzi. Nie czekać na ukończenie wszystkich ekranów.
- Odebrać #5 w jego istniejącym zakresie, uzgodnić testy po podłączeniu backendu. Wybrać hosting i środowisko testowe; publiczne wdrożenie wykonuje właściciel. Zacząć rekrutację badania i listę scenariuszy.
- **Brama:** jedna działająca ścieżka do chmury i potwierdzona izolacja minimalnego modelu. Jeśli jej nie ma, nie rozpoczynać wykresów.

### Tydzień 2: 9–15 listopada — kompletny dziennik i niezawodny zapis

- Domknąć potwierdzenie e-mail, reset hasła, Google i zachowanie po wylogowaniu/zmianie konta.
- Ręczny wpis, szybki timer na wspólnym silniku, wykonanie planu; edycja/usuwanie sesji, podstawowa edycja/usuwanie planów. Historyczne snapshoty nie zależą od aktualizacji planu.
- Naprawić A1–A5 w zakresie przyjętego kontraktu: trwałe pending, idempotencja, częściowe wykonanie, rzeczywisty czas, pauza, dzień. Dodać testy tych zachowań i RLS do każdej dodanej tabeli.
- **Brama:** trzy źródła widoczne na drugim urządzeniu, retry bez duplikatu, brak utraty zakończonej sesji po błędzie i ponownym otwarciu. Jeżeli do 15 listopada zapis nie jest stabilny, odciąć oceny ćwiczeń, ±15 s i dodatkowe wykresy; nie odkładać problemu na koniec.

### Tydzień 3: 16–22 listopada — cele, profil i minimalna analiza

- Cel liczby sesji na okres; profil i datowane pomiary wagi; tygodniowe liczby/czasy z filtrami i uczciwymi stanami pustymi. Podsumowanie sesji z opcjonalnym RPE/notatką.
- Jeden zestaw obliczeń dla Home, dziennika, celu i analizy; pełne zakresy danych, nie tylko bieżąca strona listy. Testy dat, braków, częściowości, korekt i usunięcia.
- Próba urządzeń przez HTTPS: timer, instalacja, offline i aktualizacje. Nie czekać z iOS do tygodnia 6.
- **Brama:** demonstracja całego zakresu z karty tematu na danych konta, bez placeholderów w głównym przepływie.

### Tydzień 4: 23–29 listopada — integracja i zamrożenie funkcji

- E2E, pełna macierz RLS, błędy sieci, dostępność i trzy rozdzielczości. Naprawy języka i nawigacji oparte na rzeczywistych problemach, bez redesignu.
- Pilot użyteczności, pomiary czasu i wydajności; przygotowanie powtarzalnego zestawu danych i instrukcji uruchomienia.
- **Brama 29 listopada:** zamrożenie funkcji. Brak P1 w krytycznym przepływie, gotowa wersja badawcza i skrypt demonstracji. Dodatkowe oceny można włączyć tylko jeśli cały rdzeń jest stabilny; inaczej pozostają poza wydaniem.

### Tydzień 5: 30 listopada–6 grudnia — badania i dowody

- Właściwe sesje użyteczności/SUS, zadania interpretacyjne, testy fizycznych urządzeń, wydajność. Zapisywać surowe wyniki i wersję; nie zmieniać aplikacji między uczestnikami bez odnotowania.
- Naprawić krytyczne problemy, wykonać celowane retesty. Opracować rozdział 5: wyniki, odpowiedzi na pytania, ograniczenia próby i metody. Zaktualizować dokumentację do rzeczywiście dostarczonego zakresu.
- **Brama:** komplet dowodów, także niepowodzeń; żadnych fikcyjnych wyników zastępujących niedokończony pomiar.

### Tydzień 6: 7–13 grudnia — stabilizacja wersji do oddania

- Pełna regresja, czysta instalacja i odtworzenie testowej bazy z migracji, sprawdzenie instrukcji, konfiguracji logowania i publicznej wersji przez właściciela.
- Ostateczne zrzuty, scenariusz prezentacji, zgodność rozdziałów 3–5 z kodem, lista ograniczeń i rozwoju do 6.3. Zablokować dokładną wersję oddawaną do oceny.
- **Brama:** działające konto → trzy źródła → dziennik → cele/analiza/profil, izolacja danych, test PWA na telefonie, wyniki i instrukcja powtórzenia badań.

**14–16 grudnia: bufor na awarie i formalności, bez nowych funkcji.** Jeśli wymagana funkcja nie przejdzie bramy, właściciel jawnie zatwierdza ograniczenie i jego opis w pracy; nie maskować braków rozszerzaniem prezentacji dema.

## 9. Rekomendacja końcowa i granice audytu

Najpierw ustalić kontrakt sesji i postępu, następnie dowieźć mały, bezpieczny przepływ chmurowy. Warto zachować obecny podział modułów, kreator i silnik deadline. Najpilniejsze ryzyka to utrata niezapisanego wyniku (A1), błędna interpretacja czasu i ukończenia (A2–A3) oraz brak chmurowego przepływu finalnej wersji (A6). P2 obejmuje precyzję pauzy, daty, snapshoty i brak pełnych testów interakcji; P3 — uporządkowanie zależności narzędziowych.

Audyt obejmuje kod i dokumentację podanego commita oraz wykonane kontrole lokalne. Nie jest certyfikacją bezpieczeństwa działającego wdrożenia ani badaniem skuteczności treningowej. Zmieniono wyłącznie ten raport. Commit i publikacja PR są częścią zlecenia; nie wykonywano wdrożenia produkcyjnego, nie odczytywano sekretów i nie zmieniano kodu aplikacji.
