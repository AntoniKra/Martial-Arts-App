# Zakres wersji finalnej

Dokument nadrzędny to `thesis-card.md`. Wiąże temat pracy, a technologie i lista funkcji z karty są punktem wyjścia. Termin aplikacji: około 16 grudnia 2026. Stan ustaleń: 4 listopada 2026. Zasada właściciela: jakość przed tempem, niczego nie odkładamy z góry. Zakres funkcji ustalimy po researchu literatury, innych aplikacji i praktyki przygotowania zawodnika.

## Rdzeń (musi być do oddania)

- **Konto:** rejestracja i logowanie e-mailem i hasłem, potwierdzenie adresu, reset hasła, logowanie kontem Google (`adr/0002-email-password-and-google-auth.md`).
- **Backend:** Firebase: Authentication, Cloud Firestore z trybem offline w regionie Warszawa i Hosting, z regułami bezpieczeństwa i ich testami (`adr/0004-firebase-as-baas.md`).
- **Dziennik treningów:** przeglądanie, dodawanie, edycja i usuwanie wpisów z datą, dyscypliną, czasem trwania i notatką.
- **Trzy sposoby dodania treningu:** szybki stoper, trening według planu, ręczny wpis treningu wykonanego poza aplikacją. Każdy kończy się wpisem w tym samym dzienniku, ze statusem (ukończony albo częściowy), czasem treningu, czasem pracy, realizacją i dniem rozpoczęcia (`adr/0005-journal-entry-definitions.md`).
- **Szybki stoper interwałowy:** liczba rund, czas pracy i odpoczynku, gong, ekran, który nie gaśnie (Wake Lock).
- **Plany treningowe:** kreator, podgląd, zapis, edycja i usuwanie planu oraz odtwarzacz z okrągłym timerem.
- **Cele treningowe:** pasek postępu liczony z dziennika.
- **Profil zawodnika:** historia wagi i statystyki z bazy.
- **Dane po treningu i ocena postępów:** kierunek właściciela to RPE, notatka i ocena ćwiczeń w rdzeniu. Ostateczny zakres po researchu (listopad 2026).
- **Wygląd:** ciemny i jasny motyw z zapamiętanym wyborem, responsywność na telefonie i komputerze.
- **PWA:** instalacja na telefonie, otwieranie przy słabym zasięgu, stoper działający bez sieci, ponowienie zapisu, gdy się nie uda.
- **Wdrożenie** pod publicznym adresem.
- **Testy:** jednostkowe, E2E na trzech rozdzielczościach, wydajnościowe, użyteczności (ankieta SUS) i izolacji danych (reguły Firestore na dwóch kontach).

## Ważne (gdy rdzeń jest stabilny)

- Przyciski ±15 s i menu zakończenia treningu z potwierdzeniem w odtwarzaczu.
- Szersze wsparcie offline, jeśli okaże się tanie.

## Kierunki rozwoju (rozdział 6.3 pracy)

> Ta lista i sekcja „Ważne” są do ponownej oceny po researchu funkcji. To nie jest decyzja o odłożeniu: właściciel chce najpierw zobaczyć, co daje największą wartość zawodnikowi.

- Panel trenera i udostępnianie danych zawodnikom.
- Pełna praca offline z synchronizacją, np. jako funkcja wersji premium.
- Pełny feedback po treningu: koncentracja, dyskomfort, odczuwany postęp 1–7, realizacja celu.
- Wznowienie trwającego treningu po odświeżeniu strony.
- Kreator kombinacji z pojedynczych technik i prywatna biblioteka ćwiczeń.
- Tryb siłowy: serie, ciężar, powtórzenia.
- Check-in przed treningiem: energia, stres, zmęczenie.
- Zaawansowane trendy i porównania podobnych ćwiczeń.

## Poza zakresem

Funkcje społecznościowe, funkcje AI, integracje ze smartwatchami, komunikaty głosowe, płatności.

## Otwarte decyzje

- Zakres danych po treningu, sposób oceny postępów i lista funkcji: po researchu literatury, innych aplikacji i praktyki przygotowania zawodnika.
- Cele, profil, analiza i model danych w Firestore: po researchu, w dalszej rundzie ustaleń.
- Sposób pobierania danych w aplikacji i biblioteka wykresów: do wyboru z uzasadnieniem w ADR. Hosting (Firebase Hosting) i PWA (`adr/0003-pwa-with-vite-plugin-pwa.md`) są już ustalone.
