# Specyfikacja kreatora treningu

Issue #164: trening własny w planie tygodnia może wskazywać zatwierdzony plan kreatora. „Start” uruchamia go w dotychczasowym odtwarzaczu; dostępny jest tylko przy istniejącym wskazanym planie treningu własnego. Zajęcia klubowe nie mają „Start”. Link „Wpisz trening” podpowiada datę, dyscyplinę, części i czas w ręcznym wpisie, bez domyślnego RPE; użytkownik może poprawić podpowiedzi. Nie zmienia to kreatora ani logiki odtwarzacza.

## Informacje początkowe

- dyscyplina — wymagana;
- nazwa — opcjonalna;
- główny cel — opcjonalny;
- data i godzina nie są wybierane w kreatorze; `createdAt` powstaje przy utworzeniu szkicu, a `startedAt` sesji przy rozpoczęciu pierwszego etapu.

Jeśli użytkownik nie wpisze nazwy, kreator i podgląd pokazują „{Dyscyplina} — {DD.MM.RRRR}”. Data pochodzi z `createdAt` szkicu, w UTC. Edycja zachowuje pierwotne `createdAt` planu. Jeśli daty nie da się odczytać, nazwa ma postać „{Dyscyplina} — plan treningu”.

### Wybór dyscypliny

Na podekranie „Dane planu” `DisciplinePicker` wyświetla grupę „Dyscyplina” z pięcioma natywnymi przyciskami radiowymi w kolejności Boks, Kickboxing, Muay Thai, K-1, MMA stójka. Można zaznaczyć jedną opcję dotknięciem kafla lub klawiaturą. Kafle mają 52 px wysokości i odstępy 8 px. Układają się w jednej kolumnie, a od 640 px w dwóch. Etykiety mają kolory dyscyplin, a zaznaczenie pokazują obwódka 2 px i tło z domieszką karmazynu.

Nowy plan zaczyna się bez zaznaczenia. Dolny przycisk „Dalej” jest wtedy wyłączony i opisany komunikatem „Wybierz dyscyplinę, aby przejść dalej.”. Po wyborze „Dalej” wraca na oś planu. Przy edycji istniejącego planu lub gdy szkic ma już blok, przycisk nazywa się „Gotowe”. Po dodaniu pierwszego ćwiczenia grupa jest wyłączona. Wybrany kafel zachowuje pełne krycie, pozostałe mają 50%, a pod grupą widać „Dyscyplina jest zablokowana po dodaniu pierwszego ćwiczenia.”.

## Oś treningu

Kreator prezentuje bloki i elementy w kolejności odtwarzania. Rodzaje bloków, w kolejności na liście:

- Rozgrzewka;
- Technika;
- Tarcze;
- Worek;
- Sparing;
- Kondycja;
- Siła i motoryka;
- Rozluźnienie.

Rozluźnienie ma ten sam wygląd karty i te same ustawienia początkowe nowego ćwiczenia co rozgrzewka. Nie zmienia rodzaju treningu w dzienniku.

Użytkownik może:

- dodać blok;
- dodać ćwiczenie;
- dodać osobną przerwę;
- edytować, duplikować i usuwać ćwiczenie;
- przesuwać elementy strzałkami góra/dół.

Drag and drop nie należy do MVP.

Issue #259: nowy plan zaczyna się od podekranu „Dane planu” (dyscyplina, nazwa, cel); ✕ wraca na oś. Na osi te dane pokazuje karta planu, która ponownie otwiera podekran. Pusty plan pokazuje kafle wszystkich rodzajów bloków; dotknięcie kafla dodaje pierwszy blok. Kolejne bloki dodaje „Dodaj kolejny blok”. Akcje ćwiczenia, przerwy i bloku są w menu „⋯”. Przerwy kończące blok są rysowane na osi pod jego kartą, bo tak zapisujemy przerwę między blokami. „Podgląd” jest w nagłówku i jest wyłączony, dopóki plan nie ma bloku.

## Panel „Dodaj przerwę” (#274)

Akcja „Dodaj przerwę” w bloku otwiera modalny arkusz od dołu z nagłówkiem „Przerwa”. Arkusz przyciemnia tło i blokuje przewijanie strony. Ma górną linię w kolorze żaru o grubości 2 px, zajmuje całą szerokość na telefonie, a od 768 px jest wyśrodkowany i ma do 32 rem szerokości. Wysokość jest ograniczona do wysokości widoku pomniejszonej o 64 px, a nadmiar treści można przewinąć wewnątrz arkusza.

