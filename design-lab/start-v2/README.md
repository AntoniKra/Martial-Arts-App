# Laboratorium Designu — Start v2 (Spokojny Premium)

Dokumentacja iteracji projektowej ekranu **Start** w kierunku **„Spokojny Premium”**, przygotowana na bazie ustaleń z właścicielem produktu oraz wytycznych z [AGENTS.md](file:///c:/dev/Martial-Arts-App/AGENTS.md), [design-system.md](file:///c:/dev/Martial-Arts-App/combat-training-app/docs/design-system.md) i [ADR 0019](file:///c:/dev/Martial-Arts-App/combat-training-app/docs/adr/0019-crimson-with-ember-visual-direction.md).

Prace zrealizowano w dedykowanym katalogu `design-lab/start-v2/` bez modyfikacji kodu produkcyjnego aplikacji.

---

## 1. Wybór właściciela: Kompozycja domyślna

Właściciel projektu dokonał wyboru zatwierdzonej kompozycji ekranu Start:

$$\mathbf{1B} \cdot \mathbf{2B} \cdot \mathbf{3A} \cdot \mathbf{4A} \cdot \mathbf{5A} \cdot \mathbf{6A} \quad (\text{ciemny})$$

Kompozycja ta została ustawiona jako **domyślna** w [index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html) oraz w [start-final.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/start-final.html).

---

## 2. Dopracowanie części 1B (Karta „Dziś” — Czerwona obwódka)

Zgodnie z wytycznymi właściciela, pomarańczowe podświetlenie wokół karty zostało **zastąpione czerwonym** (karmazyn, tokeny `--app-crimson` `#c1122f`, `--app-crimson-ink` `#ef5d6e`, gradient główny `--app-grad-primary`) i uczynione znacznie **bardziej subtelnym**.

> [!IMPORTANT]
> **Zasada separacji akcentów:** Żar (`#f0753a`) występuje **wyłącznie w samej burzy** (gradient błyskawicy SVG, iskry) oraz plakietkach planu, natomiast obwódka karty oraz jej poświata korzystają **wyłącznie z karmazynu**.

W panelu „Alternatywy” przygotowano 3 warianty obwódki:

1. **1B-1: Statyczna, cienka czerwona obwódka (Wybór właściciela — domyślny)**
   - Cienka, precyzyjna krawędź `border: 1px solid rgba(193, 18, 47, 0.45)`.
   - Bardzo delikatne, nienachalne czerwone światło `box-shadow: 0 0 16px rgba(193, 18, 47, 0.14), inset 0 0 12px rgba(193, 18, 47, 0.05)`.
   - Całkowity brak ruchu — surowy, elegancki spokój premium.

2. **1B-2: Animowana obwódka — czerwony obieg krawędziowy (conic-gradient)**
   - Czerwony refleks (`conic-gradient` na obracającym się elemencie o akceleracji GPU) powoli obiega krawędź karty przy wejściu na ekran: 1 okrążenie w czasie **1,4 s** (`cubic-bezier(0.2, 0.8, 0.25, 1)`), po czym wygasza się do subtelnego stanu spoczynkowego.
   - **Przełącznik trybu w panelu Alternatyw**:
     - *Tryb A (domyślny)*: 1 okrążenie przy wejściu (1,4 s), potem spokój.
     - *Tryb B (opcjonalny)*: Stały, ledwie widoczny, bardzo wolny puls co 4,5 s (`opacity: 0.15` $\leftrightarrow$ `0.7`).
   - Wewnętrzna maska z `background: var(--app-surface)` odsłania wyłącznie 1-pikselowy obwód karty.

3. **1B-3: Impuls przy wejściu od burzy**
   - Obwódka rozjaśnia się dynamicznie raz od prawego górnego rogu (gdzie uderza burza SVG) za pomocą radialnego gradientu i poświaty narożnej (`rgba(239, 93, 110, 0.45)`).
   - Wygaszenie w czasie **950 ms** (`cubic-bezier(0.16, 1, 0.3, 1)`) do subtelnej czerwieni bazowej 1B-1.

> [!NOTE]
> Wszystkie animacje korzystają **wyłącznie z `transform` i `opacity`**. Przy `prefers-reduced-motion: reduce` wszelki ruch jest wyłączany, a karta renderuje bezpieczną, statyczną obwódkę 1B-1.

---

## 3. Przegląd plików w katalogu `start-v2/`

| Plik | Opis |
| --- | --- |
| [index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html) | Główny pulpit laboratoryjny z podglądem telefonu 390×844, interaktywnym przełącznikiem 6 części ekranu, wyzwalaczami animacji i motywem ciemny/jasny. |
| [start-final.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/start-final.html) | Kompletny ekran Start z domyślną kompozycją właściciela (**1B-1 · 2B · 3A · 4A · 5A · 6A**), z obsługą `postMessage` i parametrów URL. |
| [actions-a.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-a.html) | Wariant A obszaru akcji: zintegrowany przycisk 60 px z podpisem + 2 pigułki 44 px (prezentacja 4 stanów). |
| [actions-b.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-b.html) | Wariant B obszaru akcji: przycisk 56 px + kafelki taktyczne 52 px z ikonami w ramkach (Wybór właściciela). |
| [actions-c.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-c.html) | Wariant C obszaru akcji: przycisk 56 px + przycisk „⋯” z modalnym dolnym Action Sheetem. |
| [actions-d.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-d.html) | Wariant D obszaru akcji: przycisk dzielony (Split-Action) 58 px w proporcji 78% / 22%. |
| [intro-a.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/intro-a.html) | Animacja powitalna A: centralna iskra żaru zbiegająca się w burzę karty „Dziś” (~820 ms). |
| [intro-b.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/intro-b.html) | Animacja powitalna B: laserowy kontur krawędziowy karty i impuls świetlny (~820 ms). |

---

## 4. Przyciski nawigacyjne w `index.html`

W górnym pasku studia [index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html) udostępniono szybkie narzędzia podglądu:

- **„Odtwórz animacje Startu”**: natychmiast odtwarza mikrointerakcje ekranu Start w ramce telefonu (licznik jednostek 0 $\rightarrow$ 2, napełnianie paska postępu 0% $\rightarrow$ 50%, rozbłysk burzy oraz obieg / impuls obwódki karty „Dziś”).
- **„Powitanie A”**: wczytuje Powitanie A (Iskra zbiegająca się w burzę) bezpośrednio do ramki telefonu z paskiem powrotu do Startu oraz opcją otwarcia w osobnym oknie.
- **„Powitanie B”**: wczytuje Powitanie B (Laserowy kontur krawędziowy i impuls) bezpośrednio do ramki telefonu.
- **„Wybór właściciela”**: jednym kliknięciem przywraca wybraną kompozycję `1B-1 · 2B · 3A · 4A · 5A · 6A (Ciemny)`.

---

## 5. Tabela alternatyw modułowych (Część $\rightarrow$ Warianty $\rightarrow$ Decyzja)

| Część ekranu | Dostępne warianty | Czym się różnią | Decyzja / Rekomendacja |
| --- | --- | --- | --- |
| **1. Karta „Dziś” z burzą** | **1B-1**: Czerwona obwódka statyczna<br>**1B-2**: Czerwony obieg krawędzi (1,4s)<br>**1B-3**: Impuls wejściowy z rogu<br>**1A**: Spokojna burza klasyczna<br>**1C**: Krawędź geometryczna | **1B-1**: Cienka czerwona krawędź z bardzo subtelną poświatą karmazynu, brak ruchu.<br>**1B-2**: Obracający się refleks `conic-gradient` (1 okrążenie 1,4s; przełącznik stałego pulsu co 4s).<br>**1B-3**: Impuls rozjaśniający od rogu burzy wygasający w 950 ms.<br>**1A**: Siatka 115°, krycie błyskawicy 55%.<br>**1C**: Minimalistyczny trójkąt żaru w rogu. | **Wybór właściciela: 1B**.<br>Podwariant **1B-1** zapewnia maksymalny spokój i czystość premium. Podwariant **1B-2** dodaje subtelny, technologiczny akcent wejścia bez odwracania uwagi od treści. |
| **2. Obszar przycisków** | **2B**: Kafelki taktyczne<br>**2A**: Zintegrowany z podpisem<br>**2C**: Menu ⋯ (Action Sheet)<br>**2D**: Przycisk dzielony (Split) | **2B**: Przycisk 56 px + 2 kwadratowe kafelki 52 px z ikonami w ramkach.<br>**2A**: Przycisk 60 px z podpisem dwuwierszowym + 2 pigułki 44 px.<br>**2C**: Przycisk 56 px + kwadrat ⋯ otwierający dolny arkusz.<br>**2D**: Blok 58 px dzielony w proporcji 78% / 22%. | **Wybór właściciela: 2B**.<br>Wyrazisty, zdyscyplinowany charakter sportowy; duże, niezależne cele dotyku (52 px) dla akcji pobocznych. |
| **3. „Ten tydzień” z kółkami i paskiem** | **3A**: Klasyczne kółka + pasek 6 px<br>**3B**: Klocki segmentowe dzienne<br>**3C**: Radialny miernik + skrócona oś | **3A**: 7 okrągłych wskaźników z ikonami ukończenia, podkreśleniem dziś i poziomym paskiem 50%.<br>**3B**: 7 prostokątnych klocków z etykietami stanu (PN ✓, WT DZIŚ).<br>**3C**: Okrągły pierścień 52 px z wynikiem 2/4. | **Wybór właściciela: 3A**.<br>Bezpośrednie odwołanie do sportowych standardów Whoop/Strava; czytelny rozkład dni treningowych. |
| **4. Karta „Następny” i „W dowolny dzień”** | **4A**: Kalendarzyk + przerywana ramka<br>**4B**: Lista wierszowa nadchodzących<br>**4C**: Belka taktyczna | **4A**: Plakietka daty 38×38 px (CZW 19) + kasetka z kreskowanym obrysem dla treningu uzupełniającego.<br>**4B**: Dwa zwarte wiersze z datami i czasami trwania.<br>**4C**: Ciemna belka z lewym akcentem żaru 3 px. | **Wybór właściciela: 4A**.<br>Kreskowana ramka jednoznacznie komunikuje elastyczność jednostki uzupełniającej. |
| **5. „Stoper i inne plany” oraz „Ostatnia sesja”** | **5A**: Wiersz skrótu + karta sesji<br>**5B**: Podwójny kafelek 2×1<br>**5C**: Kompaktowa belka metryk | **5A**: Skrót stopera z czerwoną ikoną + karta ostatniej sesji (RPE 7/10, ZALICZONY).<br>**5B**: Dwa równe kafelki obok siebie (stoper po lewej, sesja po prawej).<br>**5C**: Jednolinijkowe podsumowanie z przyciskiem skrótu. | **Wybór właściciela: 5A**.<br>Utrzymuje ciągłość treningową (ocena wczorajszej sesji) oraz szybki start wolnej rundy. |
| **6. Dolne menu z rombem „+”** | **6A**: Wystający romb 45°<br>**6B**: Zlicowany romb w linii<br>**6C**: Kapsuła sportowa (Pill) | **6A**: Romb 36 px obrócony o 45°, wystający o 18 px ponad belkę z poświatą żaru.<br>**6B**: Romb 30 px umieszczony wewnątrz belki.<br>**6C**: Zaokrąglona pigułka z napisem START. | **Wybór właściciela: 6A**.<br>Zgodny z decyzją architektoniczna ADR 0019; nadaje aplikacji unikalną tożsamość wizualną. |

---

## 6. Wskazówki techniczne dla aplikacji produkcyjnej (React / Tailwind)

1. **Kompozycja czerwonej obwódki w Tailwind:**
   - Obwódka: `border border-crimson/45 shadow-[0_0_16px_rgba(193,18,47,0.14)]`.
   - Zapewnia to natywną zgodność z tokenami z `combat-training-app/src/styles/index.css`.
2. **Animacja obiegu krawędziowego (1B-2):**
   - Warstwa obrotowa powinna korzystać wyłącznie z klas `transform-gpu animate-[spin_1.4s_cubic-bezier(0.2,0.8,0.25,1)]` z maskowaniem wewnętrznym kontenerem o `rounded-[inherit]` i `bg-surface`.
3. **Dostępność i kontrast:**
   - W motywie ciemnym kontrast tekstu nagłówka karty do tła wynosi > 7:1.
   - Wszystkie elementy klikalne spełniają wymóg touch target $\ge 44 \times 44\text{ px}$.
