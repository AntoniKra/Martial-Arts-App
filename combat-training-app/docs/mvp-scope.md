# Zakres wersji finalnej

Dokument nadrzędny to `thesis-card.md`. Wiąże temat pracy, a technologie i lista funkcji z karty są punktem wyjścia. Termin aplikacji: około 16 grudnia 2026. Stan ustaleń: 8 listopada 2026, po researchu literatury, innych aplikacji i praktyki przygotowania zawodnika. Zasada właściciela: jakość przed tempem. Każda funkcja ma realnie pomagać kontrolować postęp.

## Rdzeń (musi być do oddania)

- **Konto:** rejestracja i logowanie e-mailem i hasłem, potwierdzenie adresu, reset hasła, logowanie kontem Google (`adr/0002-email-password-and-google-auth.md`).
- **Backend:** Firebase: Authentication, Cloud Firestore z trybem offline w regionie Warszawa i Hosting, z regułami bezpieczeństwa i ich testami (`adr/0004-firebase-as-baas.md`). Model danych: `database-model.md` (`adr/0008-firestore-document-model.md`), odczyt przez `onSnapshot` (`adr/0007-firestore-reads-with-onsnapshot.md`).
- **Dziennik treningów:** przeglądanie, dodawanie, edycja i usuwanie wpisów z datą, dyscypliną, rodzajem, czasem trwania i notatką.
- **Trzy sposoby dodania treningu:** szybki stoper, trening według planu, ręczny wpis treningu wykonanego poza aplikacją. Każdy kończy się wpisem w tym samym dzienniku, ze statusem (ukończony albo częściowy), czasem treningu, czasem pracy, realizacją i dniem rozpoczęcia (`adr/0005-journal-entry-definitions.md`).
- **Szybki stoper interwałowy:** liczba rund, czas pracy i odpoczynku, wejście przez „+ Nowy”, sześć rodzajów wybieranych przed startem i zmienianych w podsumowaniu, gotowe formaty 3 × 3:00 z przerwą 1:00, 3 × 3:00 z przerwą treningową 0:30 oraz 3 × 2:00 z przerwą 1:00. Własny format: 1–50 rund, praca 0:05–10:00, przerwa 0:00–5:00. Gong, sygnał 10 s i ekran, który nie gaśnie (Wake Lock); wpis w dzienniku z realizacją w rundach i opcjonalną intensywnością sparingu (issue #105).
- **Plany treningowe:** kreator, podgląd, zapis, edycja i usuwanie planu oraz odtwarzacz z okrągłym timerem. W planie do 3 ćwiczeń celu (Q1).
- **Cele treningowe:** plan tygodnia z paskiem postępu. Pozycja to plan z aplikacji albo rodzaj treningu spoza aplikacji, np. sparing w klubie (R3, decyzja z 8.11). To moduł celów z karty pracy.
- **Po treningu** (`feedback-system.md`): ocena ćwiczeń celu według kryterium z opisaną skalą 1–5 (R1), notatka „problem i poprawka” ze sprawdzeniem na kolejnym treningu (R2), ocena pozostałych ćwiczeń opcjonalnie, RPE po 10 minutach wyciszenia z przypomnieniem w aplikacji (Q2), intensywność sparingu i twarde rundy (Q4), notatka.
- **Analiza:** podsumowanie tygodnia z kompletnością danych i wykres 12 tygodni (Q5): liczba treningów z przełącznikiem „Minuty”, własny SVG (`adr/0011-weekly-chart-svg.md`); porównanie z poprzednim wykonaniem tego samego planu, trend ćwiczeń celu.
- **Gotowość przed treningiem:** 4 pytania 1–5, domyślnie wyłączona, włączana zgodą na dane o zdrowiu (Q3).
- **Testy kontrolne:** test własny, burpees 3 min, KAST dla kickboxingu i K-1, z paszportem warunków (R4).
- **Profil zawodnika:** pomiary masy ciała za osobną zgodą 18+, opcjonalna etykieta kategorii i statystyki z dziennika bez zgody (szczegóły niżej).
- **Moje dane:** eksport JSON i CSV oraz usunięcie konta ze wszystkimi danymi (Q7).
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
- Statystyki od początku: treningi, czas, rundy sparingu i pierwszy dzień; ostatnie 4 tygodnie: czas według rodzaju. Wszystkie źródła i oba statusy, po `workoutDate`; nieznane wartości nie są zerami.

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
- Kreator kombinacji z pojedynczych technik, prywatna biblioteka ćwiczeń, „blaknięcie” technik.
- Tryb siłowy: serie, ciężar, powtórzenia.
- Szablon obozu wstecz od daty walki i podgląd taperingu.
- Notatki wideo (plan Spark nie ma Cloud Storage).
- Serie tygodniowe i odznaki.
- Testy kontrolne dla konkretnych dyscyplin, jeśli testy własne okażą się za słabe.
- Zaawansowane trendy i porównania podobnych ćwiczeń.

## Nie robimy

- Informacja o wstrząśnieniu, rejestr walk, plan walki, rejestr urazów (Q9).
- ACWR, monotonia i strain w interfejsie, wynik gotowości 0–100, model Fitness/Fatigue, prognozy.
- Planer cięcia wagi, licznik kalorii, rankingi, pomiar uderzeń, AI Coach, dzienna seria zerowana po przerwie, odznaki za twardy sparing, sztywny automatyczny plan obozu.
- Tryb bez konta.

## Poza zakresem

Funkcje społecznościowe, funkcje AI, integracje ze smartwatchami, komunikaty głosowe, płatności.

## Otwarte decyzje

- Opisy stopni skali gotowości: w issue gotowości.
- Pytanie o trwałe przechowywanie w Firefoksie: zostaje po zalogowaniu albo przechodzi po pierwszym zapisanym treningu.
