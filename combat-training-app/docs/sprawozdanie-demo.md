# Combat Training App — sprawozdanie z dema

**Projekt:** Aplikacja do planowania i prowadzenia treningów sportów walki  
**Status:** działające demo MVP (lokalne)  
**Stack:** React 19 · TypeScript · Vite · Tailwind CSS · React Router  
**Język UI:** polski  

> Uzupełnij przed oddaniem: **Imię i nazwisko**, **nr albumu**, **uczelnia**, **data**.

> **Dokument historyczny.** Ten plik i wersja `sprawozdanie-demo.html` opisują stan dema z 26 lipca 2026. Od tego czasu zamiast anonimowego konta przyjęto logowanie e-mailem i hasłem oraz kontem Google (`adr/0002-email-password-and-google-auth.md`), a gong, Wake Lock (PR #10) i PWA (PR #13, `adr/0003-pwa-with-vite-plugin-pwa.md`) są gotowe. Aktualny zakres: `mvp-scope.md` i `backlog.md`.

---

## 1. Cel projektu

Aplikacja wspiera trzy fazy treningu:

1. **Planowanie** — utworzenie planu z blokami, ćwiczeniami i przerwami  
2. **Wykonanie** — guided player z okrągłym timerem (PRACA / ODPOCZYNEK / PRZERWA)  
3. **Ewidencja** — zapis ukończonej sesji w Historii, notatki, usuwanie  

Grupa docelowa: osoby trenujące boks, kickboxing, Muay Thai, K-1 oraz MMA (stójka).

---

## 2. Co działa w obecnym demo

| Obszar | Status |
|--------|--------|
| Strona główna (Home) | ✅ |
| Lista planów + filtry | ✅ |
| Historia treningów | ✅ |
| Notatki do sesji + usuwanie | ✅ |
| Kreator planu treningowego | ✅ |
| Podgląd przed zapisem (w kreatorze) | ✅ |
| Szczegóły planu + start treningu | ✅ |
| Player (timer, pauza, poprzedni/następny) | ✅ |
| Zapis sesji po ukończeniu | ✅ |
| Dark / Light mode + zapamiętanie wyboru | ✅ |
| Responsywność (mobile + desktop) | ✅ |
| Edycja planu (osobna trasa) | ⏳ placeholder |
| Raport treningu / pełne feedback | ⏳ w planie MVP |
| Backend Supabase | ⏳ planowane (obecnie localStorage) |

---

## 3. Jak uruchomić demo

```bash
cd combat-training-app
npm install
npm run dev
```

Otwórz adres podany w terminalu (zwykle `http://localhost:5173`).

Dane (plany i historia) są zapisywane **lokalnie w przeglądarce** (`localStorage`).

---

## 4. Przepływ demonstracyjny (scenariusz)

1. Otwórz **Home** — sprawdź motyw (przełącznik jasny/ciemny).  
2. Przejdź do **Treningi → Plany**.  
3. Utwórz nowy plan w **kreatorze** (dyscyplina, bloki, ćwiczenia).  
4. Zapisz plan i otwórz **szczegóły**.  
5. Uruchom trening — **player** prowadzi etapy timera.  
6. Ukończ trening — sesja pojawia się w **Historii**.  
7. Dodaj notatkę / usuń sesję (confirmation).  

---

## 5. Screeny (do wklejenia)

Wklej zrzuty ekranu poniżej (zalecane: szerokość ok. 390 px mobile + 1–2 desktop).

### 5.1 Home

![Home](./screenshots/01-home.png)

*Krótki opis:* ekran startowy z wezwaniem do treningu i wyróżnionym planem.

### 5.2 Plany

![Plany](./screenshots/02-plany.png)

### 5.3 Historia (z notatką)

![Historia](./screenshots/03-historia.png)

### 5.4 Kreator planu

![Kreator](./screenshots/04-kreator.png)

### 5.5 Szczegóły planu

![Szczegóły](./screenshots/05-szczegoly.png)

### 5.6 Player — PRACA

![Player praca](./screenshots/06-player-praca.png)

### 5.7 Player — ODPOCZYNEK / PRZERWA

![Player odpoczynek](./screenshots/07-player-rest.png)

### 5.8 Trening ukończony

![Ukończony](./screenshots/08-completed.png)

### 5.9 Light mode

![Light mode](./screenshots/09-light-mode.png)

---

## 6. Architektura (skrót)

```text
src/
├── app/              router, providery
├── components/       layout, UI, ikony
├── domain/           typy i reguły domenowe (bez Reacta)
├── features/         home, workouts, builder, player, theme…
├── infrastructure/   localStorage (plany i sesje)
└── pages/            strony tras
```

Zasady:

- logika domenowa oddzielona od UI  
- storage za interfejsem repozytorium  
- player i timer jako osobny moduł stanu  
- motywy przez semantyczne tokeny CSS (`data-theme`)

---

## 7. Design

- ciemny motyw jako domyślny, jasny jako kompletna alternatywa  
- akcent marki: crimson  
- typografia: Inter + Archivo  
- priorytet: czytelność na telefonie podczas treningu  

---

## 8. Dalsze prace (kolejne etapy MVP)

- pełne podsumowanie / feedback po treningu  
- raport historii  
- edycja zapisanego planu  
- backend Supabase + anonimowa sesja  
- PWA, gong, Wake Lock (zgodnie ze specyfikacją)

---

## 9. Podsumowanie

Demo pokazuje kompletny rdzeń produktu: **utwórz plan → poprowadź trening timerem → zapisz i przeglądaj historię**, z motywami dark/light i interfejsem zoptymalizowanym pod mobile.

---

*Plik roboczy: `docs/sprawozdanie-demo.md` · wersja wizualna do PDF: `docs/sprawozdanie-demo.html`*