- „Gotowe formaty” to cztery kafle w jednym rzędzie, w kolejności `0:30`, `1:00`, `2:00`, `3:00`. Nowa przerwa zaczyna się od `1:00`. Kafel jest zaznaczony, gdy jego czas odpowiada ustawionej wartości. Dotknięcie kafla ustawia czas i zamyka ręczny wpis.
- `ExerciseValueStepper` w układzie `layout="side"` pokazuje pod etykietą „Przerwa” podkreślony czas `m:ss` między przyciskami „−15 s” i „+15 s” z obiciami M5. Jeśli czas wypada poza siatką 15 s, przycisk przechodzi do najbliższej wielokrotności w swoim kierunku. Przy otwartym wpisie krok korzysta z wpisanej wartości, jeśli jest poprawna, a w przeciwnym razie z ostatniego ustawionego czasu.
- Dotknięcie czasu otwiera pole. Można wpisać `m:ss` albo całkowitą liczbę sekund w zakresie `0:00`–`60:00` (`BREAK_DURATION_MAX_SECONDS = 3600`). Pod poprawnym wpisem widać podgląd `m:ss`. Enter zatwierdza wpis. Opuszczenie pola także zatwierdza wpis, z wyjątkiem przejścia fokusu na kafel formatu, przycisk kroku, przycisk zamknięcia lub przycisk dolny. Niepoprawny wpis zostaje w polu z komunikatem „Wpisz przerwę jako m:ss albo liczbę sekund, od 0:00 do 60:00.”.
- „Instrukcja (opcjonalnie)” jest zawsze widocznym jednoliniowym polem o limicie 120 znaków z podpowiedzią „np. Woda i reset oddechu”. Przy zapisie aplikacja usuwa skrajne białe znaki i zapisuje `null`, jeśli pole jest puste.
- Dolny przycisk „Dodaj przerwę” ma ścięty prawy górny róg. Sprawdza również jeszcze niezatwierdzony wpis i dodaje przerwę na końcu bloku w szkicu planu. Zapis wymaga czasu od `0:01` do `60:00`. Przy `0:00` panel pozostaje otwarty i pokazuje „Łączny czas przerwy musi być większy od 0.”.

Po otwarciu fokus trafia na ✕ „Zamknij”, a Tab i Shift+Tab krążą po kontrolkach w arkuszu. ✕ i dotknięcie tła zamykają panel bez zapisu. Escape przy otwartym wpisie czasu anuluje wpis, a poza nim zamyka panel. Po zamknięciu fokus wraca do przycisku dodawania lub menu akcji edytowanej przerwy.

Akcja „Edytuj przerwę” w menu „⋯” otwiera ten sam arkusz z nagłówkiem „Edycja przerwy”, aktualnym czasem i instrukcją oraz przyciskiem „Zapisz przerwę”. Jeśli w istniejącym planie zapisano czas dłuższy niż `60:00`, panel go wyświetla, wyłącza „+15 s” i wymaga skrócenia czasu przed zapisem. W tym przypadku „−15 s” ustawia `60:00`.

## Biblioteka

Biblioteka jest filtrowana automatycznie według:

1. dyscypliny całego treningu;
2. rodzaju aktualnego bloku.

MVP zawiera:

- wyszukiwarkę tekstową;
- pełne polskie nazwy kombinacji ze strzałkami;
- całą klikalną kartę z subtelnym symbolem `+`;
- zakładki „Biblioteka” i „Własne ćwiczenie”.

Karta nie pokazuje tagów, liczby technik ani listy dyscyplin.

Issue #161: wbudowana biblioteka zawiera 86 zatwierdzonych pozycji z `exercise-library-draft.csv`, z zachowaniem 38 starych ID. Filtr „Kategoria” zawęża wbudowane pozycje, łączy się z wyszukiwaniem oraz filtrami dyscypliny i bloku. Prywatne definicje nie mają kategorii, więc są widoczne przy „Wszystkie kategorie”; włączenie „Moje” zeruje i wyłącza filtr kategorii. „Kopiuj do moich” zachowuje typ i domyślne parametry źródłowej pozycji. Bez zmian dziedziczenia ustawień przy dodawaniu wbudowanego ćwiczenia do planu.

Issue #156 / ADR 0017: biblioteka łączy pozycje wbudowane z aktywnymi „Moimi ćwiczeniami”. Wyszukiwanie przy pisaniu pomija polskie znaki, wielkość liter i strzałki, dopasowuje też fragment nazwy. Chipy dyscypliny i bloku są domyślnie włączone według planu; można je wyłączyć i włączyć filtr „Moje”. Pusta fraza pokazuje do pięciu ostatnio użytych Moich, potem pozostałe ulubione i resztę alfabetycznie. Gwiazdka ma dostępną nazwę i stan. Pusty wynik oferuje utworzenie wpisanej nazwy w Moich. Wbudowane ćwiczenie można skopiować do prywatnej biblioteki z nowym ID i pochodzeniem; nie edytujemy źródła.

