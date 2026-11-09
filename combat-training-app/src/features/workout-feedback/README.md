# workout-feedback

Podsumowanie sesji z planu: `/workout-sessions/:sessionId/feedback`.

Wpis w dzienniku istnieje przed otwarciem formularza. Odtwarzacz utrwala migawki
nazwy, kryterium i typu bloku w `focusRatings`, także przy wznowieniu treningu.
Formularz korzysta z migawek sesji, bez ponownego odczytu planu lub biblioteki.

`prepareWorkoutFeedback` w domenie pilnuje pominięć i zasad R2. Przy powtórzeniu
ćwiczenia celu tylko pierwsze wystąpienie sprawdza poprzednią notatkę, a ostatnia
nowa notatka w kolejności planu zastępuje wcześniejsze. Ponowny zapis nie otwiera
zamkniętej już notatki, jeśli użytkownik nie zmienił zapisanej poprawki.

Repozytorium zapisuje oceny, notatkę i zmiany `openCorrection` jednym `writeBatch`.
Czeka na lokalne migawki obu kolekcji; nie czeka na serwer. Stan wysyłania pochodzi
z `hasPendingWrites`. Istniejące reguły dopuszczają te aktualizacje i ograniczają
`focusRatings` do trzech; testy emulatora sprawdzają też odrzucenie całej partii.

`WorkoutRpeSummary` dodaje kartę RPE nad ćwiczeniami celu. Odliczanie wynika z
`completedAt + 10 min` oraz zegara; powrót do widocznej karty odświeża pozostały
czas. Termin końcowy otwiera panel raz i odtwarza gong, jeśli przy wejściu do
podsumowania pozostawał czas, a użytkownik odblokował dźwięk. Wejście po terminie
pokazuje „Czas na ocenę” i „Oceń teraz”, bez gongu ani automatycznego panelu.
Wskazówka „Gong da znać” jest widoczna tylko w czasie odliczania.
Link `?rpe=1` nadal otwiera panel od razu. Pusta sekcja ćwiczeń celu jest ukryta.
`WorkoutGongProvider` zachowuje kontekst audio między odtwarzaczem a
podsumowaniem, a zamyka go po wylogowaniu. Można też wybrać „Oceń teraz”.

Formularz podsumowania pozostaje zamontowany pod panelem RPE, dzięki czemu nie
traci niezapisanych ocen ani notatki. `saveRpe` aktualizuje wyłącznie `rpe`,
`rpeRecordedAt` i `updatedAt`, z potwierdzeniem lokalnej migawki. Opisy skali są
w jednym pliku `rpeLabels.ts`; wymagają jeszcze sprawdzenia z opublikowanym
polskim tłumaczeniem CR-10, zgodnie z issue #70.

Strona główna przypomina o najnowszej sesji z planu bez RPE w ciągu 24 h od
zakończenia. Obsługa nowych źródeł wpisów dojdzie wraz z ich ekranami podsumowań.
Link `?rpe=1` od razu otwiera panel. „Pomiń” zapisuje identyfikator wpisu tylko
na urządzeniu, pod `combat-training.rpeDismissals.<uid>`, z `schemaVersion: 1`
i walidacją `zod/mini`. Nie zmienia Firestore ani nie blokuje późniejszej oceny.
Niedostępny storage pokazuje błąd, umożliwiając ponowienie.

Intensywność sparingu i trendy pozostają poza tym modułem.
