# Zakres wersji finalnej

Dokument nadrzędny to `thesis-card.md`. Wiąże temat pracy, a technologie i lista funkcji z karty są punktem wyjścia. Termin aplikacji: około 16 grudnia 2026. Stan ustaleń: 8 listopada 2026, po researchu literatury, innych aplikacji i praktyki przygotowania zawodnika. Zasada właściciela: jakość przed tempem. Każda funkcja ma realnie pomagać kontrolować postęp.

## Rdzeń (musi być do oddania)

- **Konto:** rejestracja i logowanie e-mailem i hasłem, potwierdzenie adresu, reset hasła, logowanie kontem Google (`adr/0002-email-password-and-google-auth.md`).
- **Backend:** Firebase: Authentication, Cloud Firestore z trybem offline w regionie Warszawa i Hosting, z regułami bezpieczeństwa i ich testami (`adr/0004-firebase-as-baas.md`). Model danych: `database-model.md` (`adr/0008-firestore-document-model.md`), odczyt przez `onSnapshot` (`adr/0007-firestore-reads-with-onsnapshot.md`).
- **Dziennik treningów:** przeglądanie, dodawanie, edycja i usuwanie wpisów z datą, dyscypliną, rodzajem, czasem trwania i notatką.
- **Trzy sposoby dodania treningu:** szybki stoper, trening według planu, ręczny wpis treningu wykonanego poza aplikacją. Każdy kończy się wpisem w tym samym dzienniku, ze statusem (ukończony albo częściowy), czasem treningu, czasem pracy, realizacją i dniem rozpoczęcia (`adr/0005-journal-entry-definitions.md`).
- **Szybki stoper interwałowy:** liczba rund, czas pracy i odpoczynku, gotowe formaty 3 × 3:00 z przerwą 1:00 i 3 × 3:00 z przerwą 0:30 (D1), gong, ekran, który nie gaśnie (Wake Lock).
- **Plany treningowe:** kreator, podgląd, zapis, edycja i usuwanie planu oraz odtwarzacz z okrągłym timerem. W planie do 3 ćwiczeń celu (Q1).
- **Cele treningowe:** plan tygodnia z paskiem postępu. Pozycja to plan z aplikacji albo rodzaj treningu spoza aplikacji, np. sparing w klubie (R3, decyzja z 8.11). To moduł celów z karty pracy.
- **Po treningu** (`feedback-system.md`): ocena ćwiczeń celu według kryterium z opisaną skalą 1–5 (R1), notatka „problem i poprawka” ze sprawdzeniem na kolejnym treningu (R2), ocena pozostałych ćwiczeń opcjonalnie, RPE po 10 minutach wyciszenia z przypomnieniem w aplikacji (Q2), intensywność sparingu i twarde rundy (Q4), notatka.
- **Analiza:** podsumowanie tygodnia z kompletnością danych i wykres 8–12 tygodni (Q5), porównanie z poprzednim wykonaniem tego samego planu, trend ćwiczeń celu.
- **Gotowość przed treningiem:** 4 pytania 1–5, domyślnie wyłączona, włączana zgodą na dane o zdrowiu (Q3).
- **Testy kontrolne:** test własny, burpees 3 min, KAST dla kickboxingu i K-1, z paszportem warunków (R4).
- **Profil zawodnika:** historia wagi (za tą samą zgodą co gotowość) i statystyki z dziennika.
- **Moje dane:** eksport JSON i CSV oraz usunięcie konta ze wszystkimi danymi (Q7).
- **Wygląd:** ciemny i jasny motyw zapamiętany na urządzeniu (D4), responsywność na telefonie i komputerze.
- **PWA:** instalacja na telefonie, otwieranie przy słabym zasięgu, stoper działający bez sieci, zapis treningu bez sieci z wysłaniem po powrocie połączenia, ostrzeżenie przy wylogowaniu z niewysłanymi treningami (D3).
- **Wdrożenie** pod publicznym adresem, automatyczne przez GitHub Actions z podglądem każdego PR (Q11).
- **Testy:** jednostkowe, E2E na trzech rozdzielczościach, wydajnościowe, użyteczności (ankieta SUS) i izolacji danych (reguły Firestore na dwóch kontach).

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

- Biblioteka wykresów i miary na wykresie 8–12 tygodni: przy projekcie ekranu podsumowania, z ADR.
- Opisy stopni skali gotowości: w issue gotowości.
- Rodzaj treningu w szybkim stoperze: w issue stopera.
- Pytanie o trwałe przechowywanie w Firefoksie: zostaje po zalogowaniu albo przechodzi po pierwszym zapisanym treningu.
