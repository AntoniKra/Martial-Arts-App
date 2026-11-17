# Laboratorium Designu — Start v2 (Spokojny Premium)

Dokumentacja iteracji projektowej ekranu **Start** w kierunku **„Spokojny Premium”**, przygotowana na bazie ustaleń z właścicielem produktu oraz wytycznych z [AGENTS.md](file:///c:/dev/Martial-Arts-App/AGENTS.md), [design-system.md](file:///c:/dev/Martial-Arts-App/combat-training-app/docs/design-system.md) i [ADR 0019](file:///c:/dev/Martial-Arts-App/combat-training-app/docs/adr/0019-crimson-with-ember-visual-direction.md).

Prace zrealizowano w dedykowanym katalogu `design-lab/start-v2/` bez modyfikacji kodu produkcyjnego aplikacji.

---

## 1. Przegląd plików w katalogu `start-v2/`

| Plik | Opis |
| --- | --- |
| [index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html) | Główny pulpit laboratoryjny z podglądem telefonu 390×844, interaktywnym przełącznikiem 6 części ekranu, wyzwalaczami animacji i motywem ciemny/jasny. |
| [start-final.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/start-final.html) | Kompletny, rekomendowany ekran Start łączący warianty 1A, 2A, 3A, 4A, 5A, 6A, z obsługą `postMessage` i parametrów URL. |
| [actions-a.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-a.html) | Wariant A obszaru akcji: zintegrowany przycisk 60 px z podpisem + 2 pigułki 44 px (prezentacja 4 stanów). |
| [actions-b.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-b.html) | Wariant B obszaru akcji: przycisk 56 px + kafelki taktyczne 52 px z ikonami w ramkach (prezentacja 4 stanów). |
| [actions-c.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-c.html) | Wariant C obszaru akcji: przycisk 56 px + przycisk „⋯” z modalnym dolnym Action Sheetem (prezentacja 4 stanów). |
| [actions-d.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-d.html) | Wariant D obszaru akcji: przycisk dzielony (Split-Action) 58 px w proporcji 78% / 22% (prezentacja 4 stanów). |
| [intro-a.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/intro-a.html) | Animacja powitalna A: centralna iskra żaru zbiegająca się w burzę karty „Dziś” (~820 ms). |
| [intro-b.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/intro-b.html) | Animacja powitalna B: laserowy kontur krawędziowy karty i impuls świetlny (~820 ms). |

---

## 2. Obszar przycisków karty „Dziś” (Diagnoza i Warianty A–D)

### Diagnoza problemu
W dotychczasowej implementacji akcje drugorzędne („Nie byłem” i „Przenieś dzień”) były ciężkimi, szarymi przyciskami o jednakowej wadze optycznej co przycisk główny, co rozpraszało zawodnika po wejściu do aplikacji. Głównym celem zawodnika jest zalogowanie treningu („Wpisz trening po zajęciach” lub „Rozpocznij plan”).

Wszystkie warianty zaprojektowano z zachowaniem:
- Celów dotykowych **≥ 44×44 px**.
- Położenia przycisku głównego w **dolnej połowie ekranu 390×844** (w strefie naturalnego zasięgu kciuka).
- Prezentacji **4 stanów interfejsu**: zwykły (default), wciśnięty (`:active`), focus (`:focus-visible` z pierścieniem 2 px `#ef5d6e`), wyłączony (`:disabled`).

```
+-------------------------------------------------------------+
| WARIANT A: Zintegrowany z podpisem (Rekomendowany)          |
| +---------------------------------------------------------+ |
| | [IKONA] WPISZ TRENING PO ZAJĘCIACH                  [>] | |
| |         Rundy, odczucia i błędy z sali                  | |
| +---------------------------------------------------------+ |
| [ (x) Nie byłem ]                  [ (->) Przenieś dzień ]  |
+-------------------------------------------------------------+
| WARIANT B: Kafelki taktyczne                                |
| +---------------------------------------------------------+ |
| | [IKONA] WPISZ TRENING PO ZAJĘCIACH                      | |
| +---------------------------------------------------------+ |
| [ [X] Nie byłem ]                  [ [->] Przenieś dzień ]  |
+-------------------------------------------------------------+
| WARIANT C: Czyste menu ⋯ (Action Sheet)                    |
| +------------------------------------------+  +-----------+ |
| | [IKONA] WPISZ TRENING PO ZAJĘCIACH       |  |    ⋯      | |
| +------------------------------------------+  +-----------+ |
+-------------------------------------------------------------+
| WARIANT D: Przycisk dzielony (Split-Action)                |
| +---------------------------------------------+-----------+ |
| | [IKONA] WPISZ TRENING PO ZAJĘCIACH          |     v     | |
| +---------------------------------------------+-----------+ |
+-------------------------------------------------------------+
```

### Porównanie wariantów akcji:

1. **Wariant A (Zintegrowany z podpisem — `actions-a.html`) — REKOMENDOWANY**:
   - **Co zmieniono:** Główny przycisk ma wysokość 60 px i zawiera dwuwiersz: wyrazisty tytuł Archivo 14 px uppercase oraz pomocniczy opis 11 px („Rundy, odczucia i błędy z sali”). Pod spodem umieszczono dwie równe pigułki 44 px w barwie podwyższonej (`--app-elevated`).
   - **Dlaczego:** Tworzy bezbłędną hierarchię wizualną. Użytkownik natychmiast wie, co wydarzy się po kliknięciu. Akcje negatywne („Nie byłem”) i odraczające („Przenieś”) są łatwo dostępne pod kciukiem, ale nie dominują nad kartą.

2. **Wariant B (Kafelki taktyczne — `actions-b.html`)**:
   - **Co zmieniono:** Przycisk główny 56 px + dwa kwadratowe kafelki 52 px z mikro-ikonami w ramkach 32×32 px.
   - **Dlaczego:** Inspiracja wojskowymi i minimalistycznymi interfejsami sportowymi. Bardzo czytelne cele dotyku, nieco bardziej surowy charakter.

3. **Wariant C (Menu ⋯ Action Sheet — `actions-c.html`)**:
   - **Co zmieniono:** Pełny przycisk główny 56 px oraz kwadratowy przycisk „⋯” 56×56 px po prawej stronie. Kliknięcie „⋯” wysuwa elegancki dolny arkusz (Action Sheet) z 3 opcjami: „Oznacz jako nieodbyty”, „Przenieś dzień w planie”, „Anuluj”.
   - **Dlaczego:** Maksymalna redukcja szumu na samej karcie. Idealne dla sportowców ceniących czysty minimalizm.

4. **Wariant D (Przycisk dzielony Split-Action — `actions-d.html`)**:
   - **Co zmieniono:** Jeden scalony element 58 px podzielony pionową kreską: lewa część (78%) rejestruje trening, prawa (22%) rozwija menu kontekstowe.
   - **Dlaczego:** Oszczędza miejsce pionowe, zachowując obie możliwości w jednym zwartym komponencie.

---

## 3. Animacje powitalne (Intro A vs Intro B)

Zgodnie z wymaganiem obie animacje:
- Uruchamiają się **wyłącznie przy pierwszym wejściu w sesji** (kontrola przez `sessionStorage`).
- Trwają maksymalnie **~820 ms**.
- **Stuknięcie w ekran natychmiast kończy animację** i natychmiast odsłania gotowy ekran.
- **Nie blokują ładowania treści**: treść pod spodem renderuje się równolegle.
- Przy `prefers-reduced-motion: reduce` są **całkowicie pomijane** (użytkownik widzi od razu gotowy interfejs).

### Specyfikacja techniczna animacji powitalnych:

| Parametr | Wariant A: Iskra w burzę (`intro-a.html`) | Wariant B: Kontur i impuls żaru (`intro-b.html`) |
| --- | --- | --- |
| **Koncepcja** | Centralna iskra żaru z pierścieniem energii kurczy się i zbiega w prawy górny róg karty „Dziś”, wywołując rozbłysk burzy (380 ms). | Ekran widoczny od razu; laserowy obrys o podwójnym pigmencie (karmazyn-żar) obiega krawędzie karty (420 ms), po czym generuje impuls świetlny (380 ms). |
| **Czas trwania** | 820 ms | 820 ms |
| **Krzywa przejścia** | `cubic-bezier(0.16, 1, 0.3, 1)` (płynny zryw i miękkie lądowanie) | `cubic-bezier(0.16, 1, 0.3, 1)` |
| **Własności animowane** | Wyłącznie `transform` i `opacity` (akceleracja sprzętowa GPU) | `stroke-dashoffset`, `transform`, `opacity` |
| **Tło wejściowe** | Lekki półprzezroczysty welon `rgba(11, 11, 13, 0.88)` z `backdrop-filter: blur(8px)` | Brak welonu; ekran widoczny natychmiast |
| **Rekomendacja** | **Wariant A** — tworzy silniejsze, bardziej organiczne poczucie „rozpalenia” treningu i płynnie materializuje kartę Startu. |

---

## 4. Katalog mikrointerakcji na ekranie Start

Wszystkie mikrointerakcje opierają się wyłącznie na `transform` i `opacity` w czasie 150–400 ms:

1. **Reakcja na stuknięcie w kartę „Dziś” (`storm-pulse-active`)**:
   - Czas: 380 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
   - Efekt: Błyskawica SVG rozjaśnia się z `opacity: 0.55` do `0.95` ze skalą `scale(1.04)` i poświatą żaru `rgba(240, 117, 58, 0.7)`, po czym płynnie wraca do spoczynku.
2. **Pasek postępu tygodnia (`progress-fill`)**:
   - Czas: 400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
   - Efekt: Rozwijanie paska od 0% do aktualnego stanu (np. 50%) po załadowaniu danych.
3. **Licznik jednostek i procentu (`statCompleted`, `statPercent`)**:
   - Krokowe inkrementowanie cyfr w czasie napełniania paska (0 → 2 jednostki, 0% → 50%), dające poczucie dynamicznego przeliczania danych.
4. **Wskaźniki dni tygodnia (`dot:hover`, `dot:active`)**:
   - Czas: 150 ms, `transform: scale(1.1)`.
   - Zapewnia wyraźny feedback przy dotknięciu dnia bez przesuwania sąsiednich elementów.
5. **Romb „+” w dolnym menu (`nav-diamond:active`)**:
   - Czas: 150 ms, `transform: rotate(45deg) scale(0.92)`.
   - Zwiększenie cienia zewnętrznego `box-shadow` do `rgba(240, 117, 58, 0.85)`.

---

## 5. Tabela alternatyw modułowych (Część → Warianty → Rekomendacja)

Zgodnie z wymaganiem 5a ekran podzielono na 6 części. W [index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html) właściciel projektu może na żywo klikać miniatury wariantów i złożyć własną kompozycję.

| Część ekranu | Dostępne warianty | Czym się różnią | Rekomendacja i dlaczego |
| --- | --- | --- | --- |
| **1. Karta „Dziś” z burzą** | **1A**: Spokojna burza premium<br>**1B**: Poświata krawędziowa<br>**1C**: Krawędź geometryczna | **1A**: Siatka 115°, gradient karmazyn-żar w błyskawicy (55% krycia), górna linia akcentu 2 px.<br>**1B**: Podświetlona ramka karty żarem i karmazynem, wyższy kontrast wyładowania (75%).<br>**1C**: Minimalistyczny trójkątny akcent żaru w rogu, bez pełnej sylwetki błyskawicy. | **Rekomendacja: 1A**.<br>Najbardziej dojrzały wizualnie. Błyskawica stanowi klimatyczne tło, nie zakłócając czytelności białego tekstu nagłówka (kontrast > 7:1). |
| **2. Obszar przycisków** | **2A**: Zintegrowany z podpisem<br>**2B**: Kafelki taktyczne<br>**2C**: Menu ⋯ (Action Sheet)<br>**2D**: Przycisk dzielony (Split) | **2A**: Przycisk 60 px z podtytułem + 2 pigułki 44 px.<br>**2B**: Przycisk 56 px + 2 kwadratowe kafelki 52 px z ikonami w ramkach.<br>**2C**: Przycisk 56 px + kwadrat ⋯ otwierający dolny arkusz.<br>**2D**: Jeden blok 58 px dzielony w proporcji 78% / 22%. | **Rekomendacja: 2A**.<br>Wyjaśnia cel rejestracji po zajęciach, zapobiega pomyłkom i wyraźnie oddziela akcję sukcesu od akcji pobocznych. Spełnia wymóg touch target ≥ 44 px. |
| **3. „Ten tydzień” z kółkami i paskiem** | **3A**: Klasyczne kółka + pasek 6 px<br>**3B**: Klocki segmentowe dzienne<br>**3C**: Radialny miernik + skrócona oś | **3A**: 7 okrągłych wskaźników z ikonami ukończenia, podkreśleniem dziś i poziomym paskiem 50%.<br>**3B**: 7 prostokątnych klocków z etykietami stanu (PN ✓, WT DZIŚ).<br>**3C**: Okrągły pierścień 52 px z wynikiem 2/4 obok opisu tekstowego. | **Rekomendacja: 3A**.<br>Bezpośrednie odwołanie do standardu sportowego (Whoop, Strava), natychmiastowa czytelność rozkładu dni treningowych w tygodniu. |
| **4. Karta „Następny” i „W dowolny dzień”** | **4A**: Kalendarzyk + przerywana ramka<br>**4B**: Lista wierszowa nadchodzących<br>**4C**: Belka taktyczna | **4A**: Plakietka daty 38×38 px (CZW 19) + kasetka z kreskowanym obrysem dla treningu uzupełniającego.<br>**4B**: Dwa zwarte wiersze z datami i czasami trwania.<br>**4C**: Ciemna belka z lewym akcentem żaru 3 px. | **Rekomendacja: 4A**.<br>Kreskowana ramka jednoznacznie komunikuje elastyczność treningu („w dowolny dzień”), a plakietka daty ułatwia orientację w czasie. |
| **5. „Stoper i inne plany” oraz „Ostatnia sesja”** | **5A**: Wiersz skrótu + karta sesji<br>**5B**: Podwójny kafelek 2×1<br>**5C**: Kompaktowa belka metryk | **5A**: Skrót stopera z czerwoną ikoną + karta ostatniej sesji (RPE 7/10, ZALICZONY).<br>**5B**: Dwa równe kafelki obok siebie (stoper po lewej, sesja po prawej).<br>**5C**: Jednolinijkowe podsumowanie z przyciskiem skrótu. | **Rekomendacja: 5A**.<br>Daje zawodnikowi natychmiastowe poczucie ciągłości treningowej (widzi ocenę i wynik wczorajszego wysiłku) oraz szybki dostęp do stopera rundowego. |
| **6. Dolne menu z rombem „+”** | **6A**: Wystający romb 45°<br>**6B**: Zlicowany romb w linii<br>**6C**: Kapsuła sportowa (Pill) | **6A**: Romb 36 px obrócony o 45°, wystający o 18 px ponad belkę z poświatą żaru.<br>**6B**: Romb 30 px umieszczony całkowicie wewnątrz wysokości belki menu.<br>**6C**: Zaokrąglona pigułka z napisem START. | **Rekomendacja: 6A**.<br>Bezpośrednia realizacja decyzji architektonicznej ADR 0019; nadaje aplikacji unikalną tożsamość wizualną wyróżniającą ją spośród generycznych aplikacji fitness. |

---

## 6. Wskazówki implementacyjne dla aplikacji produkcyjnej (React / Tailwind)

1. **Uniknięcie błędu hydratacji przy `sessionStorage`:**
   - W React/Next.js odczyt `sessionStorage` musi odbywać się wewnątrz `useEffect` lub w komponencie z osłoną `useHydrated()`, aby zapobiec rozbieżnościom renderowania serwerowego (SSR).
2. **Akceleracja GPU:**
   - Wszystkie animacje kart i burzy powinny używać klas Tailwind z `transform-gpu` i `will-change: transform`. Należy unikać animowania właściwości `height`, `margin` czy `top`.
3. **Dostępność i tryb ciemny/jasny:**
   - Tokeny barw w [start-final.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/start-final.html) są w 100% zsynchronizowane z `combat-training-app/src/styles/index.css`.
   - W trybie jasnym odcień żaru dla tekstu jest ściemniony do `#9a370e`, co gwarantuje spełnienie kryterium kontrastu WCAG AA (≥ 4.5:1) na jasnym tle `#ffffff` / `#f1f1ef`.
