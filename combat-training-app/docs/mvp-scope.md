# Zakres wersji finalnej

Dokument nadrzędny to `thesis-card.md`. Wiąże temat pracy, a technologie i lista funkcji z karty są punktem wyjścia. Termin aplikacji: około 16 grudnia 2026. Stan ustaleń przed zamrożeniem funkcji: 22 listopada 2026. Zasada właściciela: jakość przed tempem. Każda funkcja ma realnie pomagać kontrolować postęp.

## Rdzeń (musi być do oddania)

- **Konto:** rejestracja i logowanie e-mailem i hasłem, potwierdzenie adresu, reset hasła, logowanie kontem Google (`adr/0002-email-password-and-google-auth.md`).
- **Backend:** Firebase: Authentication, Cloud Firestore z trybem offline w regionie Warszawa i Hosting, z regułami bezpieczeństwa i ich testami (`adr/0004-firebase-as-baas.md`). Model danych: `database-model.md` (`adr/0008-firestore-document-model.md`), odczyt przez `onSnapshot` (`adr/0007-firestore-reads-with-onsnapshot.md`).
- **Dziennik treningów:** przeglądanie, dodawanie, edycja i usuwanie wpisów z datą, dyscypliną, rodzajem, czasem trwania i notatką.
- **Trzy sposoby dodania treningu:** szybki stoper, trening według planu, ręczny wpis treningu wykonanego poza aplikacją. Każdy kończy się wpisem w tym samym dzienniku, ze statusem (ukończony albo częściowy), czasem treningu, czasem pracy, realizacją i dniem rozpoczęcia (`adr/0005-journal-entry-definitions.md`).
- **Szybki stoper interwałowy:** liczba rund, czas pracy i odpoczynku, wejście przez „+ Nowy”, sześć rodzajów wybieranych przed startem i zmienianych w podsumowaniu, gotowe formaty 3 × 3:00 z przerwą 1:00, 3 × 3:00 z przerwą treningową 0:30 oraz 3 × 2:00 z przerwą 1:00. Własny format: 1–50 rund, praca 0:05–10:00, przerwa 0:00–5:00. Gong, sygnał 10 s i ekran, który nie gaśnie (Wake Lock); wpis w dzienniku z realizacją w rundach i opcjonalną intensywnością sparingu (issue #105).
- **Plany treningowe:** kreator, podgląd, zapis, edycja i usuwanie planu oraz odtwarzacz z okrągłym timerem. W planie do 3 ćwiczeń celu (Q1).
- **Cele treningowe (R3):** stały tydzień jest podstawą datowanego planu v2 z zajęciami klubowymi, treningami własnymi i obsługą zapisanych pozycji odpoczynku. Osobny cel liczby treningów w nowym planie v2 uwzględnia każdy wpis z danego tygodnia, także częściowy i „Poza planem”. Starszy v1 to lista pozycji bez dnia, według planu lub rodzaju, z paskiem ukończonych dopasowań. Odczyt v1 pokazuje go w widoku tygodnia, a pierwsza zmiana zapisuje v2 z zachowaniem zasad zaliczania starszych pozycji. Szczegóły w [ADR 0018](adr/0018-recurring-and-scheduled-weeks.md).
- **Po treningu** (`feedback-system.md`): ocena ćwiczeń celu według kryterium z opisaną skalą 1–5 (R1), notatka „problem i poprawka” ze sprawdzeniem na kolejnym treningu (R2), ocena pozostałych ćwiczeń opcjonalnie, RPE po 10 minutach wyciszenia z przypomnieniem w aplikacji (Q2), intensywność sparingu i twarde rundy (Q4), notatka.
- **Analiza:** podsumowanie tygodnia z pokryciem RPE i zapisanych czasów oraz wykres 12 tygodni w szczegółach tygodnia (Q5), z liczbą treningów i przełącznikiem „Minuty” (`adr/0011-weekly-chart-svg.md`). Po treningu dostępne jest porównanie z poprzednim wykonaniem tego samego planu. Postęp elementów do poprawy pokazuje trend według celu. Decyzja z 22.11 usuwa z wymagań licznik ocen elementów w podsumowaniu tygodnia ([#225](https://github.com/AntoniKra/Martial-Arts-App/issues/225)).
- **Samopoczucie (Q3, issue #146):** 4 pytania 1–5 na Starcie, wyżej = lepiej, domyślnie wyłączone. Osobna zgoda 18+ w Profilu, niezależna od masy ciała. Norma osobista i cztery wykresy w Postępie; kontekst dnia przy RPE we wszystkich źródłach treningu, Historii i „Poprzednio ten plan”. Bez wyniku 0–100 i zaleceń; szczegóły w `feedback-system.md` i ADR 0015.
- **Profil zawodnika:** pomiary masy ciała za osobną zgodą 18+, opcjonalna etykieta kategorii i statystyki z dziennika bez zgody (szczegóły niżej).
- **Moje dane:** eksport JSON i CSV oraz usunięcie konta ze wszystkimi danymi (Q7).
- **Moje ćwiczenia (issue #156):** prywatna biblioteka z edycją, kopiowaniem wbudowanych, ulubionymi, ostatnio używanymi, wyszukiwaniem, archiwizacją i przywracaniem (ADR 0017). Trend i poprzednia ocena nadal po `focusSkillId`, bez drugiego trendu.
- **Wygląd:** ciemny i jasny motyw zapamiętany na urządzeniu (D4), responsywność na telefonie i komputerze.
- **PWA:** instalacja na telefonie, otwieranie przy słabym zasięgu, stoper działający bez sieci, zapis treningu bez sieci z wysłaniem po powrocie połączenia, ostrzeżenie przy wylogowaniu z niewysłanymi treningami (D3).
- **Wdrożenie** pod publicznym adresem, automatyczne przez GitHub Actions z podglądem każdego PR (Q11).
- **Testy:** jednostkowe, E2E na trzech rozdzielczościach, wydajnościowe, użyteczności (ankieta SUS) i izolacji danych (reguły Firestore na dwóch kontach).

## Profil (issue #100)

- Piąta zakładka **Profil** na telefonie i komputerze. Pomiary wymagają zgody i potwierdzenia „Mam ukończone 18 lat”; oba pola na osobnym ekranie są domyślnie niezaznaczone. Reszta aplikacji działa bez zgody.
- Główna liczba to średnia z 7 dni z liczbą pomiarów; wykres własnego SVG pokazuje 12 średnich tygodniowych z przerwami dla tygodni bez danych. Bez przełącznika ukrywania liczb.
- Kategoria to opcjonalny tekst użytkownika 1–20 znaków, wyłącznie etykieta, bez linii limitu i „brakuje X kg”. Jest przechowywana pod tą samą zgodą co pomiary i usuwana przy wycofaniu.
- Jeden pomiar na dzień, z datą jako ID; zastąpienie po ostrzeżeniu. Dopuszczamy daty wsteczne, bez przyszłych; masa 30,0–250,0 kg, zaokrąglona do 0,1.
- Krótka instrukcja ważenia, neutralne słowa i kolory. Bez przypomnień, serii, odznak, BMI, „idealnej wagi”, tkanki tłuszczowej i komunikatu o szybkim spadku.
- Informacja `2026-11` opisuje tylko pomiary i kategorię; nie zawiera gotowości. Obecnie nie obsługujemy starszych wersji informacji (komentarz Claude z 13.11); kolejną zgodę dla Q3 opisuje ADR 0012.
- Wycofanie wymaga sieci, usuwa wszystkie pomiary i kategorię, a zgodę zeruje dopiero w ostatniej partii. Przerwany proces można ponowić. Reguły sprawdzają zgodę przy zapisie pomiarów.
- Statystyki od początku: treningi, czas, rundy sparingu i pierwszy dzień; ostatnie 4 tygodnie: liczby zajęć z każdą częścią i czas według rodzaju (tylko wpisy jednoczęściowe oraz odtwarzacz, bez podziału minut wieloczęściowych zajęć; issue #149). Wszystkie źródła i oba statusy, po `workoutDate`; nieznane wartości nie są zerami.

## Ważne (gdy rdzeń jest stabilny)

- Wznowienie trwającego treningu po odświeżeniu strony (Q8).
- Przyciski ±15 s w odtwarzaczu.
- Szersze wsparcie offline, jeśli okaże się tanie.

## Na później (jeśli czas pozwoli)

- Data walki z odliczaniem (Q9).
- Filtry dziennika (Q9).
- Przypomnienie o RPE przez powiadomienie push po 30 minutach. Wymaga planu Blaze.

## Kierunki rozwoju (rozdział 6.3 pracy)

- Panel trenera i udostępnianie danych zawodnikom.
- Pełna praca offline z synchronizacją.
- Pełny feedback po treningu: koncentracja, dyskomfort, odczuwany postęp 1–7, realizacja celu.
- Kreator kombinacji z pojedynczych technik i „blaknięcie” technik. Prywatna biblioteka weszła do zakresu decyzją z issue #156.
- Tryb siłowy: serie, ciężar, powtórzenia.
- Szablon obozu wstecz od daty walki i podgląd taperingu.
- Notatki wideo (plan Spark nie ma Cloud Storage).
- Serie tygodniowe i odznaki.
- Testy kontrolne (R4): test własny, burpees 3 min i KAST dla kickboxingu i K-1, z paszportem warunków. Decyzję o przeniesieniu z rdzenia zapisuje [ADR 0021](adr/0021-control-tests-deferred.md).
- Zaawansowane trendy i porównania podobnych ćwiczeń.

## Nie robimy

- Informacja o wstrząśnieniu, rejestr walk, plan walki, rejestr urazów (Q9).
- ACWR, monotonia i strain w interfejsie, wynik gotowości 0–100, model Fitness/Fatigue, prognozy.
- Planer cięcia wagi, licznik kalorii, rankingi, pomiar uderzeń, AI Coach, dzienna seria zerowana po przerwie, odznaki za twardy sparing, sztywny automatyczny plan obozu.
- Tryb bez konta.

## Poza zakresem

Funkcje społecznościowe, funkcje AI, integracje ze smartwatchami, komunikaty głosowe, płatności.

## Otwarte decyzje

Brak. Pytanie o trwałe przechowywanie w Firefoksie zamknięto 25.11.2026: prośba (`navigator.storage.persist()`) pojawia się raz na wczytanie strony, po zalogowaniu na konto z potwierdzonym adresem, a nie na ekranie logowania (`PersistentStorageOnSignIn`, ADR 0004).
