# Backlog

Kolejność odpowiada priorytetom z `mvp-scope.md`. Każda pozycja to osobna gałąź i pull request.

Stan przed zamrożeniem funkcji, po audycie 22 listopada 2026.

## P0: rdzeń

1. ~~Strona główna z prawdziwą historią zamiast danych przykładowych i poprawny licznik ćwiczeń w historii.~~ Zrobione w PR #7.
2. ~~Firestore z trybem offline, reguły bezpieczeństwa z testami izolacji i repozytoria planów oraz historii.~~ Zrobione w PR #53 i #54.
3. ~~Rejestracja, logowanie, reset hasła i logowanie kontem Google.~~ Zrobione w PR #27 i #94.
4. ~~Dziennik: ręczny wpis treningu i edycja wpisu.~~ Zrobione w PR #99 i #158.
5. ~~Cele z paskiem postępu.~~ Zrobione w PR #80, #165 i #177.
6. ~~Profil zawodnika: waga i statystyki.~~ Zrobione w PR #102 i #158.
7. ~~Szybki stoper z gongiem i Wake Lock.~~ Zrobione w PR #10 i #110.
8. ~~Jasny motyw z przełącznikiem.~~ Zrobione w PR #8.
9. ~~PWA i publiczne wdrożenie na Firebase Hosting.~~ Zrobione w PR #13, #31 i #79.
10. ~~Testy E2E na trzech rozdzielczościach.~~ Zrobione w PR #21, #137 i #162.

## P1: ważne

1. ~~Ocena ćwiczeń, RPE i notatka po treningu.~~ Zrobione w PR #72, #73 i #216.
2. ~~Edycja i usuwanie planu.~~ Zrobione w PR #19.
3. ~~Ochrona przed utratą treningu przy błędzie zapisu.~~ Ponowienie zapisu i przywracanie lokalnej migawki w PR #66.
4. ~~±15 s i menu zakończenia z potwierdzeniem.~~ Zrobione w PR #38, #92 i #168.
5. ~~Instrukcja uruchomienia i katalog zrzutów.~~ Instrukcja w PR #21 i #31, katalog w PR #140. Odnośniki i aktualny opis w [README aplikacji](../README.md) w ramach [#225](https://github.com/AntoniKra/Martial-Arts-App/issues/225).

## Otwarte badania do rozdziału 5

- [ ] Przeprowadzić ankietę użyteczności SUS i opracować wyniki.
- [ ] Zmierzyć dokładność timera na telefonach, w tym po przejściu aplikacji do tła i po powrocie.
- [ ] Wykonać audyty Lighthouse i pomiary wydajności według [protokołu](performance-testing.md).
- [ ] Zebrać wyniki CI, w tym E2E na trzech rozdzielczościach i testy izolacji Firestore, dla SHA zamrożenia.

## P2: kierunki rozwoju

Pozycje z sekcji „Kierunki rozwoju” w `mvp-scope.md`. Nie dodawać bez osobnej decyzji.
