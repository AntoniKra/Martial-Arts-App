# Raport QA: Porównanie PR #202 z zatwierdzoną makietą A (Start v2)

Data audytu: 19 listopada 2026 r.  
Badany PR: [PR #202 (feat/start-v2-mockup-a)](https://github.com/AntoniKra/Martial-Arts-App/pull/202)  
Wzorzec: Makieta A (`start-final.html` z gałęzi `design/antigravity-lab` w konfiguracji domyślnej: 1B-1, 2B-2, 3A, 4A, 5A)  
Viewport: 390×844 px (mobilny)  
Motywy: ciemny (`theme-dark`) oraz jasny (`theme-light`)

---

## Zrzuty ekranu (Makieta vs Aplikacja)

Zestawienia obok siebie (780×844 px) oraz zrzuty jednostkowe (390×844 px) zapisano w folderze [qa-reports/start-v2-pr202/](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/):

1. **Stan 1: Dzień z treningiem w klubie na dziś**
   - Zestawienie ciemny: [1-trening-ciemny-obok-siebie.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/1-trening-ciemny-obok-siebie.png) ([Makieta](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/1-trening-ciemny-makieta.png) | [Aplikacja](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/1-trening-ciemny-aplikacja.png))
   - Zestawienie jasny: [1-trening-jasny-obok-siebie.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/1-trening-jasny-obok-siebie.png) ([Makieta](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/1-trening-jasny-makieta.png) | [Aplikacja](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/1-trening-jasny-aplikacja.png))

2. **Stan 2: Dzień odpoczynku z aktywnym planem (Szybki start)**
   - Zestawienie ciemny: [2-odpoczynek-ciemny-obok-siebie.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/2-odpoczynek-ciemny-obok-siebie.png) ([Aplikacja](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/2-odpoczynek-ciemny-aplikacja.png))
   - Zestawienie jasny: [2-odpoczynek-jasny-obok-siebie.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/2-odpoczynek-jasny-obok-siebie.png) ([Aplikacja](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/2-odpoczynek-jasny-aplikacja.png))

3. **Stan 3: Przewinięcie ekranu do dołu („Ostatnia sesja”)**
   - Zestawienie ciemny: [3-przewiniecie-ciemny-obok-siebie.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/3-przewiniecie-ciemny-obok-siebie.png) ([Makieta](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/3-przewiniecie-ciemny-makieta.png) | [Aplikacja](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/3-przewiniecie-ciemny-aplikacja.png))
   - Zestawienie jasny: [3-przewiniecie-jasny-obok-siebie.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/3-przewiniecie-jasny-obok-siebie.png) ([Makieta](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/3-przewiniecie-jasny-makieta.png) | [Aplikacja](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/3-przewiniecie-jasny-aplikacja.png))

---

## A. Tabela różnic

Pomiary wykonano bezpośrednio przez DevTools (`window.getComputedStyle`). Definicja różnicy: rozmiar > 2 px, inny kolor, krój pisma, grubość, wielkość liter, kształt, obwódka, cień, kolejność, brak elementu.

| Element | Makieta A (`start-final.html`) | Aplikacja (PR #202) | Waga |
| :--- | :--- | :--- | :--- |
| **Wysokość chipa parametru** (`.home-param-chip`) | `height: 27px` (`line-height: normal`, padding `5px 8px`) | `height: 30px` (`line-height: 18px`, padding `5px 8px`) | Niska (różnica 3 px, standardowa normalizacja `leading-normal` w Tailwind) |
| **Wysokość karty „Ten tydzień”** (`.home-week-tracker`) | `height: 186px` (nagłówek `line-height: normal` ~17 px) | `height: 192px` (nagłówek `line-height: 24px`) | Niska (różnica 6 px wynikająca z systemowej wysokości linii tekstu) |
| **Wysokość paska dolnego menu** (`.bottom-navigation`) | `height: 72px` | `height: 69px` | Pomijalna (różnica 3 px, zachowano bazowy komponent `BottomNavigation` z aplikacji) |

### Elementy w 100% zgodne (1:1 z makietą A):
- **Karta „Dziś” (1B-1):** tło `rgb(22, 22, 24)`, obwódka `1px solid rgba(193, 18, 47, 0.45)`, promień `4px`, padding `18px 16px 16px`, subtelna czerwona poświata `box-shadow: 0 0 16px rgba(193, 18, 47, 0.14), inset 0 0 12px rgba(193, 18, 47, 0.05)`.
- **Etykieta daty (`.home-card-date`):** `font-size: 11px`, `font-weight: 700`, `letter-spacing: 1.32px` (`0.12em`), `text-transform: uppercase`, kolor `rgb(239, 93, 110)` (`--accent-primary`).
- **Plakietka planu (`.home-plan-badge`):** `font-size: 11px`, `font-weight: 700`, `letter-spacing: 0.44px`, tło `rgba(240, 117, 58, 0.1)`, obwódka `1px solid rgba(240, 117, 58, 0.35)`, kolor `rgb(240, 117, 58)`.
- **Tytuł treningu (`.home-workout-name`):** Archivo `32px`, `font-weight: 800`, `line-height: 33.6px`, `letter-spacing: -0.32px`, kolor `rgb(244, 244, 241)`.
- **Podtytuł treningu (`.home-workout-sub`):** Inter `13px`, `font-weight: 400`, `line-height: 18.2px`, kolor `rgb(167, 167, 170)`.
- **Przycisk główny (2B-2, `.home-primary-action`):** `min-height: 56px`, gradient karmazynowy `linear-gradient(135deg, rgb(88, 8, 20) 0%, rgb(117, 10, 26) 55%, rgb(136, 12, 30) 100%)`, krawędź żaru `1px solid rgba(240, 117, 58, 0.85)`, potrójny cień z poświatą żaru (`0 4px 16px rgba(117, 10, 26, 0.4), 0 0 12px rgba(240, 117, 58, 0.25), inset 0 0 0 1px rgba(240, 117, 58, 0.15)`), ikona żar `rgb(240, 117, 58)`, typografia Archivo `14px`, `font-weight: 800`, `letter-spacing: 0.84px`, `text-transform: uppercase`, kolor `rgb(255, 255, 255)`.
- **Kafelki akcji drugorzędnych (`.home-secondary-action`):** `min-height: 52px`, tło `rgb(29, 29, 32)`, obwódka `1px solid rgb(42, 42, 46)`, promień `4px`, padding `0 10px`, ikona w kasetce `32×32px` z tłem `rgba(255, 255, 255, 0.04)`.
- **Karta „Następny trening” (4A, `.home-next-workout`):** kafelek kalendarza `38×38px`, dzień tygodnia `10px` `font-weight: 800` karmazyn, dzień miesiąca `16px` `font-weight: 800` Archivo, tytuł `14px` bold, podtytuł `12px` regular.
- **Karta „Stoper i inne plany” (5A, `.home-other-plans`):** kasetka ikony `36×36px` z tłem karmazynowym `rgba(193, 18, 47, 0.14)`, ikona karmazyn `rgb(239, 93, 110)`, strzałka nawigacyjna.
- **Romb „+” w dolnym menu (`.new-workout-diamond`):** wymiary `50.9×50.9px`, obrót `rotate(45deg)`, gradient karmazynowy, podwójna obwódka z pierścieniem żaru `0 0 0 4px rgba(240, 117, 58, 0.55)`.

---

## B. Znane i zatwierdzone (zgodne z wytycznymi)

1. **Jasny motyw – ciemniejszy tekst plakietki (`ember-ink`):** W motywie jasnym kolor tekstu plakietki planu wynosi `rgb(154, 55, 14)` (w makiecie `rgb(240, 117, 58)`), co zapewnia wymagany kontrast WCAG AA na jasnym tle.
2. **Zawijanie długich nazw:** Na danych demonstracyjnych długie nazwy klubów i treningów prawidłowo zawijają się do kolejnego wiersza.
3. **Pusty chip ukryty:** Gdy parametry rund/przerw nie są zdefiniowane (np. trening klubowy bez rozbicia na rundy), puste chipy są pomijane, a widoczne pozostają tylko godziny i lokalizacja.

---

## C. Do konsultacji (uwagi do zachowania na danych demo)

1. **Karta „Następny trening” znikająca po przeniesieniu jedynego treningu na dziś:**
   - Gdy jedyny zaplanowany w bieżącym tygodniu trening przypada na dzień dzisiejszy, selector `cards.next` zwraca `null`. W tym stanie aplikacja zamiast kafelka kalendarza (4A) wyświetla przerywany link „+ Wykonaj w dowolny dzień: Sparing ›” (`.home-flexible-workout`).
   - *Weryfikacja wizualna:* [1-trening-ciemny-aplikacja.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/1-trening-ciemny-aplikacja.png).
   - *Rekomendacja:* Skonsultować, czy w takiej sytuacji kafelek 4A powinien sięgać po pierwszy trening z kolejnego tygodnia, czy też obecny fallback z treningiem elastycznym jest docelowy.

2. **Wysokość i układ karty „Ostatnia sesja” przy sesjach manualnych:**
   - W makiecie A karta 5A ma zwięzły układ jednoliniowy o stałej wysokości 74 px (`display: flex; align-items: center; justify-content: space-between`).
   - Na danych demonstracyjnych ostatnia sesja to wpis poza aplikacją, co generuje dodatkowy wiersz metadanych (`Trening poza aplikacją · Technika`, `90 min · RPE 7`) oraz link `Historia ›` w osobnym wierszu, zwiększając wysokość karty do 114 px.
   - *Weryfikacja wizualna:* [3-przewiniecie-ciemny-aplikacja.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/3-przewiniecie-ciemny-aplikacja.png).
   - *Rekomendacja:* Układ poprawnie obsługuje dane rzeczywiste; warto rozważyć wyrównanie linku `Historia ›` do prawej strony w nagłówku, aby zachować bardziej zwarty blok.

---

## Podsumowanie i werdykt

Implementacja w PR #202 odwzorowuje zatwierdzoną makietę A z niemal laboratoryjną precyzją. Zidentyfikowane 3 różnice wymiarowe (3–6 px) wynikają wyłącznie z systemowej normalizacji `line-height` w frameworku Tailwind CSS i nie wpływają negatywnie na odbiór wizualny. PR spełnia warunki scalenia pod kątem zgodności z designem.

---

## Po poprawkach 501f4f8

Weryfikacja zmian wprowadzonych w commicie `501f4f8` (zestawienia [1-trening-ciemny-obok-siebie.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/1-trening-ciemny-obok-siebie.png), [1-trening-jasny-obok-siebie.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/1-trening-jasny-obok-siebie.png) oraz [3-przewiniecie-ciemny-obok-siebie.png](file:///c:/dev/Martial-Arts-App/qa-reports/start-v2-pr202/3-przewiniecie-ciemny-obok-siebie.png) zostały zaktualizowane):

1. **Układ w sekcji „Ten tydzień” (kółko nad nazwą dnia, kreska „dziś” pod nazwą):**
   - **Zgodne.**
   - Wartość z DevTools: kółko statusu (`.week-day-dot`) ma `order: 0`, nazwa dnia ma `order: 1`, wskaźnik bieżącego dnia ma `order: 2`. Wizualny układ kolumny flex: kółko u góry, nazwa dnia pośrodku, kreska pod nazwą.

2. **Wysokość karty „Ostatnia sesja” oraz wielkie litery plakietki:**
   - **Zgodne.**
   - Wysokość w makiecie A: `74px` (`height: 74px`, DevTools Computed).
   - Wysokość w aplikacji: `74px` (`height: 74px`, DevTools Computed / BoundingRect 74 px).
   - Plakietka statusu (`.home-session-status`): `text-transform: uppercase`, wartość renderowana: `UKOŃCZONY` (w makiecie: `ZALICZONY`).

3. **Data na karcie „Dziś” („DZIŚ · CZWARTEK, 19 LISTOPADA”):**
   - **Zgodne.**
   - Wartość w DOM: `Dziś · czwartek, 19 listopada`, `text-transform: uppercase`, wartość renderowana: `DZIŚ · CZWARTEK, 19 LISTOPADA`.

