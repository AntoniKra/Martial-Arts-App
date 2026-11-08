# fix(ui): przywróć typografię przycisków i pól formularzy

Closes #43

Usunięto nadmiarowe `font: inherit` poza warstwą CSS. Przyciski otrzymują teraz rozmiar, grubość i krój ze swoich dotychczasowych klas. Style `html` i `body` przeniesiono do `@layer base`; obrys fokusu zachowano. Pola kreatora, filtrów i notatki mają jawne 16 px. Klasy przycisków, kolory i układ pozostają bez zmian.

Pomiary `getComputedStyle` przy 360×800, identyczne w obu motywach. Zapis: rozmiar / grubość / krój.

| Element | Przed | Po |
| --- | --- | --- |
| Przycisk główny md | 16 px / 400 / Inter | 13 px / 600 / Archivo |
| Zakładki „Plany / Historia” | 16 px / 400 / Inter | 12 px / 600 / Archivo |
| Obie pozycje menu odtwarzacza | 16 px / 400 / Inter | 13 px / 600 / Archivo |
| Przyciski okna zakończenia | 16 px / 400 / Inter | 14 px / 600 / Archivo |
| „Uruchom ponownie” | 16 px / 400 / Inter | 14 px / 600 / Archivo |
| „Dodaj notatkę” | 16 px / 400 / Inter | 11 px / 600 / Archivo |
| Skróty formatów rund | 16 px / 400 / Inter | 12 px / 600 / Archivo |
| Pole e-mail | 16 px / 400 / Inter | 16 px / 400 / Inter |
| Pole liczby rund | 16 px / 400 / Inter | 16 px / 400 / Archivo |

Na każdy motyw: 124 pomiary przycisków, minimum 44 px wysokości; 43 pomiary pól, wszystkie 16 px. Przyciski bez `min-h-*` mają 48 lub 64 px dzięki istniejącym klasom `size-*`. Fokus przed i po: ciągły obrys 2 px z odsunięciem 2 px i dotychczasowym kolorem tokenu.

[Raport, surowe pomiary oraz 80 zrzutów przed/po w obu motywach](https://github.com/AntoniKra/Martial-Arts-App/blob/fix/button-font-cascade/combat-training-app/docs/reviews/issue-43/README.md) obejmują wszystkie wymagane ekrany: logowanie, start, plany, historię, konfigurację ćwiczenia, szczegóły planu, odtwarzacz z menu, okno zakończenia i ekran końca.

Definition of done:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS, 0 błędów, 21 istniejących ostrzeżeń.
- `npm test`: 384 PASS / 0 FAIL / 0 SKIP, w tym 7 testów ochrony kaskady CSS.
- `npm run build`: PASS.
- `npm run test:e2e`: 162 PASS / 0 FAIL / 0 SKIP, 0 flaky; Chromium 360×800, 768×1024, 1440×900 i emulator `demo-combat-training`.
- Celowane E2E telefonu: 2 PASS. Na źródłach sprzed poprawki oba testy prawidłowo wykrywają błąd; test CSS również odrzuca pierwotną regułę.

Brak odstępstw od zakresu. P3: istniejące ostrzeżenia lint/Vite; fizycznego Safari na iPhonie nie testowano. Bez wdrożenia, scalenia, produkcji, sekretów i zmian w referencji Figmy.
