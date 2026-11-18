# Audyt zgodności zaimplementowanego Startu v2 z zatwierdzoną makietą

Raport z audytu porównawczego implementacji ekranu Start v2 w gałęzi `qa/start-v2-zgodnosc` względem zatwierdzonej makiety (`origin/design/antigravity-lab:design-lab/start-v2/final-approval.html`).

Badane zatwierdzone wybory: **1B-1** (statyczna czerwona obwódka karty „Dziś”), **2B-2** (przycisk „Wpisz trening po zajęciach”: głęboki karmazyn z krawędzią żaru, ikona żaru; kafelki „Nie byłem”, „Przenieś dzień”), **3A** (pasek mikrostatusu), **4A** (tygodniowy tracker), **5A** (karta „Następny trening”), **powitanie A** (błysk burzy).

---

## Zrzuty ekranu (390×844)

Porównanie stanów makiety i aplikacji w motywie ciemnym i jasnym:

| Stan / Widok | Makieta zatwierdzona | Aplikacja zaimplementowana |
| :--- | :--- | :--- |
| **1. Trening klubowy dziś (ciemny)** | [1-trening-ciemny-makieta.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/1-trening-ciemny-makieta.png) | [1-trening-ciemny-aplikacja.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/1-trening-ciemny-aplikacja.png) |
| **1. Trening klubowy dziś (jasny)** | [1-trening-jasny-makieta.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/1-trening-jasny-makieta.png) | [1-trening-jasny-aplikacja.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/1-trening-jasny-aplikacja.png) |
| **2. Dzień odpoczynku (ciemny)** | *Brak w makiecie (stan domyślny demo)* | [2-odpoczynek-ciemny-aplikacja.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/2-odpoczynek-ciemny-aplikacja.png) |
| **2. Dzień odpoczynku (jasny)** | *Brak w makiecie (stan domyślny demo)* | [2-odpoczynek-jasny-aplikacja.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/2-odpoczynek-jasny-aplikacja.png) |
| **3. Zbliżenie: Tydzień i Następny (ciemny)** | [3-tydzien-nastepny-ciemny-makieta.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/3-tydzien-nastepny-ciemny-makieta.png) | [3-tydzien-nastepny-ciemny-aplikacja.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/3-tydzien-nastepny-ciemny-aplikacja.png) |
| **3. Zbliżenie: Tydzień i Następny (jasny)** | [3-tydzien-nastepny-jasny-makieta.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/3-tydzien-nastepny-jasny-makieta.png) | [3-tydzien-nastepny-jasny-aplikacja.png](file:///C:/dev/Martial-Arts-App/qa-reports/start-v2/3-tydzien-nastepny-jasny-aplikacja.png) |

---

## A. Tabela różnic

| Element | Makieta (wartości CSS) | Aplikacja teraz | Plik i klasa/komponent w aplikacji | Gotowa zmiana (CSS/Tailwind na tokenach `--app-*`) | Priorytet |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Przycisk główny: gradient tła (ciemny)** | `linear-gradient(135deg, #580814 0%, #750a1a 55%, #880c1e 100%)` (3-stopniowy karmazyn) | `linear-gradient(135deg, #580814 0%, #750a1a 100%)` (2-stopniowy) | `src/styles/index.css`<br>`.home-primary-action`, `--app-home-grad-primary` | Zaktualizować token w `:root`: `--app-home-grad-primary: linear-gradient(135deg, #580814 0%, #750a1a 55%, #880c1e 100%);` | **P1** |
| **Przycisk główny w jasnym motywie** | `linear-gradient(135deg, #a01027 0%, #b5122b 55%, #c24b10 100%)`, krawędź `rgba(194, 75, 16, 0.85)` | Brak tokenów dla jasnego motywu — przycisk dziedziczy czarno-bordowe tło `#580814` z ciemnego motywu | `src/styles/index.css`<br>`:root[data-theme='light']` | Dodać do `:root[data-theme='light']`:<br>`--app-home-grad-primary: linear-gradient(135deg, #a01027 0%, #b5122b 55%, #c24b10 100%);`<br>`--app-home-primary-edge: rgba(194, 75, 16, 0.85);`<br>`--app-home-primary-light: rgba(160, 16, 39, 0.25);` | **P1** |
| **Przycisk główny: poświata i wewnętrzna krawędź** | `box-shadow: 0 4px 16px rgba(117,10,26,0.4), 0 0 12px rgba(240,117,58,0.25), inset 0 0 0 1px rgba(240,117,58,0.15)` | `box-shadow: 0 4px 16px var(--app-home-primary-light)` (brak akcentu żaru i ramki wewnętrznej) | `src/styles/index.css`<br>`.home-primary-action` | `box-shadow: 0 4px 16px var(--app-home-primary-light), 0 0 8px color-mix(in srgb, var(--app-ember) 25%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--app-ember) 15%, transparent);` | **P1** |
| **Pasek mikrostatusu 3A** | Obecny nad kartą: `.status-strip-3a` (wys. 47 px, border-left 3 px karmazyn, data uppercase, nazwa zajęć i plakietka „Zaplanowane”) | **Brak** paska statusu nad kartą; data jest zwykłym tekstem wewnątrz karty | `src/features/home/components/`<br>`HomeScheduleCards.tsx`, `HomeView.tsx` | Wydzielić komponent `HomeMicroStatusStrip` lub zintegrować pasek statusu w górnej części widoku z klasami `bg-surface border border-bd border-l-[3px] border-l-crimson px-3 py-2 rounded-sm` | **P1** |
| **Wysokość przycisku głównego** | `min-height: 48px`, padding `10px 14px` | `min-h-14` (56 px) | `src/features/home/components/`<br>`HomeScheduleCards.tsx`<br>`homePrimaryButton` | Zmienić klasę z `min-h-14` na `min-h-12` (48 px) oraz padding na `py-2.5 px-3.5` | **P1** |
| **Karta „Ten tydzień” (4A): znacznik „Dziś”** | Kanciaste pole 32×32 px, obwódka 2 px `var(--app-ember)` (`#f0753a`), wypełnienie żarem | Standardowe kółko z czerwoną kreską pod spodem, bez obwódki żaru | `src/components/domain/`<br>`WeekDayIndicator.tsx`, `src/styles/index.css` | Dla wariantu w trackerze Startu: `.home-week-tracker [data-today='true'] { border: 2px solid var(--app-ember); background: color-mix(in srgb, var(--app-ember) 12%, transparent); }` | **P2** |
| **Karta „Ten tydzień” (4A): węzły zaliczone** | Węzeł zaliczony ma biały checkmark `✓` na tle `var(--app-grad-primary)` | Węzeł zaliczony ma tylko tło gradientowe, bez symbolu `✓` | `src/components/domain/`<br>`WeekDayIndicator.tsx` | Wstrzykiwać `✓` w stan `done` wewnątrz wskaźnika tygodnia na Starcie | **P2** |
| **Karta „Następny trening” (5A)** | Zwięzła karta: plakietka dyscypliny `K-1`, data `Jutro · 19:00`, tytuł 14px bold, strzałka `›` | Duży blok daty 48×48 px lub sekcja przerywana `home-flexible-workout` | `src/features/home/components/`<br>`HomeWeekCard.tsx` | Ujednolicić komponent karty następnego treningu do zwartego flexboxa: `flex items-center justify-between p-3.5 bg-surface border border-bd rounded-sm` | **P2** |
| **Nagłówek i cel karty „Dziś”** | Tytuł: `Boks techniczny + sparingi` (18px Archivo bold), boks celu technicznego `.today-target-box` | Tytuł to czas godzinowy `18:00–19:30` (30px tabular-nums), brak celu technicznego | `src/features/home/components/`<br>`HomeScheduleCards.tsx` | Umieścić nazwę zajęć jako główny nagłówek karty, a godziny obok tagu klubu; dodać boks celu, gdy dane treningu zawierają wskazówkę techniczną | **P2** |
| **Białe znaki w „Stoper i inne plany”** | Brak nieczytelnego paska; stoper w arkuszu `+` i na karcie odpoczynku | Dwa osobne tagi `Link` z `gap-3` w jednym wierszu tworzące wrażenie podwójnej spacji | `src/features/home/components/`<br>`HomeWeekCard.tsx:48-52` | Usunąć scalony wiersz lub rozdzielić go na dwa niezależne kafelki z dividerem `border-t border-bd` | **P2** |
| **Pusty odstęp karty „Dziś”** | `gap: 12px`, padding `16px`, naturalna wysokość zależna od treści (ok. 284 px) | Wymuszone sztuczne `min-h-[366px]` wewnątrz kontenera tekstów | `src/features/home/components/`<br>`HomeScheduleCards.tsx:47` | Zastąpić sztywne `min-h-[366px]` płynnym `min-h-[260px]` lub elastycznym `flex-1 justify-between` | **P2** |
| **Kolor tekstu opisu w przycisku głównym** | `rgba(255, 255, 255, 0.75)` (kontrast > 7:1) | `--app-home-primary-muted: #e5c8cd` | `src/styles/index.css`<br>`.home-primary-description` | Zmienić na `color-mix(in srgb, var(--app-on-accent) 75%, transparent);` | **P3** |
| **Wysokość paska postępu tygodnia** | `height: 4px`, `background: var(--app-border)` | `h-1.5` (6 px), `bg-bd` | `src/features/home/components/`<br>`HomeWeekCard.tsx:32` | Zmienić klasę `h-1.5` na `h-1` (4 px) | **P3** |
| **Dolne menu: obniżenie rombu o 9 px** | Opcja `mode-lowered-diamond`: wysunięcie ponad pasek zmniejszone o 9 px | Standardowy romb wysunięty o ~24 px | `src/components/layout/`<br>`NavigationLink.tsx` | Zmienić `-mt-6` (24 px) na `-mt-3.5` (14 px) w wariancie obniżonym rombu | **P3** |

---

## B. Sprzeczności z regułami projektu

Porównanie makiety z wytycznymi w [combat-training-app/docs/design-system.md](file:///C:/dev/Martial-Arts-App/combat-training-app/docs/design-system.md) oraz [AGENTS.md](file:///C:/dev/Martial-Arts-App/AGENTS.md):

1. **Poświata przycisków vs „brak mocnych poświat i neonowych efektów”:**
   - *Reguła:* `design-system.md` wyraźnie zabrania neonowych poświat i ciężkich cieni: *„cienkie obramowania zamiast ciężkich cieni; status nigdy kolorem ani poświatą”*.
   - *Makieta:* Wariant 2B-2 posiadał `box-shadow: ... 0 0 12px rgba(240, 117, 58, 0.25)`, czyli zewnętrzną pomarańczową poświatę żaru.
   - *Pogodzenie:* Aplikacja słusznie zredukowała tę poświatę. Rekomendacja: zachować ostrą krawędź żaru `border: 1px solid var(--app-home-primary-edge)` oraz subtelną wewnętrzną krawędź `inset 0 0 0 1px color-mix(in srgb, var(--app-ember) 15%, transparent)`, a zewnętrzne rozmycie ograniczyć do bardzo dyskretnego `0 0 6px`.

2. **Ciągła animacja pulsowania węzła „Dziś” vs zasady minimalizmu:**
   - *Reguła:* `design-system.md` (#197): *„brak animowanych liczników, kaskad i ciągłego pulsowania; ruch jest celowy i oszczędny”*. Ponadto w trybie `prefers-reduced-motion` wszelkie pulsowanie musi być wyłączone.
   - *Makieta:* W pliku makiety zdefiniowano `@keyframes pulse-today` działające w nieskończoność (`infinite`).
   - *Pogodzenie:* Dzisiejszy dzień w trackerze tygodnia powinien mieć **statyczną** obwódkę 2 px w kolorze `var(--app-ember)`, bez animacji w pętli.

3. **Pasek mikrostatusu 3A vs reguła braku widocznego nagłówka:**
   - *Reguła:* `design-system.md` (#184): *„Start nie ma widocznego nagłówka (zachowuje jeden ukryty h1 „Start”); data jest w etykiecie głównej karty z burzą we wszystkich stanach. Główna akcja pozostaje w dolnej połowie ekranu 390×844.”*
   - *Makieta:* Pasek 3A tworzy dodatkowy blok o wysokości 47 px nad kartą, co przy małych ekranach może spychać główny przycisk akcji poniżej połowy ekranu.
   - *Pogodzenie:* Informacje z paska 3A (dokładna data, status „Zaplanowane”) należy zintegrować w nagłówku samej karty z burzą (zamiast osobnego paska zewnętrznego) lub zastosować kompaktowy pasek o wysokości max 36 px.

4. **Niestandardowe, surowe wartości heksadecymalne w makiecie:**
   - *Reguła:* `AGENTS.md`: *„Use theme tokens, never hard-coded colours”*.
   - *Makieta:* Zawierała bezpośrednie wpisy `#580814`, `rgba(240, 117, 58, 0.85)`.
   - *Pogodzenie:* W kodzie produkcyjnym wszystkie te wartości muszą być wyprowadzone ze zdefiniowanych tokenów semantycznych `--app-home-*` oraz funkcji `color-mix`.

---

## C. Dzień odpoczynku – 2 warianty stylu 2B-2

W stanie domyślnym demo na dziś przypada dzień wolny. Karta prezentuje wówczas „Szybki start” z aktywnym planem treningowym (np. *Kickboxing · Tarcze: tempo i celność*).

### Wariant 1: Styl 2B-2 przeniesiony na przycisk „Rozpocznij plan”
Karta zachowuje stonowany, ciemny charakter, a akcja główna jest silnie wyeksponowana w estetyce 2B-2:

```css
/* Przycisk główny „Rozpocznij plan” na karcie odpoczynku */
.home-quick-start .home-primary-action {
  min-height: 48px;
  padding: 10px 14px;
  border-radius: var(--app-radius-sm);
  background: var(--app-home-grad-primary);
  border: 1px solid var(--app-home-primary-edge);
  box-shadow: 0 4px 16px var(--app-home-primary-light),
              inset 0 0 0 1px color-mix(in srgb, var(--app-ember) 15%, transparent);
  color: var(--app-home-primary-ink);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 800;
}

/* Ikona żaru Play w przycisku */
.home-quick-start .home-primary-icon {
  width: 32px;
  height: 32px;
  border: 1px solid color-mix(in srgb, var(--app-ember) 40%, transparent);
  background: color-mix(in srgb, var(--app-ember) 15%, transparent);
  border-radius: 3px;
  color: var(--app-ember);
}

/* Kafelki drugorzędne pod spodem (Stoper / Trening w klubie) */
.home-quick-start .grid-cols-2 a {
  min-height: 44px;
  background: var(--app-elevated);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  color: var(--app-ink);
  font-size: 11px;
  font-weight: 600;
}
```

### Wariant 2: Karta „Szybki start” z czerwoną obwódką 1B-1 i burzą
Pełna spójność wizualna karty odpoczynku z kartą treningową – karta otrzymuje delikatną czerwoną poświatę 1B-1, a burza w tle ma zredukowaną jasność:

```css
/* Karta odpoczynku z obwódką karmazynową 1B-1 */
.home-quick-start.storm-card {
  border: 1px solid var(--app-home-card-border); /* rgba(193, 18, 47, 0.45) */
  box-shadow: 0 0 16px var(--app-home-card-light),
              inset 0 0 12px var(--app-home-card-inset);
  background: var(--app-surface);
  border-radius: var(--app-radius-sm);
}

/* Subtelniejsza burza w dzień odpoczynku */
.home-quick-start .storm-decoration {
  opacity: calc(var(--app-storm-opacity) * 0.7);
}

/* Zwarty nagłówek bez sztucznej dziury 366px */
.home-quick-start .quick-start-content {
  min-height: 260px;
  padding: 16px;
  gap: 12px;
}
```

---

## D. Drobne błędy zauważone przy okazji

1. **Podwójny link ze sztucznymi białymi znakami w `HomeWeekCard.tsx:48-52`:**
   Dwa osobne elementy `<Link>` (`labels.timer` i `labels.otherPlansSuffix`) są renderowane w jednym kontenerze `flex items-center gap-3`. Tworzy to mylący wizualnie napis `Stoper   i inne plany ›`, sugerujący pojedynczą akcję, a faktycznie prowadzący do dwóch różnych podstron w zależności od miejsca kliknięcia.
2. **Sztywne `min-h-[366px]` w karcie „Dziś” i „Szybki start”:**
   Wymuszenie wysokości `366px` na kontenerze tekstu tworzy nienaturalną pustą przestrzeń przy krótkich opisach i grozi wypchnięciem przycisku głównego poza dolną połowę ekranu na mniejszych telefonach (np. iPhone SE).
3. **Brak tokenów jasnego motywu dla `--app-home-*`:**
   W `src/styles/index.css` brak bloku `:root[data-theme='light']` dla zmiennych `--app-home-*`, przez co przycisk główny w jasnym motywie wyświetla tło ciemnego motywu (`#580814`).
4. **Brak obwódki fokusu klawiatury dla kafelków drugorzędnych:**
   W `src/styles/index.css` klasa `.home-secondary-action` nie definiuje widocznego pierścienia `focus-visible`, co obniża dostępność nawigacji klawiaturą.