Issue #267 (makieta z 26.11.2026, warianty L1 A · L2 B · L3 A · L4 C · L5 B · L6 B): pod nagłówkiem „Dodaj ćwiczenie” z podtytułem „Dyscyplina · rodzaj bloku” jest przełącznik „Biblioteka / Własne ćwiczenie”. Obok pola wyszukiwania przycisk otwiera dolną szufladę z filtrami dyscypliny, bloku i „Moje”; liczba na przycisku pokazuje aktywne filtry z szuflady. Kategorię wybiera się z przewijanego rzędu plakietek („Wszystkie” + kategorie w kolejności biblioteki), który zastępuje listę rozwijaną i działa także z „Moje”. „Ostatnio używane” i „Ulubione” są na górze i zawsze rozwinięte (tylko bez frazy i kategorii); niżej zwijane sekcje kategorii z liczbą pozycji, z pierwszą rozwiniętą, a przy wyszukiwaniu rozwinięte są wszystkie kategorie z wynikami. Moje ćwiczenia bez źródła tworzą sekcję „Moje ćwiczenia”; kopia wbudowanej pozycji trafia do kategorii źródła i zastępuje ją, więc ćwiczenie nie powtarza się w jednej sekcji. Wiersz zawiera tylko nazwę i gwiazdkę 44 × 44 px; przycisku „Kopiuj do moich” nie ma. Gwiazdka na pozycji wbudowanej kopiuje ją do Moich jako ulubioną (albo oznacza istniejącą aktywną kopię), jest wypełniona, gdy aktywna kopia z `copiedFromId` jest ulubiona, a ponowne dotknięcie zdejmuje ulubione bez usuwania kopii. Brak wyników pokazuje kartę z „Utwórz „fraza” w Moich” i „Wyczyść filtry”, gdy jakiś filtr jest aktywny (link wyłącza wszystkie filtry i kategorię, zostawia frazę). Formularz własnego ćwiczenia ma typ jako trzy kafle (widoczny tylko przy zapisie do Moich), przełącznik „Zapisz w Moich ćwiczeniach” (wyłączony = „Tylko w tym planie”) i przyklejony przycisk „Dalej”.

Własne ćwiczenie domyślnie zapisuje się do Moich po zatwierdzeniu parametrów, z dyscypliną i rodzajem bloku z planu; opcja „Tylko w tym planie” zachowuje dotychczasowy wariant bez ID biblioteki. Wybór prywatnej pozycji zaczyna od jej zapisanych parametrów, a wbudowane i jednorazowe nadal dziedziczą ustawienia według zasad poniżej. Ekran „Moje ćwiczenia” w Treningach umożliwia zmianę nazwy, dyscyplin, bloków i parametrów; typ zmieniamy wyłącznie przez utworzenie nowej pozycji. Archiwizacja i przywrócenie nie zmieniają planów i historii.

## Konfiguracja rundowa

Gdy przed miejscem wstawienia nie ma ćwiczenia rundowego, nowe ćwiczenie startuje od:

- 3 rund;
- 3:00 pracy;
- 1:00 odpoczynku.

