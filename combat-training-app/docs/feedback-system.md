# Oceny po treningu i analiza postępu

Stan: 8 listopada 2026. Decyzje właściciela z 4–8 listopada (Q1–Q5, R1–R4). Uzasadnienie: research A i C w projekcie pracy. Pola w bazie: `database-model.md`.

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

- Tylko dla ćwiczeń celu (Q1).
- Średnia to zwykła średnia arytmetyczna ocen z liczbą ocen obok.
- Przy 1–2 ocenach nie pokazujemy strzałek „postępu”, tylko same oceny.
- Zmiana kryterium jest zaznaczona na wykresie, bo oceny według innego kryterium nie są wprost porównywalne.

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

Tydzień od poniedziałku do niedzieli, według dnia treningu. Pokazujemy:

- **plan tygodnia, czyli cel:** np. „zaplanowane 3: ukończone 2, częściowe 1, dodatkowe 1”, z paskiem, który nigdy nie przekracza 100%;
- liczbę treningów;
- czas treningu, pracy i sparingu;
- sumę obciążenia, obok czas i RPE;
- liczbę twardych rund;
- **kompletność danych**, np. „RPE w 4 z 5 treningów”, „oceny ćwiczeń celu w 2 z 3”. Dzień bez treningu to odpoczynek, a nie brak danych;
- porównanie ze średnią z 3 poprzednich tygodni słowami, np. „więcej niż zwykle”, dopiero gdy są 3 pełne tygodnie danych;
- wykres ostatnich 8–12 tygodni. Miary na wykresie wybierzemy przy projekcie ekranu.

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
