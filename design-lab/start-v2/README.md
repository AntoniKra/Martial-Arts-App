# Laboratorium Designu — Start v2 (Spokojny Premium)

Dokumentacja iteracji projektowej ekranu **Start** w kierunku **„Spokojny Premium”**, przygotowana na bazie ustaleń z właścicielem produktu oraz wytycznych z [AGENTS.md](file:///c:/dev/Martial-Arts-App/AGENTS.md), [design-system.md](file:///c:/dev/Martial-Arts-App/combat-training-app/docs/design-system.md) i [ADR 0019](file:///c:/dev/Martial-Arts-App/combat-training-app/docs/adr/0019-crimson-with-ember-visual-direction.md).

Prace zrealizowano w dedykowanym katalogu `design-lab/start-v2/` bez modyfikacji kodu produkcyjnego aplikacji.

---

## 1. Wybór właściciela: Kompozycja domyślna

Właściciel projektu zatwierdził kompozycję ekranu Start oraz kierunek mikrointerakcji:

$$\mathbf{1B\text{-}1} \cdot \mathbf{2B\text{-}1} \cdot \mathbf{3A} \cdot \mathbf{4A} \cdot \mathbf{5A} \cdot \mathbf{6A\text{-}1} \cdot \mathbf{NAV\text{-}A} \quad (\text{ciemny})$$

- **Karta „Dziś”**: wariant **1B-1** (cienka, subtelna czerwona obwódka statyczna).
- **Powitanie**: zatwierdzono **Powitanie A** (centralna iskra zbiegająca się w burzę).
- **Motyw**: domyślnie **ciemny**, motyw **jasny w pełni przetestowany i zatwierdzony**.
- Ustawiono powyższą kompozycję jako **domyślną** w [index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html) oraz w [start-final.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/start-final.html).

---

## 2. Przycisk „+” w dolnym menu (Warianty 6A-1, 6A-2, 6A-3)

Właścicielowi najbardziej podoba się obecny romb z aplikacji (obrócony kwadrat, wystający ponad pasek), a z wariantów laboratoryjnych styl **6A**. Zgodnie z wytycznymi przygotowano 3 warianty w duchu rombu:

### 6A-1: Obecny romb obniżony o 9 px (Wybór właściciela — domyślny)
- **Co zmieniono:** Romb 36×36 px (obrót 45°) obniżono o 9 px w stosunku do pierwotnego 6A (`top: -9px` zamiast `-18px`; w aplikacji miał `-mt-6` czyli ok. -24 px). Wystaje zaledwie o 9 px ponad górną krawędź belki nawigacyjnej.
- **Dlaczego:** Nie nachodzi na ostatnie elementy przewijanej treści ekranu, zachowując przy tym kultowy, wyróżniający charakter centralnej akcji aplikacji.
- **Ergonomia i dotyk:** Przezroczysty pseudoelement `::after` rozszerza cel dotyku do **48×48 px** (spełnia normę $\ge 44\text{ px}$ z zapasem).
- **Kolorystyka:** Karmazynowy gradient `var(--app-grad-plus)` (`#e0263f → #b8102a → #8e0b20`), 3 px pierścień w kolorze belki nawigacyjnej (`var(--app-nav)`) oraz zewnętrzna 1 px faza żaru `color-mix(in srgb, var(--app-ember) 55%, transparent)`.

### 6A-2: Romb wkomponowany ze stylem 6A (Flush Notch Diamond)
- **Co zmieniono:** Romb 34×34 px osadzony w wyprofilowanej geometrycznej podstawie (notch) o zaokrągleniu 6 px w kolorze tła belki. Romb wystaje jedynie o 6 px (`top: -6px`).
- **Dlaczego:** Płynnie scala romb z poziomą linią podziału paska nawigacji, tworząc wrażenie precyzyjnie frezowanego elementu wyposażenia sportowego.
- **Kolorystyka:** Głęboki karmazyn `#b8102a → #8e0b20`, wewnętrzna faza 1 px, akcent żaru `#f0753a` na samej krawędzi.

### 6A-3: Nowa autorska propozycja — Taktyczny heksagon (Tactical Chamfer Diamond)
- **Co zmieniono:** Zamiast prostego obróconego kwadratu zastosowano wielokąt o ściętych wierzchołkach (`clip-path: polygon(...)`), idealnie nawiązujący do zasady kanciastej geometrii 0–4 px i militarno-sportowego charakteru sportów walki.
- **Dlaczego:** Eliminuje ostre narożniki pionowe, zyskując unikalną, ringową tożsamość wizualną. Wystaje o 6 px (`top: -6px`), nie kolidując z treścią strony.
- **Kolorystyka:** Karmazynowy rdzeń z 1 px obwódką i mikro-żarowym punktem pod białym plusem.

---

## 3. Architektura dolnego menu (NAV-A, NAV-B, NAV-C)

Właścicielowi podoba się układ *Start · Plan · Postęp*, ale aplikacja musi zawierać Profil, podczas gdy obecnie Historia i plany treningowe znajdują się w zakładce „Treningi”. Poniższa tabela przedstawia 3 warianty architektury informacji:

| Wariant | Pasek dolny (5 zakładek) | Gdzie jest Historia? | Gdzie są Plany treningowe? | Gdzie jest Profil? | Gdzie jest „+”? | Plusy | Minusy |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **NAV-A** *(Klasyczny podział)* — **Wybór właściciela** | **Start** · **Plan** · **[+]** · **Postęp** · **Profil** | W zakładce **Postęp** jako segment na górze: `[ Wykresy ] [ Historia sesji ]` | Pod przyciskiem **[+]** (jako opcja tworzenia/wyboru) oraz kasetka na Starcie | Dedykowana 5. zakładka w dolnym pasku menu | Centralny romb: szybki trening / kreator / wpis | Czysty, klasyczny układ 5 zakładek; bezpośredni dostęp do Profilu; Postęp łączy analitykę z surowym dziennikiem sesji | Historia nie ma własnej niezależnej zakładki w belce (wymaga stuknięcia w Postęp) |
| **NAV-B** *(Treningi w pasku, Profil w nagłówku)* | **Start** · **Plan** · **[+]** · **Postęp** · **Treningi** | W zakładce **Treningi** jako domyślny widok listy sesji | Druga pod-zakładka w module **Treningi**: `[ Historia ] [ Baza planów ]` | Ikona awatara **[AK]** w prawym górnym rogu ekranu Start (wzór Strava/Whoop) | Centralny romb: szybki start / wpis | Bardzo intuicyjne dla użytkowników Stravy/Nike; Historia i Plany zebrane w jednym centrum „Treningi” | Profil nie ma stałego przycisku w dolnym pasku (dostępny tylko ze Startu lub przez nagłówek) |
| **NAV-C** *(Dziennik Walki — Oś Czasu)* — **Rekomendacja projektowa** | **Start** · **Dziennik** · **[+]** · **Postęp** · **Profil** | W zakładce **Dziennik** pod segmentem `[ Plan tygodnia ] [ Historia sesji ]` | W nagłówku Dziennika oraz pod przyciskiem **[+]** | Dedykowana 5. zakładka w menu dolnym | Centralny romb: szybki trening / wpis | **Najbardziej naturalna dla zawodnika sportów walki:** łączy przeszłość (odbyte sesje) i przyszłość (plan mikrocyklu) na jednej osi czasu; Postęp zyskuje pełną przestrzeń na analitykę 12-tygodniową | Wymaga rezygnacji z osobnej zakładki „Plan” na rzecz zintegrowanego „Dziennika” |

### Interaktywny podgląd ekranu, na którym ląduje Historia
W [index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html) pod każdym wariantem (NAV-A, NAV-B, NAV-C) umieszczono miniaturę docelowego widoku Historii oraz przycisk **„Wyświetl ten ekran Historii w telefonie”**. 
Kliknięcie wysyła komunikat `SHOW_HISTORY_VIEW` do ramki telefonu, prezentując pełny, dopracowany ekran Historii z kartami sesji (Boks, Kickboxing), ocenami RPE, rundami i notatkami trenerskimi.

---

## 4. Dopracowanie przycisku „Wpisz trening po zajęciach” (Część 2B)

Właściciel uznał pierwotny gradient za zbyt jasny i jaskrawy. W sekcji 2B przygotowano 4 warianty koloru:

| Kod | Nazwa wariantu | Zastosowane kolory i krawędzie | Kontrast tekstu (WCAG) | Charakter wizualny |
| --- | --- | --- | --- | --- |
| **2B-1** | **Ciemniejszy gradient karmazynu** *(Wybór właściciela — domyślny)* | `linear-gradient(135deg, #7e0b1d 0%, #9e0d24 52%, #b8102a 100%)`, 1 px krawędź `rgba(239, 93, 110, 0.25)` | **7.1 : 1** na najjaśniejszym punkcie; **8.8 : 1** w cieniu (WCAG AAA) | Szlachetny, dojrzały karmazyn bojowy. Eliminuje różowo-jaskrawy odcień, zachowując status głównej akcji ekranu. |
| **2B-2** | **Głęboki karmazyn + krawędź żaru** | `linear-gradient(135deg, #580814 0%, #750a1a 55%, #880c1e 100%)`, 1 px obwódka żaru `rgba(240, 117, 58, 0.85)` (`#f0753a`), ikona w kolorze żaru | **9.5 : 1** (WCAG AAA) | Bardzo ciemne, aksamitne tło karmazynowe z cienką, precyzyjną krawędzią żaru o wysokim kontraście. |
| **2B-3** | **Ciemny grafit + czerwona ramka** | Tło podwyższone `#18181c` (`--app-elevated`), obwódka 1.5 px `#c1122f`, ikona karmazynowa `#ef5d6e` | **14.5 : 1** (WCAG AAA) | Surowy minimalizm narzędziowy. Przycisk wtapia się w ciemne tło karty, a status akcji nadaje precyzyjna karmazynowa ramka. |
| **2B-4** | **Tactical Ruby Charcoal** *(Autorska propozycja)* | `linear-gradient(145deg, #220c10 0%, #130508 100%)`, 1 px ramka `#780d1c`, ikona w kanciastej plakietce `rgba(193, 18, 47, 0.35)`, mikro-dioda żaru `#f0753a` | **12.4 : 1** (WCAG AAA) | Wojskowa precyzja zegarków Garmin Tactix / bolidów. Posiada mikro-wskaźnik żaru po prawej stronie i plakietkę ikony. |

### Obsługa stanów interaktywnych przycisku 2B:
- **Zwykły**: pełny kontrast i subtelny cień przestrzenny.
- **Wciśnięty (`:active`)**: sprzętowe zmniejszenie skali `transform: scale(0.985)` w 120 ms, ściemnienie tła o ok. 15%, spłaszczenie cienia.
- **Skupienie (`:focus-visible`)**: 2 px obwódka `--app-focus-ring` z odstępem `outline-offset: 2px`.
- **Wyłączony (`:disabled` / `.is-disabled`)**: `opacity: 0.42`, `filter: grayscale(0.5)`, `cursor: not-allowed`, brak cieni.

---

## 5. Przegląd plików w katalogu `start-v2/`

| Plik | Opis |
| --- | --- |
| [index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html) | Główny pulpit laboratoryjny z podglądem telefonu 390×844, przełącznikami części 1–7 (w tym próbkami kolorów 2B-1...2B-4, rombami 6A-1...6A-3 i architekturami NAV-A...NAV-C z miniaturami Historii). |
| [start-final.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/start-final.html) | Pełny ekran Start z domyślną kompozycją właściciela (**1B-1 · 2B-1 · 3A · 4A · 5A · 6A-1 · NAV-A**), obsługą `postMessage`, przełączaniem paska dolnego i modalną nakładką ekranu Historii. |
| [actions-a.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-a.html) | Wariant A obszaru akcji: zintegrowany przycisk 60 px z podpisem + 2 pigułki 44 px. |
| [actions-b.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-b.html) | Wariant B obszaru akcji: przycisk 56 px + kafelki taktyczne 52 px (Wybór właściciela). |
| [actions-c.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-c.html) | Wariant C obszaru akcji: przycisk 56 px + menu Action Sheet ⋯. |
| [actions-d.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-d.html) | Wariant D obszaru akcji: przycisk dzielony Split 58 px. |
| [intro-a.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/intro-a.html) | Powitanie A: centralna iskra żaru zbiegająca się w burzę karty „Dziś” (~820 ms, zatwierdzone przez właściciela). |
| [intro-b.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/intro-b.html) | Powitanie B: laserowy kontur krawędziowy karty i impuls świetlny (~820 ms). |

---

## 6. Pełna tabela alternatyw modułowych

| Część ekranu | Dostępne warianty | Czym się różnią | Decyzja / Rekomendacja |
| --- | --- | --- | --- |
| **1. Karta „Dziś” z burzą** | **1B-1**: Czerwona obwódka statyczna<br>**1B-2**: Czerwony obieg krawędzi (1,4s)<br>**1B-3**: Impuls wejściowy z rogu<br>**1A**: Spokojna burza klasyczna<br>**1C**: Krawędź geometryczna | **1B-1**: Cienka czerwona krawędź z bardzo subtelną poświatą karmazynu, brak ruchu.<br>**1B-2**: Obracający się refleks `conic-gradient` (1 okrążenie 1,4s; przełącznik pulsu co 4s).<br>**1B-3**: Impuls rozjaśniający od rogu burzy wygasający w 950 ms.<br>**1A**: Siatka 115°, krycie błyskawicy 55%.<br>**1C**: Minimalistyczny trójkąt żaru w rogu. | **Wybór właściciela: 1B-1**.<br>Maksymalny spokój, elegancja premium, żar izolowany wyłącznie do wnętrza burzy SVG. |
| **2. Obszar przycisków** | **2B**: Kafelki taktyczne<br>**2A**: Zintegrowany z podpisem<br>**2C**: Menu ⋯ (Action Sheet)<br>**2D**: Przycisk dzielony (Split) | **2B**: Przycisk 56 px + 2 kwadratowe kafelki 52 px z ikonami w ramkach.<br>**2A**: Przycisk 60 px z podpisem dwuwierszowym + 2 pigułki 44 px.<br>**2C**: Przycisk 56 px + kwadrat ⋯ otwierający dolny arkusz.<br>**2D**: Blok 58 px dzielony w proporcji 78% / 22%. | **Wybór właściciela: 2B**.<br>Mocny, wojskowy charakter interfejsu; niezależne, duże cele dotyku. |
| **2B (Kolor przycisku)** | **2B-1**: Ciemniejszy karmazyn<br>**2B-2**: Karmazyn + krawędź żaru<br>**2B-3**: Grafit + czerwona ramka<br>**2B-4**: Tactical Ruby Charcoal | **2B-1**: #7e0b1d → #9e0d24, kontrast 7.1:1.<br>**2B-2**: #580814 → #750a1a z ramką #f0753a, kontrast 9.5:1.<br>**2B-3**: Ciemny grafit #18181c z ramką #c1122f, kontrast 14.5:1.<br>**2B-4**: Rubinowy węgiel #220c10 z plakietką ikony i punktem żaru, kontrast 12.4:1. | **Wybór właściciela: 2B-1**.<br>Likwiduje nadmierną jaskrawość, dając głęboki, dojrzały karmazyn. |
| **3. „Ten tydzień” z kółkami i paskiem** | **3A**: Klasyczne kółka + pasek 6 px<br>**3B**: Klocki segmentowe dzienne<br>**3C**: Radialny miernik + skrócona oś | **3A**: 7 okrągłych wskaźników z ikonami ukończenia, podkreśleniem dziś i poziomym paskiem 50%.<br>**3B**: 7 prostokątnych klocków z etykietami stanu (PN ✓, WT DZIŚ).<br>**3C**: Okrągły pierścień 52 px z wynikiem 2/4. | **Wybór właściciela: 3A**.<br>Nawiązanie do standardów Whoop/Strava; bardzo czytelny stan tygodnia. |
| **4. Karta „Następny” i „W dowolny dzień”** | **4A**: Kalendarzyk + przerywana ramka<br>**4B**: Lista wierszowa nadchodzących<br>**4C**: Belka taktyczna | **4A**: Plakietka daty 38×38 px (CZW 19) + kasetka z kreskowanym obrysem dla treningu uzupełniającego.<br>**4B**: Dwa zwarte wiersze z datami i czasami trwania.<br>**4C**: Ciemna belka z lewym akcentem żaru 3 px. | **Wybór właściciela: 4A**.<br>Kreskowana ramka natychmiast sygnalizuje elastyczność jednostki uzupełniającej. |
| **5. „Stoper i inne plany” oraz „Ostatnia sesja”** | **5A**: Wiersz skrótu + karta sesji<br>**5B**: Podwójny kafelek 2×1<br>**5C**: Kompaktowa belka metryk | **5A**: Skrót stopera z czerwoną ikoną + karta ostatniej sesji (RPE 7/10, ZALICZONY) z bezpośrednim linkiem do Historii.<br>**5B**: Dwa równe kafelki obok siebie.<br>**5C**: Jednolinijkowe podsumowanie z przyciskiem skrótu. | **Wybór właściciela: 5A**.<br>Ciągłość periodyzacji (ocena poprzedniej sesji) i natychmiastowy stoper rundy. |
| **6. Przycisk „+” w dolnym menu** | **6A-1**: Obniżony romb (-9 px)<br>**6A-2**: Romb Notch 6A<br>**6A-3**: Taktyczny heksagon<br>**6B**: Zlicowany w linii<br>**6C**: Kapsuła sportowa (Pill) | **6A-1**: Obecny romb 36px obniżony o 9 px, wystaje tylko 9 px ponad belkę, dotyk 48×48 px.<br>**6A-2**: Romb 34px osadzony na geometrycznym podeście notch w kolorze belki.<br>**6A-3**: Dynamiczny ścięty wielokąt 0–4 px z karmazynowym rdzeniem i punktem żaru.<br>**6B**: Romb wewnątrz belki.<br>**6C**: Pigułka z napisem START. | **Wybór właściciela: 6A-1**.<br>Zachowuje tożsamość rombu ADR 0019, eliminując zasłanianie treści nad paskiem. |
| **7. Architektura dolnego menu** | **NAV-A**: Start · Plan · [+] · Postęp · Profil<br>**NAV-B**: Start · Plan · [+] · Postęp · Treningi<br>**NAV-C**: Start · Dziennik · [+] · Postęp · Profil | **NAV-A**: Historia jako pod-zakładka w Postępie; Profil w pasku.<br>**NAV-B**: Historia w Treningach; Profil jako awatar [AK] w nagłówku Startu.<br>**NAV-C**: Dziennik łączy Plan i Historię na 1 osi; Postęp to analityka 12 tyg.; Profil w pasku. | **Wybór właściciela: NAV-A** (z rekomendacją architektoniczną **NAV-C** dla dalszego rozwoju aplikacji). |
