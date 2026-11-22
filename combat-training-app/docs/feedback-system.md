# Oceny po treningu i analiza postępu

Nazwy w interfejsie to **Cel**, **Błąd** i **Wskazówka** (#187). Pytania to „Czy ten błąd dziś się powtarzał?” (Rzadziej / Tak samo / Nie sprawdzałem) oraz „Jak dobrze ci wychodziło?”. Klucze danych to `criterion`, `problem`, `fix`, `better`, `same` i `notChecked`. Przycisk „Pozostałe ćwiczenia” rozwija opcjonalne oceny. „Zapisz oceny” zapisuje formularz.

Stan wcześniejszych decyzji: 10 listopada 2026. Decyzje właściciela z 4–10 listopada (Q1–Q5, R1–R4, issue #76). Uzasadnienie: research A i C w projekcie pracy. Pola w bazie: `database-model.md`.

Aktualizacja #180, decyzja właściciela 16 listopada: w całym interfejsie „ćwiczenia celu” nazywają się **elementami do poprawy**; tożsamość `focusSkillId`, model i reguły pozostają bez zmian. Postęp pokazuje ostatnią liczbową ocenę według obecnego celu, pięć segmentów, trzy ostatnie oceny i tekstowe porównanie z bezpośrednio poprzednią („↑ z N”, „bez zmian”, „↓ z N”). To zastępuje wcześniejszy zakaz strzałek wyłącznie na kartach listy; szczegóły nadal zachowują mediany osobno według miejsca. Element można dodać bez planu z Postępu lub ręcznego wpisu, wspólnym formularzem. Poprzednia ocena jest plakietką z datą i miejscem, a odpowiadający jej stopień ma znaczek „ostatnio”, także po wybraniu dzisiejszej oceny.

Główny Postęp pokazuje aktualny tydzień, bez zdań-wniosków. „Zwykle” dla minut to mediana czterech poprzednich pełnych tygodni, łącznie z pustymi, dopiero gdy historia sięga początku tego okresu. Obciążenie wymaga kompletu RPE do podania wartości „zwykle”. Wykres główny zaczyna się od tygodnia pierwszego wpisu, wymaga trzech tygodni i pokazuje domyślnie do pięciu, po rozwinięciu do dwunastu. Liczy wszystkie zapisane sesje, także częściowe, zgodnie z celem liczby w v2. Historyczne plany pochodzą wyłącznie z zapisanych migawek, bez odtwarzania ich ze stałego tygodnia. Błąd lub niepełna historia nie daje pozornych zer. Dotychczasowy wykres i tabela porównawcza pozostają w szczegółach planu tygodnia, poza głównym ekranem Postępu.

Zasada: każda funkcja ma pomagać kontrolować postęp. Jakość wykonania i ilość pracy pokazujemy osobno, nigdy jako jeden wynik.

## Po treningu

1. **Wpis zapisuje się od razu** po zakończeniu treningu (ADR 0005). Oceny i RPE dopisujemy później do tego samego wpisu, więc zamknięcie aplikacji w trakcie podsumowania nie gubi treningu.
2. **Podsumowanie** pokazuje oceny ćwiczeń celu, notatkę i intensywność sparingu.
3. **RPE po 10 minutach wyciszenia.** Podsumowanie odlicza 10 minut i kończy odliczanie gongiem. Można odpowiedzieć wcześniej albo pominąć pytanie (Q2).

**Nagłówek v2 dla sesji z planu (PR #216).** Tytuł to „Trening ukończony” lub „Trening częściowy”. Pod nim widać zapisaną nazwę planu i komunikat „Zapisane w dzienniku. Oceny dopiszą się do wpisu.”. Z boku pojawia się plakietka „Zapisane” lub „Czeka na wysłanie”. „Wstecz” wraca do poprzedniego ekranu aplikacji lub do Historii. Osobna karta wyróżnia „Czas czystej pracy”, a niżej pokazuje czas treningu i realizację ćwiczeń.

Wyjście z podsumowania treningu z planu lub szybkiego stopera z niezapisanymi zmianami formularza wymaga potwierdzenia odrzucenia ocen i notatki; RPE zapisuje się osobno i nie uruchamia ostrzeżenia.

## Ćwiczenia celu (Q1, R1, R2)

Ćwiczenie celu to umiejętność, nad którą pracujesz, np. „Lewy prosty, powrót do gardy”. Ma nazwę i cel, czyli warunek poprawnego wykonania. Działa we wszystkich planach: jeden wykres zbiera oceny z każdego planu.

Issue #156 / decyzja właściciela 15.11 / ADR 0017: tożsamością nadal jest `focusSkillId`. Nowy cel utworzony przy pozycji biblioteki może dodatkowo zachować `exerciseId`; jego aktualna nazwa jest wyświetlana przy trendzie, ale nie zmienia grupowania ocen. Bez drugiego wykresu i bez przepisywania istniejących ocen. Przy ocenianiu w podsumowaniu i ręcznym wpisie pokazujemy datę, wartość i miejsce wcześniejszej oceny tego samego elementu według tego samego celu; pomijamy brak oceny i niewykonane ćwiczenia. „Nie umiem ocenić” pozostaje odpowiedzią tekstową.

### W kreatorze

- Oznaczasz do 3 ćwiczeń w planie jako ćwiczenia celu.
- Wybierasz ćwiczenie celu ze swojej listy albo tworzysz nowe: nazwa i cel, np. „Ręka wraca do brody przed następnym ciosem”.

### Ocena po treningu

Pytanie dotyczy celu, a nie ogólnego wrażenia. Skala z opisanymi stopniami (R1):

1. Nie udaje się nawet w prostej próbie.
2. Udaje się czasem, zwykle przerywam, żeby poprawić.
3. Udaje się, gdy świadomie pilnuję wskazówki.
4. Zwykle się udaje, błąd sam łapię i poprawiam.
5. Udaje się bez myślenia o wskazówce.

Do tego **„Nie umiem ocenić”**. Ta odpowiedź zostaje zapisana, ale nie wchodzi do średnich.

- Oceniamy tylko ćwiczenie, w którym dokończono co najmniej jeden etap. Pominięte nie dostaje oceny ani zera.
- Ocena jest opcjonalna. Brak oceny nie wchodzi do średnich.
- Każda ocena zapisuje kontekst, czyli typ bloku (worek, tarcze, sparing…). Wykres go pokazuje, żeby nie mylić techniki na worku z techniką w sparingu.

### Notatka „błąd i wskazówka” (R2)

- Opcjonalna, przy ocenie ćwiczenia celu: jeden błąd i jedna wskazówka, np. „opuszczam prawą rękę” i „dotykam rękawicą policzka”.
- Przy następnym treningu z tym ćwiczeniem celu aplikacja pokazuje notatkę w podglądzie planu, a w podsumowaniu pyta: **Rzadziej, Tak samo, Nie sprawdzałem**.
- „Rzadziej” zamyka notatkę. „Tak samo” i „Nie sprawdzałem” zostawiają ją na kolejny trening. Nowa notatka zastępuje poprzednią.
- Usunięcie wpisu zamyka otwartą notatkę z tego wpisu.

### Trend

- Zakładka **Postęp** pokazuje aktywne elementy alfabetycznie. Karta pokazuje ostatnią i do trzech ostatnich ocen liczbowych według aktualnego celu oraz zmianę względem poprzedniej oceny. Schowane elementy są w osobnej, zwijanej sekcji.
- Ekran ćwiczenia celu pokazuje cel, otwartą notatkę „błąd i wskazówka”, wykres i wszystkie oceny od najnowszej. Wiersz oceny prowadzi do podsumowania treningu; lista jest też tekstową wersją wykresu.
- Wykres to punkty bez linii łączących. Oś X: dzień treningu (`workoutDate`), oś Y: ocena 1–5. Każde miejsce (typ bloku) ma własny kształt punktu z legendą, niezależnie od koloru. Gdy liczba punktów przekracza pojemność szerokości ekranu, wykres pokazuje ostatnie 12 tygodni do daty ostatniej oceny; lista nadal zawiera wszystkie oceny.
- Podsumowanie liczymy **osobno dla każdego miejsca**, tylko z ocen 1–5 według obecnego celu (`criterionSnapshot === criterion`). Dwa wystąpienia w jednym treningu są osobnymi ocenami.
- Przy jednej ocenie: „Jedna ocena: 3 (12.11)”; przy dwóch: „Oceny: 2, 3”. Od trzech ocen pokazujemy **środkową ocenę (medianę)** i liczbę ocen, „Ostatnie 3” oraz maksymalnie trzy „Wcześniejsze”. Obie grupy zachowują kolejność chronologiczną. Przy parzystej liczbie ocen mediana jest średnią dwóch środkowych, zapisaną z przecinkiem, np. `3,5`.
- Bez strzałek, kolorów sugerujących poprawę lub pogorszenie i bez ogłaszania postępu albo regresu na podstawie kilku samoocen.
- Brak oceny (`null`) pomijamy całkowicie. „Nie umiem ocenić” zostaje na liście i w osobnym liczniku, poza wykresem i obliczeniami.
- Oceny według poprzedniego celu mają puste punkty (sam obrys) i dopisek na liście. Pionowa przerywana linia „Zmiana celu” wskazuje pierwszą ocenę według obecnego celu po ostatniej ocenie według innego celu (także przy powrocie A → B → A). Starsze oceny nie wchodzą do podsumowania; pokazujemy ich liczbę.
- „Schowaj” zdejmuje oznaczenie CEL we wszystkich wskazujących planach, zostawiając ćwiczenia, oceny i wykres. „Przywróć” przywraca ćwiczenie celu na listę w kreatorze, ale nie oznaczenia w planach. Usuwanie jest dostępne tylko bez jakichkolwiek wpisów w `focusRatings`, także tych z `assessment: null`.

## Ręczny wpis

Wpis treningu spoza aplikacji dodaje się przyciskiem pod ostatnimi sesjami na stronie głównej albo na górze Historii. Można go później poprawić lub usunąć; wpis z odtwarzacza zachowuje dotychczasowe możliwości podsumowania i notatki.

- RPE 0–10 jest obowiązkowe. Podpowiedź: „Oceń cały trening, nie ostatnią rundę.” Data od dziś − 7 dni do dziś; przy edycji można zachować starszą zapisaną datę.
- „Z pamięci” oznacza RPE podane co najmniej 3 dni kalendarzowe po treningu w strefie wpisu. Dotyczy wszystkich źródeł i jest widoczne w Historii oraz szczegółach obciążenia. Nie zmienia obliczeń. Przy edycji chwila RPE zmienia się tylko wraz z jego wartością.
- Ten sam dzień i wspólna część zajęć lub rodzaj odtwarzacza (dowolne źródło) powodują ostrzeżenie o dublu. Po potwierdzeniu powstaje osobny wpis obejmujący tylko resztę zajęć; zapis odtwarzacza nie jest wydłużany ani zastępowany. Przy edycji pytanie pojawia się tylko po zmianie daty lub zbioru części.
- Części zajęć (wielokrotny wybór, minimum jedna, bez domyślnej): technika, tarcze, worek, sparing, kondycja, inne. Nowe wpisy nie oferują „Mieszany”; dawne czytamy bez przepisywania. Edycja dawnego v1 „Mieszany”, również ze szczegółami sparingu, startuje bez zaznaczonych części i wymaga ich świadomego wyboru przed zapisem. Komunikat: „Ten wpis był zapisany jako „Mieszany”. Zaznacz, co było na zajęciach.”. Bez godziny, dystansu, tętna, kalorii, miejsca ani własnej nazwy. Czas to całe zajęcia z rozgrzewką: 60/90/120 min albo własna liczba całkowita 1–480 min.
- Szczegóły sparingu otwierają się po zaznaczeniu części „Sparing”, z przeniesieniem fokusu i ogłoszeniem czytnika. Odznaczenie czyści intensywność i rundy. Nie ma osobnego pola „Był sparing”. Intensywność jest wymagana, liczba rund 1–50 opcjonalna; czas pracy i sparingu pozostaje `null`.
- Opcjonalnie do 3 aktywnych ćwiczeń celu, każde raz, ze skalą R1 i „Nie umiem ocenić”. Nie mają `workoutItemId`. Miejsce wynika z pojedynczej nazwanej części; dla kilku części, „Inne” i „Kondycja” wybiera je użytkownik. Przy nowej ocenie zmiana części przelicza miejsce, a przejście do kilku części wymaga ponownego wyboru. Przy edycji istniejącej oceny jej zapisane miejsce pozostaje bez zmian niezależnie od części; można zmienić je wyłącznie świadomie w polu „Gdzie ćwiczyłeś?”.
- Notatki R2 działają jak po planie: poprzednia otwarta notatka, pytanie „Rzadziej / Tak samo / Nie sprawdzałem” i nowa notatka. „Rzadziej” zamyka, nowa zastępuje. Wpis wcześniejszy niż otwarta notatka o nią nie pyta. Sesja i notatki zapisują się razem, także offline.
- Ręczne oceny trafiają do trendu w Postępie, wiersz prowadzi do poprawy wpisu. Ćwiczenie celu z taką oceną można schować, ale nie usunąć. Ukończony wpis zalicza cel rodzaju w planie tygodnia, a nie cel konkretnego planu; liczy się do tygodniowej liczby, czasu i obciążenia oraz wykresu 12 tygodni. Nieznane czasy nie są zerami.

„Jak ostatnio” nad nowym wpisem kopiuje wyłącznie dyscyplinę, czas i części poprzednich zajęć z klubu. Dopiski „jak ostatnio” znikają osobno przy pierwszej zmianie wypełnionego pola. RPE pozostaje bez wartości domyślnej; kompaktowy wybór 0–10 pokazuje opis wybranej liczby, a dla 6, 8 i 9 opis między sąsiednimi opisanymi stopniami. Notatka jest jedna, z podpowiedzią „Czego się uczyłeś? Co poprawiał trener?” i maksymalnie trzema różnymi wcześniejszymi notatkami użytkownika ze wszystkich źródeł treningu. Data ma skróty „Dziś” / „Wczoraj”; „Inny” od razu pokazuje i ustawia fokus na polu minut w tym samym wierszu.

W Postępie i Profilu pokazujemy ostatnie 28 dni: liczbę zajęć spoza aplikacji z każdą częścią oraz minuty według rodzaju wyłącznie z wpisów jednoczęściowych i odtwarzacza. Nie dzielimy czasu zajęć wieloczęściowych ani dawnych „Mieszany”; objaśnienie stoi obok wyników. Suma czasu i obciążenie nadal obejmują całe treningi, każdy raz. Liczników części nie sumujemy.

## Pozostałe ćwiczenia

Opcjonalnie, pod „Pozostałe ćwiczenia” (Q1). Pytanie: **Jak oceniasz wykonanie tego ćwiczenia?**

1. Nie udało się wykonać zgodnie z założeniem.
2. Dużo błędów i mała kontrola.
3. Częściowo poprawnie, ale nierówno.
4. Dobrze i powtarzalnie.
5. Bardzo dobrze, swobodnie i pod kontrolą.

Te oceny nie tworzą trendów.

## RPE i obciążenie (Q2)

- Session-RPE 0–10 dla całego treningu, według Fostera.
- Kotwice Fostera (0, 1, 2, 3, 4, 5, 7, 10) pozostają bez zmian. Opisy 6 („Między ciężko a bardzo ciężko”), 8 („Między bardzo ciężko a maksymalnie”) i 9 („Prawie maksymalnie”) to nasze opisy pośrednie, nie część oryginalnej skali.
- Pytanie po 10 minutach wyciszenia. Zapisujemy moment odpowiedzi, żeby znać opóźnienie oceny.
- Gdy RPE brakuje, strona główna przypomina o nim. Powiadomienia push to rozszerzenie, bo wymagają planu Blaze.
- **Obciążenie** = RPE × minuty czasu treningu. Zawsze pokazujemy obok czas i RPE osobno, żeby było widać, skąd wzrosło.

## Intensywność sparingu (Q4)

Wdrożone (issue #122): podsumowanie treningu z planu pozwala zmienić lub pozostawić pustą intensywność każdego bloku sparingu z co najmniej jedną dokończoną rundą. Zapisuje ją razem z ocenami i notatkami, także offline, bez zmiany liczby rund. Podsumowanie tygodnia liczy twarde rundy ze wszystkich źródeł, pokazuje pokrycie intensywności oraz liczbę treningów z twardym sparingiem bez podanej liczby rund.

- Blok sparingu w planie ma intensywność: lekki, techniczny albo twardy. Podsumowanie ją podpowiada i pozwala zmienić.
- Ręczny wpis sparingu ma intensywność i opcjonalną liczbę rund. Szybki stoper z rodzajem „sparing” ma intensywność, a rundy liczy sam.
- Podsumowanie tygodnia pokazuje liczbę twardych rund jako informację. Bez „bezpiecznych” progów i bez sugestii, że licznik chroni zdrowie.

## Notatka

Jedno pole tekstowe (do 1000 znaków) z podpowiedziami: co zadziałało, jaki błąd się powtarzał, co zrobić następnym razem.

## Samopoczucie (Q3, issue #146)

Domyślnie wyłączone. Osobny ekran zgody w Profilu wymaga dwóch niezaznaczonych pól: potwierdzenia 18+ i wyraźnej zgody na opisany cel przetwarzania danych o zdrowiu. To osobna zgoda od masy ciała. Wyłączenie przełącznikiem, z potwierdzeniem, usuwa wszystkie wpisy przez sieć; zgodę zerujemy dopiero na końcu. Szczegóły: ADR 0015.

Na Starcie karta „Jak się dziś czujesz?” zawiera cztery pytania, każde jednym dotknięciem 1–5, **wyżej = lepiej**, ze słowną etykietą każdego stopnia:

| Pole i pytanie | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| `sleep`: Jak oceniasz jakość snu ostatniej nocy? | bardzo zła | zła | przeciętna | dobra | bardzo dobra |
| `energy`: Jak wypoczęty czujesz się teraz? | skrajnie zmęczony | zmęczony | normalnie | wypoczęty | w pełni wypoczęty |
| `soreness`: Jak odczuwasz teraz mięśnie (bolesność, sztywność)? | silny ból | wyraźna bolesność | lekka bolesność | prawie nic | brak bolesności |
| `stress`: Jaki jest dziś Twój ogólny poziom stresu (trening, praca, życie)? | bardzo wysoki | wysoki | umiarkowany | niski | bardzo niski |

Opcjonalna notatka „Coś nietypowego?” ma do 300 znaków i nie jest analizowana. Nie pytamy o choroby, leki ani okolicę bólu. Jeden wpis na lokalny dzień; do końca tego dnia można go poprawić w Profilu. Zapis offline pokazuje „Czeka na wysłanie”. Karta znika po wpisie lub „Nie dziś” (zapamiętane na urządzeniu dla konta na dany dzień). Bez automatycznych okien, powiadomień, serii i kar.

Norma dla każdego pytania to mediana i P25–P75 z 28 dni **przed** ocenianym dniem. Wymaga ≥14 wpisów obejmujących ≥21 dni kalendarzowych, z oboma końcami. Kwartyle interpolowane liniowo; remisy z progiem są typowe. Niżej niż P25: „gorzej niż zwykle”, wyżej niż P75: „lepiej niż zwykle”, pozostałe: „typowo dla Ciebie”. „Od N dni” liczy kolejne ostatnie gorsze wpisy, każdy względem swojej ówczesnej normy, bez wypełniania luk. Wersja pytań zmienia zbiór normy. Progi są założeniem projektowym, nie zwalidowanym testem.

W Postępie karta „Samopoczucie” pokazuje cztery wiersze z kategoriami ostatniego wpisu i wykresami ostatnich 28 dni. Szare pasmo pokazuje P25–P75 sprzed każdego dnia; punkty to odpowiedzi 1–5, pominięte dni są puste. Każdy wykres ma tabelę danych, a status opis słowny, bez czerwieni i zieleni. Przed normą widać ostatnie odpowiedzi i „Jeszcze N wpisów do Twojej normy” oraz warunek 21 dni. Stopka: „To nie jest ocena medyczna. Jeśli coś Cię niepokoi albo dolegliwości się utrzymują, skonsultuj się z lekarzem.”

Przy RPE podsumowania planu, szybkiego stopera, formularza ręcznego wpisu i szczegółów Historii pokazujemy „Dziś rano: …” według `workoutDate`: tylko pytania gorsze niż norma albo „typowo dla Ciebie”, gdy żadne nie jest gorsze. Dla „Poprzednio ten plan” prefiks to „Tamtego dnia”. Bez normy lub wpisu z tamtego dnia linia jest ukryta. Dane pozostają oddzielone od RPE i nie zmieniają obciążenia. Bez wyniku 0–100, procentów i zaleceń treningowych.

## Podsumowanie tygodnia (Q5, R3)

**Cel v1.** Starsza lista do 14 pozycji nie przypisuje dni. Pozycja oznacza konkretny plan albo rodzaj treningu. Pasek liczy ukończone dopasowania względem liczby pozycji, więc dwa ukończone i jedno częściowe wykonanie dają 2 z 3. Kolejność dopasowania to ukończony dokładny plan, ukończony rodzaj, częściowy dokładny plan, częściowy rodzaj. Odczyt wyświetla starszy plan w widoku tygodnia. Pierwsza zmiana zapisuje v2 atomowo i zachowuje pierwotne cele jako `legacyGoal`. Dopóki tydzień zawiera takie pozycje, pasek liczy ukończone dopasowania.

**Cel v2.** Datowany plan może powstać ze stałego tygodnia, a `targetCount` jest osobnym celem liczby treningów. W planie bez `legacyGoal` każdy wpis z danego tygodnia liczy się do tego celu, również częściowy i „Poza planem”. Osobno dopasowujemy sesje do pozycji klubowych i własnych według daty i rodzaju lub części. Klub wymaga też zgodnej dyscypliny. Sesja i pozycja mogą uczestniczyć najwyżej w jednym dopasowaniu. Odpoczynek i „Nie byłem” są wyłączone z dopasowania. Pasek jest ograniczony do 100%. Używamy zapisanego `workoutDate`. Dane niepełne lub błąd nie dają pozornych zer. Szczegóły opisują [ADR 0018](adr/0018-recurring-and-scheduled-weeks.md) i [model danych](database-model.md).

Wdrożony **Q5 etap 1**: na ekranie wybranego tygodnia, także podczas edycji celu, podsumowanie treningów z dziennika pokazuje liczbę wszystkich, ukończonych i częściowych sesji, sumę czasu treningu, czas pracy i sparingu z pokryciem danych oraz „RPE w X z Y treningów” (0 jest oceną). Liczymy zapisany `workoutDate` od poniedziałku do niedzieli, niezależnie od celu. Nieznane czasy nie są zerami; niepełna lub błędna historia blokuje sumy, a lokalne zapisy zachowują oznaczenie oczekiwania na wysłanie.

Wdrożony **Q5 etap 2**: ta sama sekcja pokazuje obciążenie tygodnia jako sumę RPE × (`durationSeconds` / 60) w jednostkach umownych (j.u.), liczoną w locie i niezapisywaną w bazie. Czas treningu i RPE pozostają widoczne osobno. Przy brakach RPE etykieta brzmi „Zarejestrowane obciążenie”, obok jest „RPE w X z Y treningów”, informacja, że suma obejmuje tylko treningi z RPE, oraz „Czas treningów z RPE”; bez żadnego RPE pokazujemy „Brak danych”, nie 0. RPE 0 daje znane obciążenie 0. Zwijane „Szczegóły obciążenia” wymieniają sesje tygodnia od najnowszej: datę, nazwę, czas treningu, RPE i obciążenie.

Wdrożony **Q5 etap 3**: pod podsumowaniem jest wykres 12 tygodni kończących się wybranym tygodniem; zmiana tygodnia przesuwa okno. Domyślnie słupki pokazują liczbę treningów, a przełącznik „Minuty” sumę `durationSeconds` / 60 zaokrągloną w górę jak w podsumowaniu. Wszystkie źródła i oba statusy liczymy według zapisanego `workoutDate`, od poniedziałku do niedzieli, tą samą funkcją co podsumowanie. Pusty tydzień ma wartość 0; bieżący ma pusty słupek i podpis „trwa”, wybrany — obrys i pogrubiony podpis. Opis dla czytników ekranu i zwijane „Pokaż dane” udostępniają wersję tekstową. Własny SVG bez biblioteki (ADR 0011), tokeny jasnego i ciemnego motywu, bez animacji. Przy błędzie, ładowaniu lub niepełnej historii wykres korzysta ze stanu podsumowania i nie pokazuje pozornych zer. Bez obciążenia na wykresie, trendu, średniej, strzałek, celu tygodnia i kolorów „lepiej/gorzej”.

Wdrożony **Q5 etap 4**: pod wierszami podsumowania, przed szczegółami obciążenia, tabela „Na tle 3 poprzednich tygodni” zestawia wybrany tydzień ze średnią liczby treningów, czasu treningu i obciążenia z trzech bezpośrednio poprzedzających tygodni. Bieżący tydzień ma dopisek „trwa”. Liczymy wszystkie źródła i oba statusy według zapisanego `workoutDate`, tą samą funkcją co podsumowanie. Najwcześniejszy dzień treningu musi sięgać poniedziałku pierwszego z trzech tygodni; wcześniej pokazujemy „Porównanie pojawi się po 3 pełnych tygodniach treningów.”. Tygodnie bez treningów liczą się jako 0. Obciążenie „Zwykle” wymaga RPE dla każdego treningu w tym okresie, inaczej pokazujemy „Brak pełnych danych”. Liczba treningów „Zwykle” ma jedną cyfrę po przecinku, a czas i obciążenie korzystają z formatowania podsumowania. Tabela korzysta ze stanu historii: ładowanie, błąd i niepełne dane blokują porównanie. To opis, nie ocena: bez słów „więcej/mniej niż zwykle”, strzałek, kolorów oceniających i procentów.

Decyzja właściciela z 22.11 usuwa licznik ocen elementów do poprawy z wymagań podsumowania tygodnia. Postęp elementów do poprawy pokazuje trend według celu ([#225](https://github.com/AntoniKra/Martial-Arts-App/issues/225)).

Tydzień od poniedziałku do niedzieli, według dnia treningu. Pokazujemy:

- liczbę treningów;
- czas treningu, pracy i sparingu;
- sumę obciążenia, obok czas i RPE;
- liczbę twardych rund;
- **pokrycie danych**, np. „RPE w 4 z 5 treningów” oraz liczba wpisów ze znanym czasem pracy i sparingu;
- wdrożone porównanie liczb w tabeli „Ten tydzień” i „Zwykle”: liczba treningów, czas treningu i obciążenie obok średniej z 3 poprzednich tygodni; bez słownej oceny i arbitralnego progu „więcej niż zwykle”, dopiero gdy historia sięga początku tego okresu;
- wdrożony wykres ostatnich 12 tygodni: liczba treningów lub minuty czasu treningu (ADR 0011), bez obciążenia.

Wdrożone (issue #127): pod liczbami w podsumowaniu treningu z planu pokazujemy blok **„Poprzednio ten plan”** z datą jak w Historii, czasem treningu i pracy, liczbą ukończonych i zaplanowanych ćwiczeń oraz RPE („RPE: brak”, gdy go nie podano). Poprzednie wykonanie to najnowsza inna sesja z tego samego `workoutPlanId`, wcześniejsza według `startedAt`, a przy remisie według `id`; ręczne wpisy i szybki stoper nie biorą udziału. Dopisek „Plan zmieniono po tamtym treningu.” pokazujemy, gdy zapisane listy `stepResults` obu sesji różnią się długością lub układem kroków (`blockId`, `workoutItemId`, `kind`, `roundNumber`, `roundCount`, porównane po kolei), także po usunięciu planu. Przy tym samym układzie dopisek wymaga różnicy `plannedDurationSeconds` co najmniej jednego kroku oraz istniejącego planu z `updatedAt` późniejszym niż `completedAt` poprzedniej sesji, ponieważ korekty zegara też zmieniają zapisany czas docelowy. Sama zmiana nazwy lub odpięcie ćwiczenia celu nie wywołuje dopisku. Link „Zobacz” otwiera podsumowanie poprzedniego treningu; przy pierwszym wykonaniu blok jest niewidoczny. Bez poprzednich ocen ćwiczeń, strzałek, kolorów oceniających i procentów.

Nie pokazujemy: ACWR, monotonii i strain Fostera, wyniku 0–100, prognoz.

## Kierunki rozwoju

### Testy kontrolne (R4)

Decyzją właściciela z 22.11 cały moduł R4 przechodzi z rdzenia MVP do kierunków rozwoju. Poniżej zachowano założenia na przyszłość. Stan decyzji zapisuje [ADR 0021](adr/0021-control-tests-deferred.md).

- **Test własny** ze stałym protokołem i dopiskiem „pewność nieznana”.
- **Burpees 3 min:** zmiana o 6 powtórzeń lub więcej to prawdziwa zmiana. To test ogólnej sprawności, nie techniki.
- **KAST:** opcjonalnie dla kickboxingu i K-1, z zaleceniem nagrania.
- Każdy test ma **paszport**: miejsce, sprzęt, rozgrzewkę, porę dnia. Przy wyniku zaznaczasz, czy warunki się zgadzały.
- Zalecany odstęp między testami fizycznymi: 4–8 tygodni (AIBA zaleca ocenę 3–4 razy w roku).

### Pozostałe oceny

Koncentracja 1–5, dyskomfort, realizacja celu 1–5 i odczuwany postęp 1–7 z opcją „Nie mam punktu odniesienia”. Nie wchodzą do wersji finalnej.

## Podsumowanie szybkiego stopera (issue #105)

Trasa `/workout-sessions/:sessionId/feedback` obsługuje również `quickTimer`. Pokazuje czas treningu, pracę i ukończone rundy, wspólną kartę RPE z odliczaniem 10 minut, notatkę oraz zmianę jednego z sześciu rodzajów (bez rozgrzewki, rozluźnienia i „Mieszany”). Nie pokazuje ocen ćwiczeń. Przypomnienie RPE na Start i link „Podsumowanie” w Historii obejmują stoper.

Dla rodzaju „Sparing” intensywność jest opcjonalna: lekki, techniczny lub twardy, z tymi samymi etykietami co w planie. Zmiana rodzaju na sparing tworzy jeden wpis z `blockId: null`, liczbą ukończonych rund i `sparringSeconds = workSeconds`. Zmiana na inny rodzaj usuwa wpis sparingu i zeruje czas sparingu. Ten sam zapis uaktualnia `stepResults[].blockType`, `nameSnapshot` etykietą rodzaju, notatkę i `updatedAt`, po walidacji całego dokumentu; zachowuje RPE i czasy treningu. „Zapisz oceny” wraca do Historii także offline. Intensywność w podsumowaniu treningu z planu wdrożono w issue #122 (Q4).
