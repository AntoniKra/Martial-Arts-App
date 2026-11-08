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

RPE, intensywność sparingu i trendy pozostają poza tym modułem.
