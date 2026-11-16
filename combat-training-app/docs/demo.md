# Tryb pokazowy na emulatorach

Wymagania: Node.js 22.12+ (zalecany 24 LTS), npm i Java 21 dostępna w `PATH`.
Zależności projektu muszą być zainstalowane poleceniem `npm ci` w katalogu
`combat-training-app`. Pierwszy start emulatora może wymagać pobrania pliku przez internet.

W tym samym katalogu uruchom `npm run demo`. Polecenie uruchamia emulatory
Authentication i Firestore dla `demo-combat-training`, tworzy zweryfikowane konto,
weryfikuje dane schematami i zapisuje je z uprawnieniami właściciela przez reguły.
Następnie otwórz [aplikację lokalną](http://127.0.0.1:5173).
Adres e-mail i hasło fikcyjnego konta są wypisywane w konsoli po przygotowaniu danych.
Zaloguj się zwykłym formularzem; nie potrzeba konta Firebase ani pliku `.env`.

Dane obejmują 40 treningów w 14 zakończonych tygodniach, w tym jedną przerwę
dwutygodniową, 19 ocen trzech elementów do poprawy (8 rosnących, 8 stałych,
3 schowanego elementu), trzy plany i trzy własne ćwiczenia, stały tydzień,
konkretne plany tygodnia v2, 35 dni samopoczucia oraz 20 pomiarów masy ciała.
Daty są liczone względem dnia uruchomienia w strefie Europe/Warsaw.
Zgody na oba rodzaje danych o zdrowiu wraz z potwierdzeniem 18+ dotyczą
wyłącznie tego fikcyjnego konta. W Postępie przycisk „Pokaż 12 tygodni”
rozwija wykres; „Samopoczucie” pokazuje dostępną normę. Poprzednie tygodnie
pokazują zaliczenia, „Nie byłem”, treningi poza planem i zmieniony dzień treningu.

Opcjonalnie `npm run demo -- --empty` tworzy konto bez historii, planów,
ćwiczeń i zgód — do oglądania pustych stanów.

Widok telefonu: w przeglądarce otwórz DevTools (`F12`), włącz pasek urządzeń
(`Ctrl+Shift+M`, na macOS `Cmd+Shift+M`) i ustaw np. 360 × 800.

`Ctrl+C` zamyka serwer oraz oba emulatory. Dane znikają po zakończeniu;
następne uruchomienie tworzy je od nowa. Porty 5173, 8080 i 9099 muszą być wolne.
Logi emulatorów i pamięć robocza Vite trafiają do katalogu tymczasowego systemu.
Tryb ignoruje lokalne ustawienia Firebase i `.env`, wymusza adresy `127.0.0.1`
oraz projekt `demo-` przed zapisem. Nie łączy się z prawdziwym projektem.

`screenshots:tour` korzysta z tego samego generatora i zapisu danych; zwykłe
`npm run typecheck` obejmuje także jego kod. Testy jednostkowe danych demo
są częścią `npm test` i nie uruchamiają emulatorów ani testów E2E.
