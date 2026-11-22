# Specyfikacja odtwarzacza treningu

## Zasada podstawowa

Po jednym kliknięciu „Start” aplikacja automatycznie przeprowadza użytkownika przez całą oś treningu. Gong sygnalizuje przejścia. Komunikaty głosowe nie należą do MVP.

## Przygotowanie przed startem

- W Profilu, w sekcji „Ustawienia → Trening”, ustawienie „Przygotowanie przed startem” ma opcje 5, 10, 15 i 30 s. Domyślnie 10 s (decyzja właściciela z 8 listopada 2026).
- Wybór jest zapamiętany na urządzeniu w `localStorage`, z walidacją `zod/mini`. Brak, błędna wartość lub niedostępna pamięć oznacza 10 s.
- Pierwszy „Start” uruchamia przygotowanie. „Uruchom ponownie” od razu rozpoczyna nowe przygotowanie. Nie ma go po pauzie ani między etapami czy blokami.
- Pierścień pokazuje pozostałe sekundy dużymi cyframi i napis „PRZYGOTUJ SIĘ”. Przycisk z ikoną startu „Zacznij teraz” pozwala od razu rozpocząć pierwszy etap.
- Przygotowanie kończy się gongiem startowym rundy i automatycznym przejściem do pierwszego etapu. Bez dodatkowych dźwięków odliczania.
- Czas wynika z terminu końcowego i bieżącego zegara. Po powrocie z ukrytej karty odtwarzacz nadrabia także czas pierwszego i kolejnych etapów. Wake Lock działa tak jak podczas treningu.
- Przygotowanie nie jest etapem sesji: nie trafia do `stepResults`, czasu pracy ani `durationSeconds`. `startedAt` wskazuje start pierwszego etapu (termin końca przygotowania albo wcześniejsze „Zacznij teraz”). Wyjście podczas przygotowania nie zapisuje treningu.

## Timer

- duży okrągły timer;
- pierścień skraca się wraz z upływem czasu;
- liczba sekund jest zawsze widoczna;
- stan jest podpisany tekstem, nie tylko kolorem;
- obliczenia bazują na znaczniku końcowym (`deadline`), a nie na odejmowaniu 1 co sekundę;
- timer ma pozostać poprawny po chwilowym przełączeniu karty.

## Sterowanie

- `Poprzedni`: jeśli od początku bieżącego etapu minęły ponad 3 sekundy, etap zaczyna się od nowa; jeśli mniej, odtwarzacz cofa do poprzedniego etapu. Na pierwszym etapie zawsze restartuje bieżący (decyzja z 4 listopada 2026);
- `Następny`: jedno kliknięcie przechodzi dalej;
- `Pauza/Wznów`: jeden przycisk ze zmienną ikoną;
- `−15 s` i `+15 s`: zmieniają bieżące odliczanie;
- brak osobnego przycisku „Powtórz rundę”.

X „Zakończ trening” w prawym górnym rogu otwiera to samo okno „Zakończyć trening?” co „Wróć do planu” i przycisk wstecz. Trening jest wstrzymany, fokus trafia na „Wróć do treningu”; ten przycisk i Escape wznawiają tylko wcześniej biegnący trening. Kolejność: „Wróć do treningu”, „Pomiń resztę ćwiczenia (N rund)”, odstęp około 20 px, „Zakończ i zapisz”, „Porzuć bez zapisu…”.