Ekran „Ćwiczenie” (#260) ustawia wartości stepperami:

- rundy: krok 1, zakres 1–99;
- czas rundy: krok 15 s, zakres 0:01–1440:00 (86 400 s);
- przerwa między rundami: krok 15 s, zakres 0:00–1440:00;
- czas ćwiczenia ciągłego: krok 15 s, zakres 0:01–1440:00.

Wartość spoza siatki 15 s przechodzi przy kroku do najbliższej wielokrotności 15 s w danym kierunku (1:40 + 15 s → 1:45, 1:40 − 15 s → 1:30). Przycisk na granicy zakresu jest wyłączony. Steppery pokazują czas w formacie `m:ss`. Dotknięcie wartości otwiera wpis: rundy jako liczba całkowita, czas jako `m:ss` albo liczba sekund. Pod polem na bieżąco widać poprawnie odczytany czas, np. wpisane `90` daje `1:30`. Enter zatwierdza wpis, a Esc go anuluje. Próba zatwierdzenia błędnego wpisu pokazuje komunikat i zachowuje poprzednią wartość. Logika kroków i odczyt wpisu są czystymi funkcjami (`exerciseStepper.ts`).

Gotowe formaty, zawsze te same, nie są zapisywane w planie:

- 3 × 3:00 · przerwa 1:00;
- 3 × 3:00 · przerwa 0:30;
- 5 × 3:00 · przerwa 1:00.

Stuknięcie formatu ustawia naraz liczbę rund, czas rundy i przerwę. Każdą wartość można potem zmienić. Format jest zaznaczony tylko wtedy, gdy steppery mają dokładnie jego wartości. Szybki timer ma osobny zestaw formatów.

Pod stepperami pasek struktury pokazuje segment na każdą rundę i każdą przerwę między rundami (szerokość proporcjonalna do czasu) oraz łączny czas ćwiczenia; aktualizuje się na żywo.

Ekran nosi tytuł „Ćwiczenie” podczas dodawania i edycji. Dolny przycisk to „Zatwierdź ćwiczenie” przy dodawaniu i „Zapisz zmiany” przy edycji. Element do poprawy zapisuje się razem z ćwiczeniem po użyciu dolnego przycisku albo „Gotowe”. Wybór elementu do poprawy działa jak na osi planu (zwinięcie po wyborze, „Zmień”, limit 3 w planie).

Gdy liczba rund wynosi 1, stepper przerwy między rundami jest ukryty. W jej miejscu widać informację, że przerwy między rundami wtedy nie ma, a przerwę po ćwiczeniu dodaje się w bloku jako element „Przerwa”. Wcześniej ustawiony czas tej przerwy zostaje w planie i wraca na ekran, gdy liczba rund znowu jest większa niż 1. Odtwarzacz się nie zmienia.

Nowe ćwiczenie jest dopisywane na końcu wybranego bloku. Tryb jest taki jak ostatnie ćwiczenie w tym samym bloku; pusty blok startuje od rund. Czas ćwiczenia ciągłego bierze z tego ostatniego ćwiczenia, gdy jest ciągłe, a w przeciwnym razie wynosi 5:00. Liczbę rund, czas rundy i przerwę bierze z ostatniego ćwiczenia rundowego od początku planu do miejsca wstawienia, także po przełączeniu z trybu ciągłego na rundowy. Ćwiczenie ciągłe i przerwa po drodze nie zmieniają tych wartości rund. Elementy w późniejszych blokach są pomijane. Edycja istniejącego ćwiczenia pokazuje jego własne wartości.

## Obliczenia

Dla ćwiczenia rundowego:

- praca = rundy × czas rundy;
- odpoczynek = (rundy − 1) × odpoczynek;
- po ostatniej rundzie nie dodaje się automatycznego odpoczynku;
- dodatkowa przerwa musi być osobnym elementem.

## Podgląd

Podgląd pokazuje:

- dyscyplinę, nazwę i cel;
- liczbę bloków, ćwiczeń, rund i elementów do poprawy oraz jeden szacowany łączny czas treningu;
- kolejność bloków, ćwiczeń i samodzielnych przerw. Przy ćwiczeniu rundowym widać liczbę rund, czas rundy i odpoczynku między rundami. Przy ćwiczeniu ciągłym i samodzielnej przerwie widać czas trwania. Jeśli dodano instrukcję, podgląd ją wyświetla.

Działania:

- „Zapisz plan” zatwierdza plan. Przy tworzeniu wraca do listy planów, a przy edycji otwiera szczegóły zapisanego planu. Uruchomienie treningu jest osobną akcją.
- „Wróć do edycji” lub przycisk cofania w nagłówku wraca do bieżącego szkicu.

Szkic pozostaje w stanie kreatora do zapisu lub opuszczenia ekranu. Zapis w Firestore następuje po świadomej akcji użytkownika.

Edycja istniejącego planu ma obok podglądu przycisk „Zapisz zmiany”. Zapisuje od razu, z tą samą walidacją co podgląd, i jest aktywny tylko wtedy, gdy plan został zmieniony. Nowy plan nadal przechodzi przez podgląd.

## Niezapisane zmiany

Gdy plan został zmieniony i nie został zapisany, odejście z kreatora pyta „Odrzucić zmiany?”. Dotyczy to „Anuluj”, „Wróć do treningów”, wstecz przeglądarki i głównej nawigacji. „Wróć do edycji” zostawia zmiany; „Odrzuć zmiany” wychodzi bez zapisu. Odświeżenie i zamknięcie karty korzystają z komunikatu przeglądarki. Biblioteka ćwiczeń i konfiguracja ćwiczenia mają własne cofanie i nie pytają. Po udanym zapisie pytania nie ma.
