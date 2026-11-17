# Laboratorium Designu UI — PWA dla Zawodników Sportów Walki

Katalog `design-lab/` zawiera projekty interfejsu użytkownika w kierunku wizualnym **„Karmazyn z żarem”** (ADR 0019, GitHub Issues #184, #187, #188). Każdy ekran został opracowany jako w pełni interaktywny, samodzielny plik HTML (vanilla CSS + JS, bez zewnętrznych frameworków i procesów budowania), przetestowany w standardowym viewport telefonu **390×844 px**.

Główna galeria podglądu z ramkami telefonu i przyciskiem ponawiania animacji znajduje się w [index.html](file:///c:/dev/Martial-Arts-App/design-lab/index.html).

---

## 1. Start (Ekran główny / Dashboard)

### 1.1 Wariant A: „Spokojny premium” (`start-calm.html`)
- **Co zmieniono i dlaczego:** Zredukowano wizualny chaos, zachowując brak widocznego nagłówka i lokując datę wewnątrz głównej karty Startu z motywem burzy. Burza SVG (`StormDecoration`) otrzymała wyciszone krycie (około 55%), dzięki czemu tekst dyscypliny i duża godzina zajęć (18:00–19:30) pozostają idealnie czytelne. Główny przycisk akcji (56 px) umieszczono w dolnej połowie ekranu w strefie naturalnego zasięgu kciuka (thumb-zone), zgodnie z wymaganiami ergonomii treningowej. Dolne menu nawigacyjne wyposażono w zatwierdzony romb 36 px obrócony o 45° z podwójną obwódką tła i żaru.
- **Lista animacji i mikrointerakcji:**
  - *Wejście ekranu (kaskada sekcji):* `transform: translateY(14px) -> translateY(0)`, `opacity: 0 -> 1`, czas 350 ms, krzywa `cubic-bezier(0.16, 1, 0.3, 1)`, opóźnienia: 50 ms, 110 ms, 170 ms.
  - *Błysk burzy (storm flash):* `opacity: 0.55 -> 0.95 -> 0.55`, `transform: scale(1) -> scale(1.02) -> scale(1)`, czas 400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - *Licznik treningów i minut:* od 0 do 1 oraz od 0 do 90 min, czas 400 ms, 20 kroków z `tabular-nums`.
  - *Pasek postępu tygodnia:* `width: 0% -> 25%`, czas 400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - *Tapnięcie przycisków:* `transform: scale(0.98)`, czas 150 ms, `cubic-bezier(0.2, 0, 0, 1)`.
- **Co byłoby trudne do wdrożenia w produkcyjnym React/CSS:**
  - Koordynacja reflow SVG i restartu animacji CSS przy powrocie z innej karty bez wymuszania ponownego renderowania całego drzewa Reacta (rozwiązanie: dedykowany ref i dispatch zdarzenia lub klasa z wymuszeniem reflow przez `void el.offsetWidth`).
  - Utrzymanie stałego minimalnego czasu reakcji (<16 ms) na starszych procesorach mobilnych przy równoczesnym renderowaniu gradientów liniowych i SVG (rozwiązanie: `will-change: transform, opacity` oraz `transform: translateZ(0)`).
- **Inspiracje wzorcowe (Whoop & Apple Watch Ultra):**
  - Minimalistyczna tarcza o wysokim kontraście; unikanie niepotrzebnych ozdobników na rzecz wyrazistych liczb w kroju Archivo i czystego paska dni tygodnia.

---

### 1.2 Wariant B: „Odważny” (`start-bold.html`)
- **Co zmieniono i dlaczego:** Wzmocniono ładunek emocjonalny i sportową agresję interfejsu. Karta Startu otrzymała radialny podkład karmazynowy, ostrzejszy gradient pioruna z rozbłyskiem żaru `#ff7536` oraz iskrzące romby o podwyższonej jasności. Przycisk główny zyskał mocny cień z poświatą (`box-shadow: 0 6px 20px rgba(224, 22, 57, 0.45)`) i Archivo 900. Plakietka daty i dyscypliny została wyodrębniona jako wyrazisty prostokątny badge. Pasek tygodnia ma grubość 8 px z gradientem wielopunktowym przechodzącym w złoty żar.
- **Lista animacji i mikrointerakcji:**
  - *Agresywne wejście kaskadowe:* `transform: translateY(16px) -> translateY(0)`, `opacity: 0 -> 1`, czas 360 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - *Pulsujący wyładowczy błysk burzy:* `opacity: 0.82 -> 1 -> 0.82`, `transform: scale(1) -> scale(1.04) rotate(-0.5deg) -> scale(1)`, `filter: drop-shadow(0 0 28px rgba(255, 117, 54, 0.85))`, czas 380 ms.
  - *Licznik cyfrowy:* 350 ms, 18 kroków.
  - *Postęp celu tygodniowego:* `width: 0% -> 25%`, czas 400 ms, `box-shadow: 0 0 10px rgba(255, 117, 54, 0.6)`.
- **Co byłoby trudne do wdrożenia:**
  - Złożone cienie wielowarstwowe (`drop-shadow` na elementach wektorowych połączone z `box-shadow`) mogą obniżać płynność przewijania na słabszych urządzeniach z systemem Android (rozwiązanie: renderowanie poświaty jako oddzielnej warstwy rastrowej lub ograniczenie cieni SVG wyłącznie do momentu kliknięcia).
- **Inspiracje wzorcowe (Nike Training Club & Fight Pass):**
  - Intensywna typografia condensed, ostre kąty bez zaokrągleń powyżej 4 px, nasycone czerwienie i pomarańcze tworzące atmosferę przedstartową.

---

### 1.3 Wariant Jasny: „Light Mode” (`start-light.html`)
- **Co zmieniono i dlaczego:** Zrealizowano specyfikację z ADR 0019 dla jasnego motywu: grafitowe tło zastąpiono jasnoszarym `#f1f1ef`, powierzchnie kart białą barwą `#ffffff`, a obramowania `#c9c9c5`. Zastosowano ciemniejszy czerwony tekst `--app-crimson-ink: #a01027`, aby zagwarantować kontrast ≥ 4,5:1. Burza SVG została zredukowana do 60% krycia zgodnie z wytycznymi design system.
- **Lista animacji i mikrointerakcji:** Identyczne czasy i krzywe jak w wariancie spokojnym (350–400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`), zoptymalizowane pod kątem braku migotania na jasnych tłach.
- **Co byłoby trudne do wdrożenia:**
  - Zapobieganie przesunięciom kontrastowym w trakcie przełączania motywu (rozwiązanie: operowanie na dedykowanych zmiennych CSS bez hardkodowanych wartości barwnych w komponentach).
- **Inspiracje wzorcowe (Strava Light & Apple Fitness Light):**
  - Czyste białe karty z subtelnym obrysem 1 px, wysoki kontrast typografii i oszczędne czerwone akcenty.

---

## 2. Postęp (Analityka i tygodnie treningowe)

### 2.1 Wariant A: „Spokojny premium” (`progress-calm.html`)
- **Co zmieniono i dlaczego:** Uporządkowano hierarchię analityczną w 3 wyraźne bloki: górną siatkę 3 kafelków z linią żaru 2 px (treningi, minuty, rundy sparingu), wykres słupkowy „5 → 12 tygodni” oraz moduł oceny technicznej z kafelkami „Więcej” (2×2). Wykres tygodniowy posiada czytelne kreski planu celowego (`border-top: 2px solid var(--app-ink)`) i bieżący słupek w gradiencie karmazynowo-żarowym. Kafelki 2×2 mają stałą wysokość 112 px z możliwością rozwinięcia szczegółowej szuflady.
- **Lista animacji i mikrointerakcji:**
  - *Wzrost słupków wykresu:* `transform: scaleY(0) -> scaleY(1)` z punktem zaczepienia `transform-origin: bottom`, czas 400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - *Płynne rozwinięcie 12 tygodni:* wsuwanie kolumn z opóźnieniem i ponownym wzrostem słupków w 350 ms.
  - *Animowany licznik statystyk:* licznik minut 0 → 270 min oraz rund sparingowych 0 → 12, czas 400 ms.
  - *Rozwinięcie szuflady kafelka (drawer):* `transform: translateY(-6px) -> translateY(0)`, `opacity: 0 -> 1`, czas 250 ms.
- **Co byłoby trudne do wdrożenia:**
  - Płynna animacja właściwości `flex-grow` przy rozwijaniu wykresu z 5 do 12 kolumn może powodować kosztowny reflow układu (rozwiązanie: animowanie wyłącznie `transform: scaleX` lub dyskretna wymiana z płynnym `scaleY` słupków).
- **Inspiracje wzorcowe (Whoop Strain Analysis & Hevy Volume Analytics):**
  - Czytelne porównanie aktualnego tygodnia z tłem historycznym, jednoznaczny wskaźnik wykonania celu bez przeładowania zbędnymi etykietami.

---

### 2.2 Wariant B: „Odważny” (`progress-bold.html`)
- **Co zmieniono i dlaczego:** Nadano wykresowi i statystykom charakter tablicy wyników campu sparingowego. Kafelki górne posiadają powiększone cyfry Archivo 900 (30 px) z rozbłyskami żaru, a bieżący tydzień na wykresie wyróżnia się poświatą `box-shadow: 0 0 14px rgba(255, 117, 54, 0.7)`. Karta elementu do poprawy została wyposażona w wyrazistą czerwoną plakietkę oraz taktyczne kafelki oceny 1–5 z natychmiastowym feedbackiem stanu.
- **Lista animacji i mikrointerakcji:**
  - *Ekspresyjny skok słupków:* `transform: scaleY(0) -> scaleY(1)`, czas 400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - *Licznik statystyk z mikro-drżeniem:* 350 ms, 18 kroków.
  - *Tapnięcie kafelków ocen:* `transform: scale(0.94)`, czas 150 ms.
- **Co byłoby trudne do wdrożenia:**
  - Obsługa wielu aktywnych poświat `drop-shadow` przy dynamicznym przewijaniu (rozwiązanie: sprzętowa akceleracja przez `transform: translate3d(0,0,0)`).
- **Inspiracje wzorcowe (Strava Segment Achievements):**
  - Wyraziste wyróżnienie rekordów i zrealizowanych celów za pomocą gradientów ognistych.

---

## 3. Plan tygodnia (Harmonogram i zaliczanie sesji)

### 3.1 Wariant A: „Spokojny premium” (`week-plan-calm.html`)
- **Co zmieniono i dlaczego:** Zaprojektowano przejrzystą architekturę osi czasu dla dni od poniedziałku do niedzieli. Dzień dzisiejszy (czwartek) wyróżnia się subtelnym pionowym paskiem żarowym o szerokości 3 px i etykietą „DZIŚ”. Karta stałego tygodnia z ikoną powtarzania umieszczona jest bezpośrednio pod nagłówkiem tygodnia. Wprowadzono interaktywny przycisk zaliczenia dnia w planie: kliknięcie przycisku checkmarka natychmiast aktualizuje licznik zrealizowanych sesji (1 → 2 z 4) oraz wydłuża pasek postępu (25% → 50%).
- **Lista animacji i mikrointerakcji:**
  - *Zaliczenie dnia w planie:* przycisk checkmarka wykonuje sprężyste pulsowanie: `transform: scale(0.85) -> scale(1.15) -> scale(1)`, czas 300 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - *Wzrost paska postępu celu:* `width: 25% -> 50%`, czas 400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - *Wejście harmonogramu:* kaskadowe pojawianie się wierszy dni (opóźnienia 40–140 ms).
- **Co byłoby trudne do wdrożenia:**
  - Optymistyczna synchronizacja stanu zaliczenia z Firestore w tle przy zachowaniu natychmiastowej reakcji UI i możliwości cofnięcia (rozwiązanie: wykorzystanie `hasPendingWrites` z architektury projektu bez blokowania interfejsu).
- **Inspiracje wzorcowe (Apple Fitness Activity Schedule):**
  - Proste, kanciaste wiersze dni, czytelny stan odpoczynku (wolne) bez generowania pustych kart.

---

### 3.2 Wariant B: „Odważny” (`week-plan-bold.html`)
- **Co zmieniono i dlaczego:** Zastosowano dynamiczny kalendarz obozowy: wzmocnione obramowania `#55252c` dla dnia bieżącego, pulsującą etykietę „DZIŚ” z poświatą żaru oraz pasek postępu celu o grubości 8 px ze świetlistą krawędzią. Przycisk zaliczenia sesji reaguje obrotem o 4° i rozbłyskiem, dając zawodnikowi natychmiastowe poczucie ukończenia ciężkiego treningu.
- **Lista animacji i mikrointerakcji:**
  - *Pulsacyjna celebracja zaliczenia:* `transform: scale(0.8) -> scale(1.2) rotate(4deg) -> scale(1)`, `box-shadow: 0 0 14px rgba(255, 117, 54, 0.8)`, czas 320 ms.
  - *Skok paska postępu:* `width: 25% -> 50%`, czas 400 ms.
- **Co byłoby trudne do wdrożenia:**
  - Unikanie konfliktów gestów przewijania listy z poziomym przeciąganiem kart lub kliknięciem w opcje `⋯` (rozwiązanie: jawne reguły `touch-action: pan-y` na kontenerze wiersza).
- **Inspiracje wzorcowe (Hevy Workout Log & Nike Training Camp):**
  - Wyraziste, kontrastowe odznaczenia zrealizowanych zadań budujące nawyk regularności.

---

## 4. Podsumowanie po treningu (Ocena techniczna i debrief)

### 4.1 Wariant A: „Spokojny premium” (`summary-calm.html`)
- **Co zmieniono i dlaczego:** Wdrożono strukturę opartą na issue #187: bezpośrednio pod metrykami (45 min, 36 min pracy, 8/8 ćwiczeń) znajduje się karta elementu do poprawy (Niski kop po kombinacji) z triadą **Cel / Błąd / Wskazówka**. Każdy z trzech elementów posiada czytelną, stonowaną plakietkę o dedykowanym kodzie barwnym (żar dla celu, karmazyn dla błędu, zieleń dla wskazówki). Poniżej umieszczono dwa kluczowe pytania: „Czy ten błąd dziś się powtarzał?” (Lepiej / Bez zmian / Nie spr.) oraz „Jak dobrze ci wychodziło?” (skala 1–5 z pełnymi opisami zachowania).
- **Lista animacji i mikrointerakcji:**
  - *Wybór kafelka odpowiedzi:* `transform: scale(0.97)`, płynna zmiana obramowania i tła w 150 ms, `cubic-bezier(0.2, 0, 0, 1)`.
  - *Aktywacja skali 1–5:* podświetlenie numeru w barwie karmazynowej i rozjaśnienie opisu w 150 ms.
  - *Wejście ekranu:* sekwencyjne odsłonięcie podsumowania, karty kryterium i notatek (350 ms).
- **Co byłoby trudne do wdrożenia:**
  - Zapewnienie dostępności klawiatury i czytników ekranu (WCAG 2.1) dla rozbudowanych kafelków z opisami bez gubienia powiązania z grupą radiową (rozwiązanie: semantyczne znaczniki `<fieldset>` i `<legend>` z ukrytymi inputami radiowymi i etykietami `aria-checked`).
- **Inspiracje wzorcowe (Whoop Recovery Journal & Strava Post-Activity Reflection):**
  - Refleksyjna, spokojna atmosfera sprzyjająca rzetelnej samoocenie techniki bezpośrednio po wyjściu z sali.

---

### 4.2 Wariant B: „Odważny” (`summary-bold.html`)
- **Co zmieniono i dlaczego:** Przekształcono widok w taktyczny debrief narożnika po walce. Karta elementu do poprawy posiada gradientowe tło radialne, jaskrawe plakietki triady Cel/Błąd/Wskazówka oraz wyraziste, wysokie kafelki skali 1–5 z poświatą `#ff7536`. Główny przycisk „ZAPISZ OCENY” otrzymał 58 px wysokości, Archivo 900 i potężny cień karmazynowy, dając pewność kliknięcia nawet przy skrajnym zmęczeniu dłoni.
- **Lista animacji i mikrointerakcji:**
  - *Akcent wyboru kafelka:* `transform: scale(0.96)`, poświata `box-shadow: 0 0 10px rgba(224, 22, 57, 0.5)`, czas 150 ms.
  - *Rozbłysk numeru skali:* powiększenie do 20 px z cieniem tekstu żarowego, czas 150 ms.
- **Co byłoby trudne do wdrożenia:**
  - Zapobieganie przypadkowemu zamknięciu lub utracie wpisanej notatki przy gestach cofania w PWA (rozwiązanie: hook `useBeforeUnload` oraz stan roboczy `ManualFocusRatingDraft` w pamięci lokalnej).
- **Inspiracje wzorcowe (UFC Fight Analytics & Nike Training Club Debrief):**
  - Bojowy charakter, mocne kontrasty i bezbłędna ergonomia dotykowa.

---

## 5. Odtwarzacz treningu (Timer rundowy, przerwa i odliczanie)

### 5.1 Wariant A: „Spokojny premium” (`player-calm.html`)
- **Co zmieniono i dlaczego:** Zoptymalizowano interfejs pod kątem maksymalnej czytelności podczas wyczerpania fizycznego. Centralny timer pierścieniowy o średnicy 250 px wyposażono w cyfry o wysokości 54 px z krojem Archivo Tabular Nums, widoczne bez wysiłku z odległości 3 metrów. Wdrożono kluczową mikrointerakcję: **przejście runda → przerwa**. Przy zmianie fazy pierścień i poświata płynnie przechodzą z intensywnej czerwieni pracy w kojącą zieleń regeneracji, etykieta zmienia się z „RUNDA” na „PRZERWA”, a czas przeskakuje na 01:00 z lekkim powiększeniem cyfr.
- **Lista animacji i mikrointerakcji:**
  - *Przejście runda ↔ przerwa (cross-fade):* zmiana zmiennych CSS `--phase-color` i `--phase-bg`, czas 300 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - *Mikro-puls cyfr przy zmianie fazy (tick pop):* `transform: scale(1) -> scale(1.03) -> scale(1)`, czas 200 ms.
  - *Ruch obwodu timera:* płynne zmniejszanie `stroke-dashoffset`, krok 950 ms linear (zgodnie z wzorcem silnika odtwarzacza opartym na deadline zegara ściennego).
  - *Korekta czasu (±15 s):* mikro-skalowanie przycisków `scale(0.9)` w 150 ms.
- **Co byłoby trudne do wdrożenia:**
  - Płynne animowanie `stroke-dashoffset` w SVG w React przy jednoczesnym unikaniu gubienia klatek podczas usypiania karty lub wygaszania ekranu telefonu (rozwiązanie: obliczanie pozycji wyłącznie z bezwzględnego deadline i czasu rzeczywistego, nigdy przez jednosekundowe dekrementy w `setInterval`).
- **Inspiracje wzorcowe (Apple Fitness Workout Intervals & Gymboss Boxing Timer):**
  - Wyraziste rozróżnienie fazy pracy i odpoczynku barwą i układem, eliminujące konieczność podchodzenia do telefonu.

---

### 5.2 Wariant B: „Odważny” (`player-bold.html`)
- **Co zmieniono i dlaczego:** Zaprojektowano stoper o charakterze areny walki. Wokół okręgu timera dodano dynamiczną poświatę żarową (`drop-shadow: 0 0 20px rgba(224, 22, 57, 0.6)`), a cyfry powiększono do 58 px w Archivo 900. Zaimplementowano spektakularną mikrointerakcję przejścia: **falę uderzeniową (gong shockwave)** — w momencie uderzenia gongu z centrum timera rozchodzi się świetlisty okrąg żaru, zwiastujący natychmiastową zmianę fazy z pracy na odpoczynek.
- **Lista animacji i mikrointerakcji:**
  - *Fala uderzeniowa gongu (gong shockwave):* `transform: translate(-50%, -50%) scale(1) -> scale(18)`, `opacity: 1 -> 0`, czas 400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
  - *Przejście runda ↔ przerwa:* jaskrawy przeskok barw z krwistego karmazynu w neonową zieleń, czas 300 ms.
  - *Puls cyfr (tick pop bold):* `transform: scale(1.05)`, czas 150 ms.
  - *Nawigacja kroków:* sprężyste wciśnięcie przycisków sterowania w 150 ms.
- **Co byłoby trudne do wdrożenia:**
  - Równoczesne odtworzenie synchronicznego dźwięku gongu przez Web Audio API z uwzględnieniem restrykcji autoplay przeglądarek mobilnych (rozwiązanie: odblokowanie AudioContext przy pierwszym tapnięciu startu zgodnie z architekturą `useWorkoutGong`).
- **Inspiracje wzorcowe (Nike Training Club High-Intensity & Fight Camp Bell):**
  - Maksymalny ładunek energii, bezkompromisowa czytelność w pocie i rękawicach bokserskich.

---

## 6. Zgodność z Wymaganiami Technicznymi i Dostępnością

1. **Wymiary viewportu:** Każdy ekran jest zoptymalizowany pod standardowy ekran smartfona **390×844 px**.
2. **Minimalny cel dotyku (Touch Targets):** Wszystkie przyciski, kafelki, kontrolki radiowe i elementy nawigacyjne mają minimalną wysokość lub wymiary **≥ 44×44 px**.
3. **Kontrast typografii:** Zgodnie z normą WCAG AA, każdy tekst na powierzchniach ciemnych i gradientach spełnia rygorystyczny kontrast **≥ 4,5:1** (w tym czerwony tekst wyłącznie przez `text-crimson-ink: #ef5d6e` lub `#a01027`, nigdy za ciemne `#c1122f`).
4. **Kodowanie stanu:** Żaden stan (wykonany, zaplanowany, nie byłem, wolne) nie opiera się wyłącznie na barwie — każdy stan uzupełniony jest jednoznaczną ikoną inline SVG (✓, –, przerywana linia), etykietą tekstową oraz semantycznym atrybutem `aria-label`.
5. **Czystość kodu:** Brak zewnętrznych bibliotek i frameworków w plikach laboratoryjnych; wyłącznie semantyczny HTML, standardowy CSS oraz czysty JavaScript.
6. **Brak emoji:** Żadne unicode emoji nie zostały użyte w kodzie ani interfejsie — wszystkie piktogramy to precyzyjne wektory SVG.
7. **Wsparcie `prefers-reduced-motion`:** W każdym pliku zaimplementowano regułę `@media (prefers-reduced-motion: reduce)`, która całkowicie unieszkodliwia ruch i skalowanie, zastępując je natychmiastowym przełączeniem stanów.