N liczy pozostałe etapy pracy bieżącego ćwiczenia, także aktualną niedokończoną rundę, bez odpoczynków. Podczas odpoczynku liczy tylko kolejne rundy; dla pracy ciągłej wynosi 1. Samodzielna przerwa nie pokazuje pomijania ćwiczenia. Pominięcie zamyka okno i przechodzi do następnego elementu, zachowując wcześniejszą pauzę. „Zakończ i zapisz” bez kolejnego pytania zapisuje częściowy trening, jeśli była dokończona praca (`adr/0005-journal-entry-definitions.md`). Tylko „Porzuć bez zapisu…” otwiera dodatkowe potwierdzenie „Porzucić trening? Dane z tego treningu przepadną. Tej operacji nie można cofnąć.” z przyciskami „Porzuć” i „Wróć”. „Wróć” i Escape w potwierdzeniu wracają do okna zakończenia bez porzucenia danych. Zasady są wspólne dla planu i szybkiego stopera (issue #166, 15 listopada 2026).

## Zapowiedź kolejnego etapu (v8)

Pasek pod timerem zapowiada bezpośrednio kolejny etap osi. W trakcie przygotowania zapowiada pierwszy etap. Dla odpoczynku między rundami pokazuje „Następnie: Odpoczynek (MM:SS)”. Dla pozostałych etapów pokazuje nazwę, krótki typ i, gdy etap jest rundą, numer rundy. W ostatnim etapie pasek pokazuje „Koniec treningu”. Jeśli pasek pokazuje znaczniki rund, w trakcie odpoczynku między rundami wyróżnia nadchodzącą rundę.

## Oceny po treningu

Oceny ćwiczeń są zbierane po treningu na ekranie podsumowania (decyzja P1 z issue #72). W odtwarzaczu, także podczas przerwy, nie ma przycisku „Oceń”. Po ukończeniu albo wcześniejszym zakończeniu treningu z wykonaną pracą aplikacja zapisuje sesję, a następnie otwiera `/workout-sessions/:sessionId/feedback`.

Podsumowanie pokazuje elementy do poprawy z celem i skalą 1–5 lub opcją „Nie umiem ocenić”. Pozostałe ćwiczenia można opcjonalnie ocenić w rozwijanej sekcji „Pozostałe ćwiczenia”. Oceny trafiają do `exerciseRatings[].rating`. Oceniać można ćwiczenia z co najmniej jednym ukończonym etapem pracy. „Zapisz oceny” dopisuje oceny i notatkę do istniejącej sesji, po czym otwiera Historię. Do podsumowania można wrócić z wpisu w Historii.

## Gong i ekran

- gong końca pracy, gong startu rundy (końca odpoczynku) i gong zakończenia treningu mają różne brzmienia;
- ekran pozostaje aktywny przez Screen Wake Lock;
- po utracie widoczności aplikacja ponawia żądanie Wake Lock;
- brak obsługi API nie może przerwać treningu.

### Sygnały przed końcem rundy i przerwy

Decyzje właściciela i techniczne z 13–14 listopada 2026, issue #103 i #153:

- Trzy ostre stuknięcia jak kołatka bokserska „stuk-stuk-stuk”, wyraźnie inne od gongu, zapowiadają koniec etapu. Każde trwa 120 ms, z przerwą 200 ms, szybkim atakiem i bogatą barwą w zakresie 2–4 kHz. Wspólny tor wyjściowy ze wzmocnieniem i kompresorem podnosi głośność ostrzeżeń oraz rozpoznawalnych gongów bez przesterowania. Profil → Ustawienia → Trening ma przycisk „Odsłuchaj”: gest odblokowuje dźwięk, gra ostrzeżenie, a po chwili gong końca rundy. Nie zmieniamy `navigator.audioSession` ani obsługi trybu cichego iPhone’a (issue #166). Przygotowanie nie ma ostrzeżenia; gongi przejść zachowują swoje działanie.
- Jedynym miejscem wyboru jest Profil → Ustawienia → Trening. Ekran planu i ustawienia szybkiego stopera mają odnośnik do tej sekcji. Wybory dotyczą obu odtwarzaczy na tym urządzeniu.
- „Sygnał przed końcem rundy”: Wyłączony / 5 / 10 / 15 / 30 s, domyślnie 10 s. Dotyczy rund i pracy ciągłej, także ostatniego etapu. Zachowujemy dotychczasowy warunek: docelowy czas ćwiczenia musi być dłuższy niż 30 s.
- „Sygnał przed końcem przerwy”: Wyłączony / 5 / 10 s, domyślnie 10 s. Zapisany wybór, także „Wyłączony”, pozostaje bez zmian; nowa wartość domyślna obowiązuje przy braku zapisu (issue #166). Dotyczy odpoczynku między rundami (`roundRest`) i samodzielnej przerwy (`break`). Ostrzeżenie gra tylko, gdy etap jest dłuższy niż wybrany próg. Przerwa krótsza lub dokładnie równa progowi (np. 10 s przy sygnale 10 s) milczy, również po powrocie z tła. Decyzja koordynatora do PR #157: przy wejściu w taką przerwę gra już gong końca rundy; drugie brzmienie w tej samej chwili byłoby mylące.
- Ustawienia zapisują się w `localStorage` pod `combat-training.endWarnings` jako `{ round, rest }`, gdzie wartości to tekstowe liczby sekund albo `off`. Odczyt i zapis mają walidację `zod/mini`; brak, uszkodzenie lub niedostępna pamięć oznaczają wartości domyślne. Błąd zapisu przywraca te same wartości w formularzu i odtwarzaczu. Gdy nowego klucza jeszcze nie ma, dawny wybór `combat-training.endWarningEnabled = false` zachowuje wyłączony sygnał rundy. Przerwy otrzymują nową wartość domyślną (10 s).
- Odtwarzacz odczytuje ustawienia przy otwarciu, razem z przygotowaniem. Nie zmienia ich w aktywnym treningu.
- Sygnał gra raz, gdy podczas biegu zegara dokładny pozostały czas przechodzi z ponad wybrany próg na próg lub mniej. Obie próbki wynikają z terminu końcowego i bieżącego zegara, bez odliczania tyknięć ani zaokrąglania do sekund wyświetlacza.
- Po powrocie z tła obowiązuje ten sam próg, bez podwójnego ostrzeżenia. Jeśli w czasie nieobecności zmienił się etap, sprawdzenie dotyczy aktualnego, wyliczonego etapu, z jego terminem końcowym i czasem poprzedniej dokładnej próbki. Zakończone etapy nie odtwarzają zaległych ostrzeżeń. Opóźnienie większe niż 3 000 ms pomija sygnał (dla 10 s: mniej niż 7 000 ms pozostałego czasu); dokładnie 3 000 ms opóźnienia nadal pozwala go odtworzyć. Przykład: 2 × 40 s z przerwą 20 s, ostrzeżenie przerwy 10 s, ukrycie w 35. sekundzie i powrót po 16 s oznaczają 9 s przerwy oraz jedno ostrzeżenie. Reguła jest wspólna dla planu i szybkiego stopera.
- W pauzie sygnał nie gra. Wznowienie lub odzyskanie treningu z czasem pozostałym do progu włącznie nie odtwarza zaległego ostrzeżenia.
- Sygnały z jednego przeliczenia czasu są rozstrzygane razem, przed wznowieniem dźwięku. Należne ostrzeżenie bieżącego etapu ma pierwszeństwo przed gongiem nadrobionego przejścia, także gdy `AudioContext.resume()` kończy się asynchronicznie. Gra tylko wybrany sygnał; zakończenie całego treningu ma pierwszeństwo przed ostrzeżeniem. Pozostają limit spóźnienia 3 000 ms oraz odrzucenie sygnału, jeśli samo wznowienie dźwięku trwa co najmniej 1 000 ms.
- Korekta `+15 s` podnosząca czas ponad próg uzbraja sygnał ponownie. Korekta `−15 s` przeskakująca próg odtwarza go tylko podczas biegu i w granicy opóźnienia 3 000 ms. „Poprzedni” i restart etapu również uzbrajają sygnał ponownie.

## Odzyskiwanie aktywnego treningu

Decyzje właściciela i techniczne z 8 listopada 2026, issue #65 (Q8):

- Po zalogowaniu i potwierdzeniu adresu e-mail aplikacja sprawdza zapis dla bieżącego `uid`. Jeśli trening można odzyskać, od razu otwiera `/workouts/:workoutId/active`.
- Krótka przerwa nie zatrzymuje zegara. Przykład: w rundzie 2 z 3 zostało 1:20; po zamknięciu aplikacji na 40 s zostaje 0:40. Odtwarzacz nadrabia także kolejne etapy, według ich terminów końcowych. Nie odtwarza gongów z czasu nieobecności.
- Pauza zachowuje dokładny pozostały czas w milisekundach. Przygotowanie zachowuje swój termin końcowy; jego upływ rozpoczyna sesję w oryginalnym terminie, bez doliczania przygotowania do pracy ani czasu treningu.
- Długa przerwa oznacza, że podczas nieobecności skończyłby się cały plan albo od ostatniej aktywności minęło ponad 12 h, także podczas pauzy. Wtedy modalne okno „Niedokończony trening” pokazuje nazwę planu, datę i godzinę ostatniej aktywności oraz dwa przyciski: „Zapisz to, co zrobione” i „Porzuć”.
- „Zapisz to, co zrobione” tworzy wpis `partial`, liczony wyłącznie do `lastSeenAt`, i otwiera podsumowanie treningu (`/workout-sessions/:sessionId/feedback`), gdzie można uzupełnić oceny. Praca po tej chwili nie jest doliczana. Dokończone rundy, pominięcia i powtórzone próby zachowują zasady ADR 0005. Bez żadnej dokończonej pracy zapis jest kasowany bez pytania. „Porzuć” kasuje zapis i otwiera ekran główny.

### Zapis lokalny

- Repozytorium z `src/application` ma implementację w `src/infrastructure/storage`. Dane trafiają do `localStorage` pod kluczem `combat-training.activeWorkout.<uid>`, z `schemaVersion: 1` i walidacją `zod/mini`. Błędny, niezgodny ze schematem lub nieczytelny zapis jest usuwany bez komunikatu; niedostępna pamięć nie zatrzymuje odtwarzacza.
- Zapis zawiera niezmienną kopię planu, bieżący etap, status (także `preparing`), termin końca lub dokładny czas pauzy oraz stan rejestratora: identyfikator sesji, `startedAt`, strefę czasową, próby, wyniki etapów, pominięcia i oceny. Zachowuje też `lastSeenAt` oraz zakończoną sesję oczekującą na zapis. Edycja lub usunięcie planu nie wpływa na wznowienie; lokalny odtwarzacz nie czeka na załadowanie Firestore.
- Przy zmianach stanu odtwarzania w widocznej karcie aplikacja zapisuje migawkę odtwarzacza i rejestratora z aktualnym `lastSeenAt`. Zapis wykonuje też przy `visibilitychange` do `hidden` oraz przy `pagehide`. Odliczanie w ukrytej karcie nie wywołuje zapisu na każdą zmianę stanu.
- Zapis znika po przyjęciu wpisu przez lokalną pamięć Firestore, bez czekania na serwer, po „Porzuć”, po wylogowaniu (razem z czyszczeniem pamięci Firestore) i przy wyjściu z przygotowania. Błąd zapisu wpisu pozostawia możliwość ponowienia z tym samym identyfikatorem sesji.
- Po wznowieniu widoczny jest przycisk „Dźwięk wyłączony — stuknij, aby włączyć”. Stuknięcie wywołuje `unlockGong` i usuwa przycisk. Inne sterowanie wymagające dźwięku również może go odblokować gestem użytkownika.
- Kilka kart z tym samym treningiem i synchronizacja między urządzeniami pozostają poza zakresem: wygrywa ostatni zapis. Powrót z ukrytej karty bez przeładowania zachowuje dotychczasowe zasady nadrabiania czasu.

## Szybki stoper (issue #105)

- `/quick-timer` to leniwy ekran ustawień we wspólnym układzie; `/quick-timer/active` to leniwy odtwarzacz poza tym układem. Bez konfiguracji przekazanej z ustawień ani aktywnego stopera druga trasa wraca do pierwszej.
- `createQuickTimerPlan` tworzy jednorazowy `WorkoutPlan` „Szybki stoper”: jeden blok wybranego rodzaju, jedno ćwiczenie rundowe nazwane etykietą rodzaju, bez biblioteki i ćwiczenia celu. Plan przechodzi schemat dokumentu, ale nie jest zapisywany w Firestore. Sparing zaczyna z `sparringIntensity: null`.
- **Start** w ustawieniach jedynie otwiera odtwarzacz w stanie początkowym. **Rozpocznij trening** w odtwarzaczu uruchamia istniejące przygotowanie i odblokowanie dźwięku. Zegar, gongi, oba sygnały końca etapu, Wake Lock, pauza, ±15 s i „Poprzedni” są wspólne z planem.
- Opcjonalne `ActiveWorkout.source` ma wartości `plan` i `quickTimer`; brak pola nadal oznacza plan, bez zmiany `schemaVersion: 1`, klucza pamięci lub jej czyszczenia. Bramka odzyskiwania kieruje stoper na `/quick-timer/active`, także po utracie sesji uwierzytelnienia dopuszczonego odtwarzacza.
- Zapis następuje w tym samym momencie co dla planu. Rejestrator, odtworzenie zakończonego niezapisanego treningu i okno przerwanego treningu używają tej samej funkcji budującej wpis według źródła. Przerwanie po czasie dłuższym niż stoper albo po 12 h liczy tylko pracę do ostatniej aktywności. Stoper zachowuje nazwę „Szybki stoper”.
- Wpis `quickTimer` ma czas i status zgodne z ADR 0005, realizację w ukończonych rundach wobec zaplanowanych oraz rodzaj pojedynczego bloku. Sparing zapisuje `{ blockId: null, intensity: null, rounds }`; brak ukończonej pracy nie tworzy wpisu.
- Konfiguracja stopera jest walidowana i przechowywana pod `combat-training.quickTimer.{uid}`. Rodzaj i dyscyplina należą do konta na urządzeniu; przygotowanie i oba sygnały końca etapu pozostają ustawieniami całego urządzenia. Błąd pamięci nie blokuje startu.
