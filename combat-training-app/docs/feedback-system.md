# Oceny po treningu i analiza postępu

Stan: 10 listopada 2026. Decyzje właściciela z 4–10 listopada (Q1–Q5, R1–R4, issue #76). Uzasadnienie: research A i C w projekcie pracy. Pola w bazie: `database-model.md`.

Zasada: każda funkcja ma pomagać kontrolować postęp. Jakość wykonania i ilość pracy pokazujemy osobno, nigdy jako jeden wynik.

## Po treningu

1. **Wpis zapisuje się od razu** po zakończeniu treningu (ADR 0005). Oceny i RPE dopisujemy później do tego samego wpisu, więc zamknięcie aplikacji w trakcie podsumowania nie gubi treningu.
2. **Podsumowanie** pokazuje oceny ćwiczeń celu, notatkę i intensywność sparingu.
3. **RPE po 10 minutach wyciszenia.** Podsumowanie odlicza 10 minut i kończy odliczanie gongiem. Można odpowiedzieć wcześniej albo pominąć pytanie (Q2).

## Ćwiczenia celu (Q1, R1, R2)

Ćwiczenie celu to umiejętność, nad którą pracujesz, np. „Lewy prosty, powrót do gardy”. Ma nazwę i kryterium oceny. Działa we wszystkich planach: jeden wykres zbiera oceny z każdego planu.

### W kreatorze

- Oznaczasz do 3 ćwiczeń w planie jako ćwiczenia celu.
- Wybierasz ćwiczenie celu ze swojej listy albo tworzysz nowe: nazwa i kryterium, np. „Ręka wraca do brody przed następnym ciosem”.

### Ocena po treningu

Pytanie dotyczy kryterium, a nie ogólnego wrażenia. Skala z opisanymi stopniami (R1):

1. Nie udaje się nawet w prostej próbie.
2. Udaje się czasem, zwykle przerywam, żeby poprawić.
3. Udaje się, gdy świadomie pilnuję wskazówki.
4. Zwykle się udaje, błąd sam łapię i poprawiam.
5. Udaje się bez myślenia o wskazówce.

Do tego **„Nie umiem ocenić”**. Ta odpowiedź zostaje zapisana, ale nie wchodzi do średnich.

- Oceniamy tylko ćwiczenie, w którym dokończono co najmniej jeden etap. Pominięte nie dostaje oceny ani zera.
- Ocena jest opcjonalna. Brak oceny nie wchodzi do średnich.
- Każda ocena zapisuje kontekst, czyli typ bloku (worek, tarcze, sparing…). Wykres go pokazuje, żeby nie mylić techniki na worku z techniką w sparingu.

### Notatka „problem i poprawka” (R2)

- Opcjonalna, przy ocenie ćwiczenia celu: jeden problem i jedna poprawka, np. „opuszczam prawą rękę” i „dotykam rękawicą policzka”.
- Przy następnym treningu z tym ćwiczeniem celu aplikacja pokazuje notatkę w podglądzie planu, a w podsumowaniu pyta: **lepiej, bez zmian, nie sprawdzono**.
- „Lepiej” zamyka notatkę. „Bez zmian” i „nie sprawdzono” zostawiają ją na kolejny trening. Nowa notatka zastępuje poprzednią.

### Trend

- Zakładka **Postęp** pokazuje aktywne ćwiczenia celu alfabetycznie, liczbę ocen według obecnego kryterium i ostatnią taką ocenę z datą oraz miejscem. Schowane ćwiczenia są w osobnej, zwiniętej sekcji.
- Ekran ćwiczenia celu pokazuje kryterium, otwartą notatkę „problem i poprawka”, wykres i wszystkie oceny od najnowszej. Wiersz oceny prowadzi do podsumowania treningu; lista jest też tekstową wersją wykresu.
- Wykres to punkty bez linii łączących. Oś X: dzień treningu (`workoutDate`), oś Y: ocena 1–5. Każde miejsce (typ bloku) ma własny kształt punktu z legendą, niezależnie od koloru. Gdy liczba punktów przekracza pojemność szerokości ekranu, wykres pokazuje ostatnie 12 tygodni do daty ostatniej oceny; lista nadal zawiera wszystkie oceny.
- Podsumowanie liczymy **osobno dla każdego miejsca**, tylko z ocen 1–5 według obecnego kryterium (`criterionSnapshot === criterion`). Dwa wystąpienia w jednym treningu są osobnymi ocenami.
- Przy jednej ocenie: „Jedna ocena: 3 (12.11)”; przy dwóch: „Oceny: 2, 3”. Od trzech ocen pokazujemy **środkową ocenę (medianę)** i liczbę ocen, „Ostatnie 3” oraz maksymalnie trzy „Wcześniejsze”. Obie grupy zachowują kolejność chronologiczną. Przy parzystej liczbie ocen mediana jest średnią dwóch środkowych, zapisaną z przecinkiem, np. `3,5`.
- Bez strzałek, kolorów sugerujących poprawę lub pogorszenie i bez ogłaszania postępu albo regresu na podstawie kilku samoocen.
- Brak oceny (`null`) pomijamy całkowicie. „Nie umiem ocenić” zostaje na liście i w osobnym liczniku, poza wykresem i obliczeniami.
- Oceny według poprzedniego kryterium mają puste punkty (sam obrys) i dopisek na liście. Pionowa przerywana linia „Zmiana kryterium” wskazuje pierwszą ocenę według obecnego kryterium po ostatniej ocenie według innego kryterium (także przy powrocie A → B → A). Starsze oceny nie wchodzą do podsumowania; pokazujemy ich liczbę.
- „Schowaj” zdejmuje oznaczenie CEL we wszystkich wskazujących planach, zostawiając ćwiczenia, oceny i wykres. „Przywróć” przywraca ćwiczenie celu na listę w kreatorze, ale nie oznaczenia w planach. Usuwanie jest dostępne tylko bez jakichkolwiek wpisów w `focusRatings`, także tych z `assessment: null`.

## Ręczny wpis

Wpis treningu spoza aplikacji dodaje się przyciskiem pod ostatnimi sesjami na stronie głównej albo na górze Historii. Można go później poprawić lub usunąć; wpis z odtwarzacza zachowuje dotychczasowe możliwości podsumowania i notatki.

- RPE 0–10 jest obowiązkowe. Podpowiedź: „Oceń cały trening, nie ostatnią rundę.” Data od dziś − 7 dni do dziś; przy edycji można zachować starszą zapisaną datę.
- „Z pamięci” oznacza RPE podane co najmniej 3 dni kalendarzowe po treningu w strefie wpisu. Dotyczy wszystkich źródeł i jest widoczne w Historii oraz szczegółach obciążenia. Nie zmienia obliczeń. Przy edycji chwila RPE zmienia się tylko wraz z jego wartością.
- Ten sam dzień i rodzaj (dowolne źródło) powodują ostrzeżenie o dublu. Po potwierdzeniu powstaje osobny wpis obejmujący tylko resztę zajęć; zapis odtwarzacza nie jest wydłużany ani zastępowany. Przy edycji pytanie pojawia się tylko po zmianie daty lub rodzaju.
- Wykorzystujemy obecne rodzaje z przykładami, bez godziny, dystansu, tętna, kalorii, miejsca ani własnej nazwy. Czas to całe zajęcia z rozgrzewką: 60/90/120 min albo własna liczba całkowita 1–480 min.
- „Był sparing” jest dostępne dla każdego rodzaju, a dla „Sparing” zawsze włączone. Intensywność jest wymagana, liczba rund 1–50 opcjonalna; czas pracy i sparingu pozostaje `null`.
- Opcjonalnie do 3 aktywnych ćwiczeń celu, każde raz, ze skalą R1 i „Nie umiem ocenić”. Nie mają `workoutItemId`. Miejsce wynika z rodzaju; przy „Mieszany” i „Kondycja” wybiera je użytkownik. Zmiana rodzaju przelicza miejsce, a przejście do tych dwóch rodzajów wymaga ponownego wyboru.
- Notatki R2 działają jak po planie: poprzednia otwarta notatka, pytanie „lepiej / bez zmian / nie sprawdzono” i nowa notatka. „Lepiej” zamyka, nowa zastępuje. Wpis wcześniejszy niż otwarta notatka o nią nie pyta. Sesja i notatki zapisują się razem, także offline.
- Ręczne oceny trafiają do trendu w Postępie, wiersz prowadzi do poprawy wpisu. Ćwiczenie celu z taką oceną można schować, ale nie usunąć. Ukończony wpis zalicza cel rodzaju w planie tygodnia, a nie cel konkretnego planu; liczy się do tygodniowej liczby, czasu i obciążenia oraz wykresu 12 tygodni. Nieznane czasy nie są zerami.

## Pozostałe ćwiczenia

Opcjonalnie, pod „Oceń pozostałe” (Q1). Pytanie: **Jak oceniasz wykonanie tego ćwiczenia?**

1. Nie udało się wykonać zgodnie z założeniem.
2. Dużo błędów i mała kontrola.
3. Częściowo poprawnie, ale nierówno.
4. Dobrze i powtarzalnie.
5. Bardzo dobrze, swobodnie i pod kontrolą.

Te oceny nie tworzą trendów.

## RPE i obciążenie (Q2)

- Session-RPE 0–10 dla całego treningu, według Fostera.
- Pytanie po 10 minutach wyciszenia. Zapisujemy moment odpowiedzi, żeby znać opóźnienie oceny.
- Gdy RPE brakuje, strona główna przypomina o nim. Powiadomienia push to rozszerzenie, bo wymagają planu Blaze.
- **Obciążenie** = RPE × minuty czasu treningu. Zawsze pokazujemy obok czas i RPE osobno, żeby było widać, skąd wzrosło.

## Intensywność sparingu (Q4)

- Blok sparingu w planie ma intensywność: lekki, techniczny albo twardy. Podsumowanie ją podpowiada i pozwala zmienić.
- Ręczny wpis sparingu ma intensywność i opcjonalną liczbę rund. Szybki stoper z rodzajem „sparing” ma intensywność, a rundy liczy sam.
- Podsumowanie tygodnia pokazuje liczbę twardych rund jako informację. Bez „bezpiecznych” progów i bez sugestii, że licznik chroni zdrowie.

## Notatka

Jedno pole tekstowe (do 1000 znaków) z podpowiedziami: co zadziałało, jaki błąd się powtarzał, co zrobić następnym razem.

## Gotowość przed treningiem (Q3)

- Cztery pytania 1–5: sen, zmęczenie, bolesność mięśni, stres. Raz dziennie, przed pierwszym treningiem.
- Domyślnie wyłączona. Włącza ją zgoda na dane o zdrowiu, wspólna z wagą. Wycofanie zgody usuwa te dane.
- Porównanie z własną normą dopiero po około 2 tygodniach wpisów. Bez wyniku 0–100 i bez zaleceń typu „nie trenuj”.

## Podsumowanie tygodnia (Q5, R3)

Zaimplementowany moduł R3 to lista celów na tydzień bez przypisywania dni: konkretne plany (także powtórzone) lub rodzaje treningu. Home pokazuje skrót, a „Postęp” szczegóły, wybór tygodnia, edycję i świadome kopiowanie wybranych lub wszystkich pozycji poprzedniego planu, także ukończonych. Kopia ma nowe ID i nie przenosi sesji ani statusów; niewykonane pozycje nie przechodzą automatycznie. Limit to 14 pozycji. Można zmienić dawny cel; trwała flaga `editedAfterWeekEnd` daje oznaczenie „Plan zmieniony po zakończeniu tygodnia”.

Pasek R3 pokazuje **tylko ukończone pozycje**: dwa ukończone i jeden częściowy przy celu trzech dają 2 z 3. Najpierw dopasowujemy ukończone sesje do dokładnych planów, potem pozostałe ukończone do rodzaju. Dopiero potem częściowe: dokładny plan, następnie rodzaj. W fazach porządek to `workoutDate`, `startedAt` lub `createdAt` dla ręcznych, następnie `id`; pozycje zachowują kolejność listy. Sesja zalicza najwyżej jedną pozycję. Ukończony w piątek ma pierwszeństwo przed częściowym we wtorek; wtorkowy staje się dodatkowy. Kategorie muszą być identyczne (`mixed` nie jest dowolnym rodzajem), ID planu nie zastępujemy nazwą. Szczegóły modelu: `database-model.md`.

Ukończone, częściowe, niewykonane i dodatkowe mają osobne liczniki; pasek nie przekracza 100%. Bez ustalonego celu (brak dokumentu lub pusta lista po poprawnym odczycie) pokazujemy liczbę treningów i ułożenie planu, bez paska i „dodatkowych”. Dane niepełne, loading i błąd nie są zerem. Liczenie opiera się wyłącznie na zapisanym `workoutDate`, bez przesuwania historii przy zmianie strefy. Edycja celu przelicza dotychczasowe sesje, nie zmieniając dziennika.

Wdrożony **Q5 etap 1**: na ekranie wybranego tygodnia, także podczas edycji celu, podsumowanie treningów z dziennika pokazuje liczbę wszystkich, ukończonych i częściowych sesji, sumę czasu treningu, czas pracy i sparingu z pokryciem danych oraz „RPE w X z Y treningów” (0 jest oceną). Liczymy zapisany `workoutDate` od poniedziałku do niedzieli, niezależnie od celu. Nieznane czasy nie są zerami; niepełna lub błędna historia blokuje sumy, a lokalne zapisy zachowują oznaczenie oczekiwania na wysłanie.

Wdrożony **Q5 etap 2**: ta sama sekcja pokazuje obciążenie tygodnia jako sumę RPE × (`durationSeconds` / 60) w jednostkach umownych (j.u.), liczoną w locie i niezapisywaną w bazie. Czas treningu i RPE pozostają widoczne osobno. Przy brakach RPE etykieta brzmi „Zarejestrowane obciążenie”, obok jest „RPE w X z Y treningów”, informacja, że suma obejmuje tylko treningi z RPE, oraz „Czas treningów z RPE”; bez żadnego RPE pokazujemy „Brak danych”, nie 0. RPE 0 daje znane obciążenie 0. Zwijane „Szczegóły obciążenia” wymieniają sesje tygodnia od najnowszej: datę, nazwę, czas treningu, RPE i obciążenie.

Wdrożony **Q5 etap 3**: pod podsumowaniem jest wykres 12 tygodni kończących się wybranym tygodniem; zmiana tygodnia przesuwa okno. Domyślnie słupki pokazują liczbę treningów, a przełącznik „Minuty” sumę `durationSeconds` / 60 zaokrągloną w górę jak w podsumowaniu. Wszystkie źródła i oba statusy liczymy według zapisanego `workoutDate`, od poniedziałku do niedzieli, tą samą funkcją co podsumowanie. Pusty tydzień ma wartość 0; bieżący ma pusty słupek i podpis „trwa”, wybrany — obrys i pogrubiony podpis. Opis dla czytników ekranu i zwijane „Pokaż dane” udostępniają wersję tekstową. Własny SVG bez biblioteki (ADR 0011), tokeny jasnego i ciemnego motywu, bez animacji. Przy błędzie, ładowaniu lub niepełnej historii wykres korzysta ze stanu podsumowania i nie pokazuje pozornych zer. Bez obciążenia na wykresie, trendu, średniej, strzałek, celu tygodnia i kolorów „lepiej/gorzej”.

Dalszy zakres Q5 poniżej pozostaje niezrealizowany: twarde rundy, kompletność ocen ćwiczeń celu i porównania. Etapy 1–3 nie oznaczają ukończenia całego Q5.

Tydzień od poniedziałku do niedzieli, według dnia treningu. Pokazujemy:

- **plan tygodnia, czyli cel:** np. „zaplanowane 3: ukończone 2, częściowe 1, niewykonane 0, dodatkowe 1”, z paskiem 2 z 3, najwyżej 100%;
- liczbę treningów;
- czas treningu, pracy i sparingu;
- sumę obciążenia, obok czas i RPE;
- liczbę twardych rund;
- **kompletność danych**, np. „RPE w 4 z 5 treningów”, „oceny ćwiczeń celu w 2 z 3”. Dzień bez treningu to odpoczynek, a nie brak danych;
- porównanie ze średnią z 3 poprzednich tygodni słowami, np. „więcej niż zwykle”, dopiero gdy są 3 pełne tygodnie danych;
- wdrożony wykres ostatnich 12 tygodni: liczba treningów lub minuty czasu treningu (ADR 0011), bez obciążenia.

Przy wpisie z planu pokazujemy też **porównanie z poprzednim wykonaniem tego samego planu**.

Nie pokazujemy: ACWR, monotonii i strain Fostera, wyniku 0–100, prognoz.

## Testy kontrolne (R4)

- **Test własny** ze stałym protokołem i dopiskiem „pewność nieznana”.
- **Burpees 3 min:** zmiana o 6 powtórzeń lub więcej to prawdziwa zmiana. To test ogólnej sprawności, nie techniki.
- **KAST:** opcjonalnie dla kickboxingu i K-1, z zaleceniem nagrania.
- Każdy test ma **paszport**: miejsce, sprzęt, rozgrzewkę, porę dnia. Przy wyniku zaznaczasz, czy warunki się zgadzały.
- Zalecany odstęp między testami fizycznymi: 4–8 tygodni (AIBA zaleca ocenę 3–4 razy w roku).

## Kierunki rozwoju

Koncentracja 1–5, dyskomfort, realizacja celu 1–5 i odczuwany postęp 1–7 z opcją „Nie mam punktu odniesienia”. Nie wchodzą do wersji finalnej.

## Podsumowanie szybkiego stopera (issue #105)

Trasa `/workout-sessions/:sessionId/feedback` obsługuje również `quickTimer`. Pokazuje czas treningu, pracę i ukończone rundy, wspólną kartę RPE z odliczaniem 10 minut, notatkę oraz zmianę jednego z sześciu rodzajów (bez rozgrzewki, rozluźnienia i „Mieszany”). Nie pokazuje ocen ćwiczeń. Przypomnienie RPE na Start i link „Podsumowanie” w Historii obejmują stoper.

Dla rodzaju „Sparing” intensywność jest opcjonalna: lekki, techniczny lub twardy, z tymi samymi etykietami co w planie. Zmiana rodzaju na sparing tworzy jeden wpis z `blockId: null`, liczbą ukończonych rund i `sparringSeconds = workSeconds`. Zmiana na inny rodzaj usuwa wpis sparingu i zeruje czas sparingu. Ten sam zapis uaktualnia `stepResults[].blockType`, `nameSnapshot` etykietą rodzaju, notatkę i `updatedAt`, po walidacji całego dokumentu; zachowuje RPE i czasy treningu. „Gotowe” wraca do Historii także offline. Intensywność w podsumowaniu treningu z planu pozostaje osobnym zakresem.
