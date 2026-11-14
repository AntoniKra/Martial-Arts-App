# Screeny do sprawozdania

Wrzuć tu pliki PNG:

- `01-home.png`
- `02-plany.png`
- `03-historia.png`
- `04-kreator.png`
- `05-szczegoly.png`
- `06-player-praca.png`
- `07-player-rest.png`
- `08-completed.png`
- `09-light-mode.png`

Potem otwórz `../sprawozdanie-demo.html` w przeglądarce — obrazki wczytają się automatycznie. Przycisk **Drukuj / PDF** zapisze dokument.

## Powtarzalna trasa wszystkich ekranów

W katalogu `combat-training-app` uruchom `npm run screenshots:tour` (zainstalowane zależności npm, Chromium Playwright i Java 21).
Polecenie samo uruchamia emulatory Auth i Firestore projektu `demo-combat-training`, buduje aplikację i otwiera ją lokalnie.
Nie łączy się z rzeczywistym projektem Firebase. Trasa ma osobną konfigurację i rozszerzenie `.tour.ts`: zwykłe `npm run test:e2e` oraz CI jej nie uruchamiają.
Podgląd używa osobnego buildu w `test-results/screenshots-tour-app/`, a przeglądarka blokuje żądania poza localhost.
Porty 8080, 9099 i 4173 muszą być wolne; trasa nie zatrzymuje innych lokalnych testów.

Zegar jest ustawiony przed logowaniem na **19.11.2026, 18:00 czasu polskiego**. Konto pokazowe to fikcyjny zawodnik kickboxingu:
3 plany z blokami, 3 ćwiczenia celu z kryteriami i trendem ocen, 27 wpisów z 10 tygodni (plan, stoper ze sparingiem, zajęcia w klubie),
3 treningi częściowe, tydzień regeneracji bez treningów, poprawka sprawdzona na kolejnym treningu, RPE i notatki,
plany bieżącego i poprzedniego tygodnia, zgoda na dane o zdrowiu, 20 pomiarów masy ciała i etykieta kategorii −75 kg.
Każdy wariant ekranu ma odizolowaną kopię tych samych danych. W trakcie trasy powstają dodatkowo dwa wpisy z odtwarzacza.

Wynik znajduje się w ignorowanym przez Git `combat-training-app/screenshots-tour/`: pliki `NN-ekran-telefon-ciemny.png` itd.,
galeria `index.html`, manifesty wariantów i `report.json` z liczbą zrzutów, czasem, stanem przebiegu i pominięciami.
Zrzuty są pełnostronicowe, w rozmiarach 360×800 i 1440×900, w obu motywach. Nie commituj wyników.
Przebieg nie ma ponowień. Niepełny przebieg zwraca błąd i oznacza galerię jako FAIL.

Pominięto osobny ekran końca odtwarzacza: aplikacja po zapisie od razu przechodzi do podsumowania.
Trasa pokazuje podsumowania planu (z „Poprzednio ten plan” i RPE) oraz stopera; nie zmienia kodu aplikacji, aby zatrzymać przejście.
Ekran usunięcia konta jest tylko otwierany — trasa nigdy nie potwierdza usuwania ani wylogowania z niewysłanymi danymi.
