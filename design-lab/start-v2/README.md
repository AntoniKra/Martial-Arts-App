# Laboratorium Designu — Start v2 (Spokojny Premium)

Dokumentacja ostatecznej wersji ekranu **Start** w kierunku **„Spokojny Premium”**, przygotowana na bazie ustaleń z właścicielem produktu oraz wytycznych z [AGENTS.md](file:///c:/dev/Martial-Arts-App/AGENTS.md), [design-system.md](file:///c:/dev/Martial-Arts-App/combat-training-app/docs/design-system.md) i [ADR 0019](file:///c:/dev/Martial-Arts-App/combat-training-app/docs/adr/0019-crimson-with-ember-visual-direction.md).

Prace zrealizowano w dedykowanym katalogu `design-lab/start-v2/` bez modyfikacji kodu produkcyjnego aplikacji.

---

## 1. Wersja do ostatecznej akceptacji: `final-approval.html`

Wersja gotowa do wdrożenia znajduje się w osobnym, samodzielnym pliku [final-approval.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/final-approval.html).

Zatwierdzona kompozycja modularna:

$$\mathbf{1B\text{-}1} \cdot \mathbf{2B\text{-}2} \cdot \mathbf{3A} \cdot \mathbf{4A} \cdot \mathbf{5A} \cdot \mathbf{NAV\text{-}A} \quad (\text{Powitanie A}, \text{ciemny / jasny})$$

- **1B-1 (Karta „Dziś” ze statyczną czerwoną obwódką)**: Cienka czerwona obwódka karmazynowa (`rgba(193, 18, 47, 0.45)`) z bardzo delikatnym czerwonym światłem przestrzennym. Żar (`#f0753a`) znajduje się wyłącznie wewnątrz rozbłysku burzy SVG.
- **2B-2 (Obszar przycisków karty „Dziś”)**: Główny przycisk „Wpisz trening po zajęciach” w głębokim karmazynie bojowym (`#580814 → #750a1a`) z precyzyjną 1 px krawędzią żaru (`#f0753a`), żarową ikoną i doskonałym kontrastem bieli `9.5 : 1` (WCAG AAA). Pod spodem dwa kafelki akcji: „Nie byłem” i „Przenieś dzień”.
- **3A (Mikro-status dnia)**: Zwięzły pasek mikro-statusu z datą, godziną i lewym akcentem karmazynowym (`ŚRODA, 18 LISTOPADA · 18:30 · Boks techniczny`).
- **4A (Plan tygodnia)**: 7-dniowy tracker ze wskaźnikami zaliczenia (Pn, Wt ✓), pulsującym wskaźnikiem Dziś (Śr 18) oraz zaplanowanymi dniami i paskiem realizacji celu tygodniowego (50%).
- **5A (Karta „Następny trening”)**: Karta z plakietką dyscypliny K-1, datą (Jutro, 19:00) i tytułem sesji sparingowej.
- **Powitanie A**: Subtelna iskra zbiegająca się w rozbłysk burzy na karcie „Dziś” (~850 ms, `sessionStorage`, kliknięcie pomija, respektuje `prefers-reduced-motion`).

---

## 2. Dolne menu — 1:1 odtworzenie menu z aplikacji

Zgodnie z wymogami dolna nawigacja w [final-approval.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/final-approval.html) odtwarza **1:1** aktualne menu mobilne aplikacji z `combat-training-app/src/components/layout/` (`BottomNavigation.tsx`, `NavigationLink.tsx`, `navigationConfig.ts`) oraz `src/styles/index.css`:

### Parametry bazowe 1:1:
- **Wysokość belki**: dokładnie `68px` (`h-[68px]`).
- **Tło**: `var(--app-nav)` (`#111113` w ciemnym, `#ffffff` w jasnym).
- **Górna krawędź**: `1px solid var(--app-border)` (`#2a2a2e` / `#c9c9c5`).
- **Wskaźnik aktywnej zakładki**: `.nav-active-bar` (`.accent-fill`): 2 px linia u samej góry z gradientem `var(--app-grad-accent)` (`linear-gradient(90deg, #c1122f 0%, #f0753a 100%)`) od `left: 24%` do `right: 24%`.
- **Kolory i stany tekstu**: nieaktywny `text-faint` (`#85858a`), hover `text-muted` (`#a7a7aa`), aktywny `font-semibold text-ink` (`#f4f4f1`), ikona aktywna `text-crimson-ink` (`#ef5d6e`).
- **Typografia**: font Archivo `font-display text-[9px] font-semibold uppercase tracking-[0.1em]`.
- **Romb „+”**: 36×36 px obrócony o 45°, tło `var(--app-grad-plus)` (`#e0263f → #b8102a → #8e0b20`), podwójny cień: `0 0 0 3px var(--app-nav), 0 0 0 4px color-mix(in srgb, var(--app-ember) 55%, transparent)`, zaokrąglenie 3 px.

### 4 zatwierdzone zmiany:
1. **Układ zakładek wg NAV-A**: `Start` · `Plan` · `[+]` · `Postęp` · `Profil` (Historia przeniesiona jako segment w Postępie; plany treningowe dostępne pod „+” oraz na Starcie).
2. **Nowocześniejsze ikony**:
   - `Start`: ikona identyczna jak w aplikacji (`NavHomeIcon` — zarys domku).
   - `Plan`: nowoczesna siatka kalendarza z podziałem dni.
   - `Postęp`: nowoczesne słupki analityki i aktywności z linią trendu.
   - `Profil`: nowoczesny zarys sylwetki sportowca.
3. **Napis pod rombem**: **„Trening”** zamiast „Nowy”, przesunięty odrobinę w dół (`margin-top: 3px`) dla uzyskania optycznego oddechu i czytelności.
4. **Przełącznik w galerii**:
   - **„Romb jak w aplikacji (domyślnie)”**: romb wysunięty o ~18 px ponad belkę (`margin-top: -24px`), identycznie jak w aplikacji.
   - **„Romb obniżony o 9 px”**: romb opuszczony o 9 px (`margin-top: -15px`), wystaje jedynie o ~9 px ponad belkę, dzięki czemu nie koliduje z dolną treścią scrolla.
   - Właściciel decyduje przełącznikiem w nagłówku i w galerii.

---

## 3. Dwa ekrany pomocnicze w ramce telefonu

W ramce telefonu [final-approval.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/final-approval.html) oraz [index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html) zaimplementowano interaktywny podgląd dwóch kluczowych przepływów powiązanych z nowym menu:

### (a) Co się otwiera po stuknięciu „+” (Trening)
Dolny arkusz modalny (Action Sheet) wysuwający się płynnie z dołu z przyciemnieniem tła (`backdrop-filter`):
1. **Wpisz trening po zajęciach** (z plakietką „Najczęstsze”) — szybki formularz rund, sparingów i ocen błędów z klubu.
2. **Rozpocznij plan** — uruchomienie zaplanowanej jednostki z timerem i odliczaniem.
3. **Stoper rund** — czysty stoper interwałowy (boks, Muay Thai, kickboxing) bez konieczności tworzenia planu.
4. **Nowy plan treningowy** — kreator budowania nowego schematu z bloków.
5. Przycisk zamknięcia ✕ i kliknięcie w tło zamyka arkusz.

### (b) Postęp z segmentem [Wykresy] [Historia] — Gdzie ląduje Historia w NAV-A
Pełny ekran modułu **Postęp i Dziennik**, prezentujący rozwiązanie architektoniczne NAV-A:
- **Segmented Control na górze**: `[ Wykresy i analityka ]` oraz aktywny `[ Historia sesji (aktywna) ]`.
- **Karta podsumowania mikrocyklu**: 3 jednostki · 210 minut · 18 rund · Średnie RPE 7.8 · Realizacja celu 50%.
- **Dziennik sesji**:
  - *Wczoraj, 17 lis*: Boks — sparingi zadaniowe (5 rund, RPE 8.0, ocena błędu technicznego: „Powrót prawej ręki po crossie” 4/5).
  - *Piątek, 14 lis*: Muay Thai — praca na tarczach (6 rund, RPE 8.5, ocena: „Dokręcenie biodra przy low kicku” 4/5).
  - *Środa, 12 lis*: Boks techniczny (6 rund, RPE 7.0, status PWA).
- Przycisk **„← Start”** natychmiastowo cofa do ekranu głównego.

---

## 4. Tabela plików źródłowych w `design-lab/start-v2/`

| Plik | Opis |
| --- | --- |
| **[final-approval.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/final-approval.html)** | **Wersja do ostatecznej akceptacji.** Kompozycja 1B-1 · 2B-2 · 3A · 4A · 5A · NAV-A. Pasek 1:1 z aplikacji, przełącznik rombu, interaktywny arkusz «+» oraz ekran Postęp/Historia. |
| **[index.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/index.html)** | Studio alternatyw i galeria laboratoryjna z ramką telefonu 390×844, przyciskiem „Wersja do akceptacji”, przełącznikiem wysokości rombu i podglądem obu ekranów pomocniczych. |
| **[start-final.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/start-final.html)** | Elastyczny poligon modularny ze slotami części 1–7 i przełączaniem wszystkich wariantów w locie via `postMessage`. |
| **[actions-a.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-a.html)** | Wariant A akcji: przycisk zintegrowany z podpisem 60 px + 2 pigułki. |
| **[actions-b.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-b.html)** | Wariant B akcji: kafelki taktyczne 56 px + 2 kafelki 52 px. |
| **[actions-c.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-c.html)** | Wariant C akcji: przycisk + menu Action Sheet ⋯. |
| **[actions-d.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/actions-d.html)** | Wariant D akcji: przycisk dzielony (Split 78%/22%). |
| **[intro-a.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/intro-a.html)** | Powitanie A: centralna iskra żaru zbiegająca się w burzę (~850 ms, zatwierdzone). |
| **[intro-b.html](file:///c:/dev/Martial-Arts-App/design-lab/start-v2/intro-b.html)** | Powitanie B: laserowy kontur krawędziowy karty. |

---

## 5. Dostępność i ergonomia dotyku (WCAG)

1. **Wymiary celów dotyku**: Każdy przycisk nawigacyjny w dolnym pasku, romb `+`, przycisk główny karty oraz kafelki akcji posiadają fizyczny wymiar $\ge 44 \times 44\text{ px}$ (romb w belce: kontener $50\times 50\text{ px}$ z aktywnym polem $48\times 48\text{ px}$).
2. **Kontrast typografii**:
   - Przycisk 2B-2 (biały tekst na karmazynie `#580814`): **9.5 : 1** (norma AAA).
   - Etykiety dolnego menu (tekst `var(--app-ink)` / `var(--app-faint)`): $\ge 4.5 : 1$.
   - Badże dyscyplin i statusów: kontrast $\ge 4.5 : 1$.
3. **Komunikacja stanu**: Stan aktywny nigdy nie jest komunikowany wyłącznie kolorem — linia wskaźnika `.accent-fill` (2 px bar na górze), pogrubienie typografii oraz zmiana kształtu/obrysu.
4. **Brak emoji**: Wszelkie wskaźniki i piktogramy wykorzystują wyłącznie precyzyjne, kanciaste wektory SVG inline.
5. **Redukcja ruchu**: Przy włączonym `prefers-reduced-motion` powitanie A oraz wszelkie animacje przejść są całkowicie wyłączane (`animation-duration: 0.01ms`).
