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

## Konta pokazowe w produkcji

Właściciel zakłada w aplikacji trzy osobne konta e-mail/hasło, wyłącznie do
pokazów. Może użyć aliasów skrzynki, np. adresów z dopiskami `+kuba`,
`+ola` i `+marek`. Przed zasileniem każdego konta potwierdza adres
e-mail i w razie potrzeby przechodzi onboarding. Dane treningowe i zdrowotne
są fikcyjne.

W katalogu `combat-training-app` uzupełnij `.env` konfiguracją Firebase
używaną przez aplikację produkcyjną (`VITE_FIREBASE_PROJECT_ID`
i `VITE_FIREBASE_API_KEY`). Skopiuj `.env.showcase.example` do
`.env.showcase` i wpisz pary adresu oraz hasła dla swoich kont pokazowych.
Plik `.env.showcase` jest ignorowany przez Git. Jeśli hasło zawiera znak
`#`, ujmij wartość w cudzysłów zgodnie z formatem `.env`.

Po `npm ci` uruchom poniższe polecenie osobno dla każdego konta.
Za każdym razem sprawdź wyświetlony identyfikator projektu i adres e-mail,
a następnie wpisz `tak`, aby rozpocząć zapis.

```sh
npm run showcase -- --persona kuba --production
npm run showcase -- --persona ola --production
npm run showcase -- --persona marek --production
```

- **Kuba** – 13 treningów bokserskich w 8 tygodniach, trzy opuszczone terminy i cztery wpisy samopoczucia.
- **Ola** – 40 treningów w 14 tygodniach. Zachowuje dotychczasowy zestaw z trybu lokalnego, w tym dyscyplinę kickboxing.
- **Marek** – 70 treningów kickboxingu w 16 tygodniach, z mocnymi sparingami, lżejszym co czwartym tygodniem i dziesięciodniową przerwą.

Historia obejmuje zakończone tygodnie liczone w strefie Europe/Warsaw.
Skrypt korzysta z reguł Firestore i uprawnień zalogowanego właściciela konta.
Gdy są już zapisane treningi, skrypt odmawia zapisu. Na dedykowanym koncie
możesz dodać `--replace`, aby usunąć i wgrać od nowa dokumenty z kolekcji
`workoutSessions`, `workoutPlans`, `focusSkills`, `weekPlans`, `recurringWeeks`,
`bodyWeights`, `readiness` i `exercises`. Profil jest zapisywany osobno z zachowaniem
istniejących zgód i znacznika wycofania zgody na samopoczucie.
Po przerwaniu zapisu uruchom ponownie tę samą personę z `--replace`.
Operację wykonuj, gdy konto nie zapisuje równolegle danych w aplikacji.

Aby trwale usunąć dane pokazowe, zaloguj się na odpowiednie konto i użyj
opcji usunięcia konta w Profilu. Usuwa ona również konto Firebase Authentication.
Zobacz [ADR 0020](adr/0020-production-showcase-accounts.md).
