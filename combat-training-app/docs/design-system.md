# System wizualny

## Kierunek

Kierunek „Karmazyn z żarem” (ADR 0019, #184): prestiżowy, lekko agresywny i czysty interfejs dla zawodników sportów walki. Czerwień prowadzi, pomarańczowy żar pojawia się w akcentach. Gradienty na przyciskach głównych, liniach, wykresach i dekoracji głównej karty Startu są zatwierdzone przez właściciela.

Nie może wyglądać jak:

- gra komputerowa;
- plakat gali;
- neonowy panel futurystyczny;
- generyczna aplikacja fitness.

## Dark mode — wariant bazowy

- tło: prawie czarny grafit, nie czysta czerń;
- powierzchnie: stopniowane ciemne szarości;
- tekst: złamana biel;
- karmazynowe gradienty i oszczędne akcenty żaru;
- cienkie obramowania zamiast ciężkich cieni.

Tokeny prototypu Figmy są dobrym punktem wyjścia:

- `#0B0B0D` — tło;
- `#171719` — surface;
- `#1D1D20` — elevated;
- `#2A2A2E` — border;
- `#F4F4F1` — primary text;
- `#A7A7AA` — secondary text;
- `#85858A` — tertiary text (`faint`, małe etykiety);
- `#C1122F` — crimson accent (tła przycisków, obramowania, akcenty);
- `#EF5D6E` — czerwień tekstu (`crimson-ink`), bo `#C1122F` jest za ciemna dla małego tekstu na prawie czarnym tle.
- `#F0753A` — żar (`ember`), dekoracje i końce gradientów;
- `#3FB56B` — obramowanie wolnego dnia (`success`), `#8FD8A8` — tekst (`success-ink`);
- `#4A4A4F` — miniony niewykonany dzień (`missed`), z kontrastowym tekstem `on-accent`.

Gradienty są zmiennymi CSS `--app-grad-primary`, `--app-grad-accent`, `--app-grad-bar-current`, `--app-grad-bar-past` i `--app-grad-plus`. Przycisk główny ma Archivo wersalikami, radius 4 px, tekst `on-accent` i gradient główny; wyłączony nie ma gradientu. Dolne menu ma romb 36 px obrócony o 45°, wysunięty o około 24 px, z prostą ikoną + 24 px, obwódką tła 3 px i żaru 1 px (55%). Aktywna pozycja ma górną linię gradientu 2 px i ikonę `crimson-ink`. Menu boczne ma spójne akcenty bez rombu.

Start i Postęp używają wspólnego `WeekDayIndicator` z kropkami 26 px, bez legendy. Wykonany ma gradient główny i ✓, zaplanowany przerywaną ramkę 2 px `crimson-ink`, wolne ramkę 2 px `success` oraz tło 12%, „Nie byłem” tło `missed` i –, a plan niedostępny ramkę `border`. Pod kropką jest skrót dnia. Dziś ma tekst `ink` i kreskę 2 px `crimson-ink` pod skrótem. W Postępie oś łączy środki kropek, a tło kart i kropek osłania oś. Plakietki statusów i RPE są prostokątne (radius 0): zaliczone oraz RPE w gradiencie, „Nie byłem” na szarym tle, „Plan” z przerywaną ramką. Plakietka poprawy używa `success` i `success-ink`.

Aktualne wartości obu motywów są w `src/styles/index.css`. `src/features/theme/themeColors.test.ts` pilnuje kontrastu co najmniej 4,5:1 dla wszystkich tokenów tekstu na każdym tle.

## Menu główne (#198)

Na telefonie i komputerze kolejność to **Start · Plan · Trening (+) · Postęp · Profil**. Wygląd paska, rombu, etykiet i wskaźnika aktywności pozostaje bez zmian; jedynie etykieta „Trening” pod rombem leży 4 px niżej niż pozostałe, a romb 2 px wyżej (poprawka właściciela 19.11). Start zachowuje dotychczasowy domek; Plan, Postęp i Profil używają konturowych ikon z zatwierdzonej makiety `design-lab/start-v2/final-approval.html` (gałąź `design/antigravity-lab`).

Plan otwiera bieżący Plan tygodnia (`/progress/week`); datowane adresy `/progress/week/:weekStart` nadal działają i zaznaczają Plan. Postęp ma segmenty **Wykresy / Historia**; Historia (`/progress?tab=history`) zachowuje dziennik tygodniowy, wyszukiwanie i filtr tygodnia. Stary adres `/workouts?tab=history` przekierowuje z zachowaniem parametrów i fragmentu.

Trening otwiera dotychczasowy arkusz wyboru z dostępem do stopera, wpisu spoza aplikacji, biblioteki ćwiczeń, kreatora „Nowy plan treningowy” i listy „Moje plany”. Lista, szczegóły i kreator zachowują adresy `/workouts…`; biblioteka działa pod `/exercises` i `/my-exercises`. Lista i biblioteka są podekranami z powrotem. Karta Startu „Stoper i inne plany” jest opisana poniżej w Start v2 — wg makiety A.

Aktywna pozycja **Trening** w dolnym menu wyróżnia się kolorem etykiety i ma `aria-current="page"`. Romb ma kryjące wypełnienie i leży nad dekoracjami paska. Górna linia aktywności dotyczy pozostałych pozycji (#245).

Etykiety dolnego menu: Archivo 10 px, grubość 700, odstęp liter 0,05 em, wielkie litery. Ikony 20 px, kreska 2,25. Pozycje nieaktywne mają kolor `--app-muted` (wcześniej `--app-faint`), aktywna `--app-ink` z ikoną w `--app-crimson-ink` (decyzja właściciela 24.11, panel porównawczy).

## Sterowanie odtwarzacza (#253)

Wiersz sterowania ma 96 px wysokości i zachowuje 8 px górnego odstępu. Boczne przyciski „Poprzedni etap” i „Następny etap” (wariant E) mają obszary dotyku 58×58 px, romby z kwadratów 46×46 px obróconych o 45° i proste ikony 26 px. Tło rombu to `currentColor` z kryciem 9%. Każdy wierzchołek ma narożnik w kształcie L o wymiarach 12×2 px w kolorze `--app-ember`. Wyłączone przyciski są przygaszone.

Środkowy przycisk (M5) ma obszar dotyku 96×96 px, ostro zakończony romb z kwadratu 68×68 px obróconego o 45° i prostą ikonę 31 px. Romb ma gradient odtwarzacza, czerwony cień i narożniki żaru 16×2,5 px na krawędzi. Wszystkie romby mają kształt bez obwódki. Środkowy pokazuje rombową obwódkę fokusu 2 px przy nawigacji klawiaturą. W przygotowaniu „Zacznij teraz” jest dostępną nazwą przycisku i nie pojawia się w plakietce. Układ mieści się bez przewijania na 360×640 i 390×844 w obu motywach, także z kartą elementu do poprawy w przerwie.

## Kreator — oś planu (#259)

Główny ekran kreatora odwzorowuje makietę „Kreator – makieta końcowa” (1C · 2C · 5A, N1 A, N2 B, N3 G). Nagłówek: ✕ 44 px | wyśrodkowany tytuł Archivo 15 px (13,5 px poniżej 375 px) wersalikami | „Podgląd”: ramka 2 px `--app-ember` wysokości 36 px w polu dotyku 44 px, tekst `--app-ember-ink` 12 px, bez zaokrągleń; przy pustym planie wyłączony i wyciszony. Karta planu ma pasek 2 px w kolorze dyscypliny, plakietkę dyscypliny, „Czas: m:ss”, nazwę i linię „Cel: …” (znika bez celu); otwiera podekran „Dane planu”. Blok (2C): nagłówek „Blok N · Rodzaj” z czasem, pasek 4 px praca (`--app-crimson`) / przerwy (`--app-ember`) i podpisy „Praca” / „Przerwy”. Wiersz ćwiczenia (1C): kwadratowy węzeł, nazwa do 2 linii, parametry „3 × 3:00 / 1:00” cyframi tabelarycznymi i „★ element” w `--app-ember-ink`; menu „⋯” rozwija akcje W górę / W dół / Edytuj / Usuń (jeden wiersz naraz). Przerwa (N2 B): romb żaru, „PRZERWA” i czas w jednej linii; przerwy zamykające blok stoją na osi pod kartą. Pusty plan i wybór bloku (N3 G): kafle z ikonami liniowymi i „+”, Rozgrzewka i Rozluźnienie na całą szerokość; na pustym planie Rozgrzewka ma ramkę 2 px żaru i gradientowy pasek z lewej. Drobny tekst w kolorze żaru używa `--app-ember-ink` ze względu na kontrast w jasnym motywie.

## Light mode

Light mode używa przewagi jasnej szarości i bieli, grafitowego tekstu oraz tej samej czerwieni. Komponenty nie mogą zakładać na stałe ciemnego tła.

Gradienty mają te same odcienie co w ciemnym motywie. `success-ink` i `ember-ink` mają ciemniejsze warianty dla czytelności. Dekoracja burzy ma około 60% krycia.

Motyw wybierasz w Profilu → Ustawienia → Wygląd: Systemowy / Jasny / Ciemny. Domyślny jest Systemowy, reagujący na bieżące zmiany `prefers-color-scheme`. Dotychczasowe jawne wybory jasnego lub ciemnego motywu pozostają zapisane na urządzeniu. Nagłówek aplikacji i boczna nawigacja nie zawierają przełącznika motywu ani wylogowania; wylogowanie znajduje się w Profilu → Konto.

Profil używa spokojnych kart `surface` z ramką i etykietami sekcji wersalikami 11 px. Masa ciała, Samopoczucie i Statystyki są domyślnie zwinięte: przycisk z `aria-expanded` pokazuje najważniejsze podsumowanie, a po rozwinięciu szczegóły. Wykres masy ciała pojawia się od dwóch pomiarów.

## Geometria

- kanciaste rogi lub radius 0–4 px;
- większe zaokrąglenie tylko tam, gdzie wynika z funkcji, np. okrągły timer;
- żadnego glassmorphismu;
- gradienty dozwolone na przyciskach głównych, akcentach, wykresach i dekoracji karty Startu;
- plakietki statusów i RPE bez zaokrągleń;
- subtelne ukośne linie i motywy sportów walki są dopuszczalne.

## Typografia

- nagłówki: Archivo;
- tekst UI: Inter;
- liczby timera: cyfry tablicowe;
- uppercase wyłącznie dla krótkich etykiet i stanów.

## Nagłówki ekranów

Issue #188 wprowadza pięć wzorców, wspólnych dla telefonu i komputera. `src/components/ScreenHeader.tsx` udostępnia nagłówki i ich warianty. Każdy ekran ma dokładnie jeden `h1`, również podczas ładowania i błędu.

- **A — zakładka główna:** Plan tygodnia, Postęp i Profil. Archivo 28 px/800 po lewej, bez powrotu; opcjonalny krótki podtytuł i najwyżej jedna akcja ikoną 44×44 z dostępną nazwą.
- **B — Start:** bez widocznego nagłówka; ukryty `h1` „Start”. Data pozostaje na głównej karcie.
- **C — podekran:** strzałka 44×44 z nazwą „Wstecz” oraz tytuł Archivo 24 px/800 w jednym wierszu; najwyżej jedna akcja po prawej. Dotyczy m.in. listy planów (`/workouts`, `/workouts?tab=plans`), szczegółów planu, Stałego tygodnia, podstron Profilu, biblioteki, konfiguracji stopera i podglądów. Bez napisów „Wróć do…” i „‹ Postęp”. Powrót używa poprzedniego wpisu historii aplikacji (`navigate(-1)` przy dodatnim indeksie React Routera), a po wejściu bezpośrednim — stałej trasy nadrzędnej. Kroki wewnątrz kreatora wracają do poprzedniego kroku.
- **D — formularz:** ten sam układ, ale ✕ z nazwą „Zamknij”. Ręczny wpis, nowy/edytowany plan, konfiguracja i edycja ćwiczenia oraz formularz elementu do poprawy. Zamykanie przy zmianach otwiera pytanie o odrzucenie; Escape zachowuje zmiany i przywraca fokus. Zapis jest wyłącznie akcją główną na dole. Formularz osadzony lub modalny używa odpowiednio niższego poziomu nagłówka, zachowując jeden `h1` strony.
- **E — trening na żywo:** tylko ✕ „Zakończ trening” 44×44 po lewej i wyśrodkowany postęp. Istniejące potwierdzenie, pauza oraz zasady wyjścia przed startem i podczas przygotowania pozostają wspólne dla planu i stopera.

Podsumowanie po treningu należy do równoległego #187; ta migracja nie zmienia jego ekranu.

Start v2 — wg makiety A (#201): obowiązuje domyślny `design-lab/start-v2/start-final.html` z gałęzi `design/antigravity-lab` (1B-1 · 2B, kolor 2B-2 · 3A · 4A · 5A), z pierwszeństwem treści issue. Nie jest wzorcem `final-approval.html`. Kropki dni tygodnia na Starcie i w Postępie są wyjątkiem od kanciastej geometrii. Subtelna poświata żaru `0 0 12px` występuje tylko na przycisku głównym Startu.

Karta Startu ma padding `18px 16px 16px`, odstęp 12 px i minimalną wysokość 360 px na telefonie (na komputerze bez minimum); burza z makiety ma krycie 0,65. Data i plakietka dzielą wiersz, tytuł Archivo 32 px/800, podtytuł 13 px, parametry są chipami. Właściciel zatwierdził jedno odstępstwo dla kontrastu WCAG: tekst plakietki wyłącznie w jasnym motywie używa `ember-ink` (ciemniejszy żar), przy niezmienionym tle i obwódce; ciemny motyw zachowuje `#f0753a`. Nad kartą dyscypliny tygodnia lub aktywnego planu i bieżący sezon. Przycisk 2B-2 ma trzy stopnie gradientu, wysokość co najmniej 56 px, Archivo 14 px/800 wersalikami i wyśrodkowaną treść. Opis pozostaje dostępny przez `aria-describedby` i `sr-only`. Pod nim dwa kafelki 52 px z ikonami 32×32.

„Ten tydzień” ma nagłówek Archivo 16 px/800, link „Plan tygodnia →”, siedem dni Pn–Nd (sobota: So), kółka 26 px, pasek 6 px i statystyki „Ukończone: X z Y jednostek” oraz „Postęp: N%”. Wskaźnik Startu zachowuje opisy dostępności, ma ✓ po zaliczeniu i nie skaluje się po zmianie ani najechaniu. „Następny: …” jest pojedynczym wierszem z datą 38×38 i opisem z wielokropkiem. Dowolny dzień ma osobne przerywane wiersze „+ Wykonaj w dowolny dzień: …”; bez osobnych widocznych nagłówków tych sekcji. Puste sekcje znikają.

„Stoper i inne plany” to jeden link do `/workouts`, z opisem „Interwały, runda wolna lub biblioteka ćwiczeń”. Lista planów udostępnia „Stoper rund” do `/quick-timer`; skrót w arkuszu Trening pozostaje dostępny. Ostatnia sesja ma zwartą kartę 5A z historią, podsumowaniem, statusem i dotychczasowymi odnośnikami do raportu lub poprawy wpisu. Brak RPE oraz oczekiwanie na wysłanie nadal są widoczne. Długie nazwy bezpiecznie się zawijają, brakujące parametry znikają. Dane i reguły zaliczania pozostają bez zmian.

## Kontrolki formularzy

Issue #189 ujednolica wygląd kontrolek bez zmiany danych, reguł, obliczeń ani zachowania formularzy. Makieta „Szablony komponentów” jest wzorcem wizualnym; pierwszeństwo ma treść issue.

- Jedna opcja: wspólny `ChoiceTile` z natywnym radiem w DOM, stanem `aria-checked`, ramką 1 px bez zaznaczenia oraz 2 px `crimson-ink` i tłem crimson po zaznaczeniu. Wariant kafelkowy zachowuje dolny pasek. Krótkie etykiety są w jednej linii; dłuższa opcja pominięcia jest wariantem tekstowym pod kafelkami. Skale z opisami zachowują opisy i numer w kwadracie.
- Wiele opcji: `MultiChoiceChip` ma natywny checkbox z `aria-checked` lub przycisk z `aria-pressed`. Ramka ma 1 px bez zaznaczenia i 2 px z delikatnym tłem po zaznaczeniu. Symbol + jest widoczny przy niezaznaczonej opcji. Minimalny obszar dotyku 44 px. Opisy pomocnicze mogą zawijać się pod etykietą.
- Włączanie i wyłączanie: `Switch` z natywnym checkboxem o roli `switch`. Tor ma 48×28 px, obszar dotyku co najmniej 44 px wysokości; włączenie przesuwa uchwyt i nadaje gradient główny. Zgody zdrowotne i potwierdzenie 18+ zachowują pełne teksty, początkowe wyłączenie i dotychczasowy zapis oraz warunki aktywowania przycisku.
- Rozwijanie: `CollapsibleCard` z natywnym przyciskiem, `aria-expanded`, `aria-controls` i chevronem. Opis pokazuje dostępne podsumowanie danych; zawartość pozostaje zamontowana i jest ukryta do rozwinięcia. Początkowy stan pozostaje zwinięty. Klawisze Enter i Spacja obsługuje przeglądarka.
- Akcje tekstowe nie mają podkreślenia; działania drugorzędne mogą używać ramki i ikony. Linki wewnątrz treści mogą zachować podkreślenie.

Kontrolki używają tokenów obu motywów, widocznej obwódki fokusu i tekstowych lub geometrycznych oznaczeń stanu, niezależnych od koloru. Natywne radio zachowuje wybór strzałkami, checkbox i przełącznik — Spacją.

Ptaszek oznacza status, np. wykonany dzień lub zapisany wynik. Zaznaczenie w formularzu pokazują grubsza ramka i tło (#245).

## Ruch

Fundament ruchu (#195) używa wspólnych tokenów CSS dla obu motywów:

- `--motion-fast: 100ms` — wciśnięcie, zaznaczenie i zmiana statusu;
- `--motion-med: 250ms` — rozwinięcie karty i obrót chevronu;
- `--motion-slow: 300ms` — przełączenie zakresu wykresu;
- `--ease-standard: cubic-bezier(0.2,0,0,1)`;
- `--ease-out: cubic-bezier(0,0,0,1)` — pojawienie się treści;
- `--ease-in: cubic-bezier(0.3,0,1,1)` — wyjście, gdy jest potrzebne.

Ruch przekazuje informację po działaniu użytkownika lub zmianie statusu. Nie animujemy częstych wejść na ekrany. Nowe mikrointerakcje działają w obszarze `motion-controls`; Start i odtwarzacz pozostają poza nim. Ich istniejące przejścia korzystają ze wspólnych tokenów.

Animujemy wyłącznie `transform` i `opacity`; kolor tekstu, tła i obramowania może mieć przejście koloru. Bez animowania `width`, `height`, `top`, `left`, `box-shadow` ani `filter`. `will-change` tylko punktowo, gdy potwierdzono potrzebę. Bez migania częściej niż 3 razy na sekundę (zwłaszcza czerwieni), kaskad wejścia (stagger), liczników od zera i dekoracyjnych animacji przy wejściu na ekran.

Przycisk główny, kafelek wyboru i karta będąca przyciskiem lub linkiem przy wciśnięciu zmniejszają się do `scale(0.98)` w `--motion-fast` z `--ease-standard`. Zaznaczenie `ChoiceTile`, `MultiChoiceChip` i `Switch` zmienia kolory w 100 ms. Ramka wyboru zmienia grubość od razu. Uchwyt przełącznika przesuwa się przez `transform`. Nowa plakietka statusu Planu tygodnia i kółko dnia po zmianie stanu przenikają i skalują się od 0.9 do 1 w `--motion-fast`, bez animacji początkowego stanu.

Postęp przy „Pokaż 12 tygodni” / „Pokaż mniej” używa jednego przejścia `--motion-slow`. Dotychczasowe słupki zmieniają wysokość przez `scaleY()` z początkiem na dole, a dodatkowe kolumny pojawiają się przez `opacity`. Wszystkie jednocześnie, bez animowania szerokości ani odstępów. Przy wejściu wykres jest od razu gotowy. Oba warianty ogłaszają „Pokazano 12 tygodni” / „Pokazano 5 tygodni” przez `aria-live="polite"`.

`CollapsibleCard` zachowuje zamontowaną, ukrytą zawartość. Przy rozwinięciu treść przenika i przesuwa się od -4 px do 0 w `--motion-med`, a chevron obraca się w tym samym czasie.

Przy `prefers-reduced-motion: reduce` nie ma skali wciśnięcia, ruchu znaczników, przesunięcia treści ani obrotu chevronu. Wykres, plakietki i kółka zmieniają się natychmiast. Stan nadal pokazują tekst, geometria i kolory; przejścia kolorów pozostają aktywne. Obsługa klawiatury, fokus i dane pozostają bez zmian.

Sama zmiana motywu jest natychmiastowa: tekst i powierzchnie dostają nową paletę razem, bez przejściowego spadku kontrastu. Następne interakcje kontrolek nadal korzystają z przejść kolorów.

## Dostępność

- minimalny obszar dotyku około 44×44 px;
- nie koduj stanu wyłącznie kolorem;
- zachowuj widoczne focus states;
- przyciski treningowe muszą być używalne podczas zmęczenia;
- respektuj `prefers-reduced-motion`;
- burza jest statyczna, w Start v2 zgodna z SVG makiety A; SVG ma `aria-hidden="true"` i `pointer-events: none`, treść leży nad nim, tekst omija najjaśniejszą część dekoracji;
- każde kółko dnia ma `role="img"` i pełny `aria-label` ze stanem i informacją „dziś”; symbole ✓ i – uzupełniają kolory;
- przycisk powrotu do bieżącego tygodnia ma widoczny napis „Dziś” oraz `aria-label="Dziś — Wróć do bieżącego tygodnia"`, z widocznym napisem na początku nazwy (WCAG 2.5.3);
- nowe kolory tekstu oraz tekst na każdym punkcie gradientu przycisku mają kontrast co najmniej 4,5:1; testy obejmują oba motywy;
- czerwony tekst zawsze przez `text-crimson-ink`, nigdy `text-crimson`;
- każdy ekran ma jeden obszar `<main>`. Testy E2E (axe) blokują naruszenia od poziomu `moderate`.

## Migracja Figmy

Start v2 (#197) jest bazą funkcjonalną dla prezentacji #201 opisanej wyżej. „Nie byłem” oraz „Przenieś dzień” korzystają z istniejących akcji Planu tygodnia, wraz z cofaniem przeniesienia. Powitanie A pozostaje iskrą zbiegającą się w róg pierwszej karty i pojedynczym błyskiem SVG: 800 ms (`motion-slow + 2 × motion-med`), wyłącznie transform/opacity, raz na `sessionStorage`. Dotknięcie lub klawisz pomija animację, nie zatrzymując akcji. Przy reduced motion powitanie nie jest uruchamiane; brak animowanych liczników, kaskad i ciągłego pulsowania.

Aktualizacja premium (#184) ma pierwszeństwo nad opisami wcześniejszych migracji poniżej. Start nie ma widocznego nagłówka (zachowuje jeden ukryty h1 „Start”); data jest w etykiecie głównej karty z burzą we wszystkich stanach. Pozycję głównej akcji Startu określa obecnie karta makiety A (#201). Pasek tygodnia ma 6 px i gradient akcentu. Plan tygodnia: nagłówek zakładki głównej bez strzałki, ikona stałego tygodnia w kwadracie 40×40, pasek celu 6 px, pionowy gradient 3 px przy dziś, znacznik „wolne” przy pustych dniach. Na innym tygodniu przycisk „Dziś” z kalendarzem znajduje się przed strzałką następnego tygodnia i wraca do bieżącego. Modele, reguły i obliczenia pozostają bez zmian.

Postęp → Wykresy (#244) używa makiety 1C · 2C · 3A · 4A · 5B. Duży kafelek ma pasek akcentu 2 px i pokazuje realizację celu lub liczbę treningów. Dwa mniejsze kafelki o tej samej łącznej wysokości mają znaczniki 24×2 px. Dni łączy pozioma oś. Wykres używa wąskich słupków, kreski celu `ember` i gradientu `--app-grad-bar-current`. Po rozwinięciu tygodnie wybiera się z przewijanego paska pod wykresem (#243). Karty elementów do poprawy pokazują pięć segmentów, ostatnie oceny i trend albo przerywany stan „Jeszcze bez ocen”. Ostatnia notatka pochodzi z otwartej korekty aktywnego elementu. „Więcej” używa rozwijanych wierszy z ikoną, podpisem i wartością.

Historia (#180) jest dziennikiem tygodniowym. Ma zwarte rozwijane wiersze, przerwy między tygodniami i kalendarz miesiąca. Wyszukiwanie obejmuje nazwy i notatki.

Start v2 (#154) korzysta z HTML w komentarzu właściciela: data, karta „Dziś” albo „Szybki start”, zaległe zajęcia do 7 dni, podsumowanie siedmiu dni i jedna ostatnia sesja. Samopoczucie pozostaje na dole, wyłącznie po zgodzie. Karta „Dziś” otwiera istniejący ręczny wpis z datą, dyscypliną, minutami i częściami; RPE oraz szczegóły sparingu pozostają puste. Przycisk jest dostępny także przed końcem zajęć. Wysokość głównej akcji wynosi co najmniej 56 px; pozycję i minimalną wysokość karty zastępuje #201 opisane wyżej. Dzień bez zajęć pokazuje następny zaplanowany trening oraz Szybki start. Wiersz „Stoper i inne plany” zastępuje pojedynczy odnośnik określony w #201. Symbole dni i tekstowe opisy statusów działają niezależnie od koloru. Planowanie, zaliczanie, przenoszenie z cofnięciem i „Nie byłem” używają mechanizmów z #164 / ADR 0018, bez zmiany modelu danych.

Plan tygodnia (#176) odwzorowuje makiety A i panelu z dołu z komentarza właściciela: marginesy telefonu 16 px, odstępy sekcji 10 px, nagłówek Archivo 28 px/800, strzałki tygodnia i kwadratowe + 44 px, pasek postępu 4 px, kolumna dnia 44 px i odstęp 10 px. Dziś ma pionowy pasek akcentu i „DZIŚ”. Karta „Stały tydzień” nad przełącznikiem tygodni zawiera ikonę powtarzania, podsumowanie klub/własny i strzałkę. Pozycje mają przycisk ⋯ z nazwą oraz status ikoną i słowem; bez osobnego tokenu sukcesu używamy neutralnej ramki z ✓. Sekcja „Dowolny dzień · kiedy pasuje” ma krótki nagłówek i + Dodaj. Podsumowanie tygodnia jest jednym rozwijanym wierszem z liczbą treningów, minutami i obciążeniem. Formularz istnieje tylko w jednym panelu modalnym z dołu, z X, tłem, kontrolą fokusu i Wstecz; po zapisie znika. Powtarzaj co tydzień jest domyślnie wyłączone i nie występuje w edycji stałego tygodnia. Nie dodajemy odpoczynku; pusty dzień oznacza odpoczynek. Kolory i fonty pochodzą wyłącznie z tokenów obu motywów. Układ Startu i obliczenia wykresów pozostają bez przebudowy.

Najpierw odtwórz zatwierdzony ekran 1:1. Nie łącz migracji wizualnej z przebudową logiki. Każde ulepszenie UX zgłaszaj osobno.
