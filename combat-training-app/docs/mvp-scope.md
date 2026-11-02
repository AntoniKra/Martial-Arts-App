# Zakres wersji finalnej

Dokument nadrzędny to `thesis-card.md`. Wiąże temat pracy, a technologie i lista funkcji z karty są punktem wyjścia. Termin aplikacji: około 16 grudnia 2026. Stan ustaleń: 2 listopada 2026.

## Rdzeń (musi być do oddania)

- **Konto:** rejestracja i logowanie e-mailem i hasłem, potwierdzenie adresu, reset hasła, logowanie kontem Google (`adr/0002-email-password-and-google-auth.md`).
- **Backend:** Supabase z bazą PostgreSQL, Row Level Security i migracjami SQL (`adr/0001-supabase-as-baas.md`).
- **Dziennik treningów:** przeglądanie, dodawanie, edycja i usuwanie wpisów z datą, dyscypliną, czasem trwania i notatką.
- **Trzy sposoby dodania treningu:** szybki stoper, trening według planu, ręczny wpis treningu wykonanego poza aplikacją. Każdy kończy się takim samym wpisem w dzienniku. *Przyjęte wstępnie, do konsultacji.*
- **Szybki stoper interwałowy:** liczba rund, czas pracy i odpoczynku, gong, ekran, który nie gaśnie (Wake Lock).
- **Plany treningowe:** kreator, podgląd, zapis, edycja i usuwanie planu oraz odtwarzacz z okrągłym timerem.
- **Cele treningowe:** pasek postępu liczony z dziennika.
- **Profil zawodnika:** historia wagi i statystyki z bazy.
- **Dane po treningu:** ocena ćwiczeń 1–5, RPE 0–10 i notatka. *Wersja robocza, do konsultacji.*
- **Wygląd:** ciemny i jasny motyw z zapamiętanym wyborem, responsywność na telefonie i komputerze.
- **PWA:** instalacja na telefonie, otwieranie przy słabym zasięgu, stoper działający bez sieci, ponowienie zapisu, gdy się nie uda.
- **Wdrożenie** pod publicznym adresem.
- **Testy:** jednostkowe, E2E na trzech rozdzielczościach, wydajnościowe, użyteczności (ankieta SUS) i izolacji danych (RLS na dwóch kontach).

## Ważne (gdy rdzeń jest stabilny)

- Przyciski ±15 s i menu zakończenia treningu z potwierdzeniem w odtwarzaczu.
- Status „przerwany” dla treningu bez żadnej wykonanej rundy, żeby nie zawyżał statystyk.
- Szersze wsparcie offline, jeśli okaże się tanie.

## Kierunki rozwoju (rozdział 6.3 pracy)

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

- Trzy sposoby dodania treningu i zakres danych po treningu: konsultacja z kilkoma modelami AI.
- Analiza postępów, cele, profil i model danych w Supabase: druga runda ustaleń.
- Hosting frontendu, biblioteka PWA, sposób pobierania danych i wykresy: do wyboru z uzasadnieniem w ADR.
