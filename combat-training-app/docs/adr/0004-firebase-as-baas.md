---
status: accepted
---

# Firebase jako backend (BaaS), zastępuje ADR 0001

Wybieramy Firebase: Authentication, Cloud Firestore w regionie `europe-central2` (Warszawa) i Hosting, na darmowym planie Spark. ADR 0001 (Supabase) przestaje obowiązywać.

O wyborze zdecydowały wymagania, które wyszły przy projektowaniu wersji finalnej:

- **Zapis treningu bez sieci.** Firestore z `persistentLocalCache` zapisuje zakończony trening offline i wysyła go po powrocie sieci. Test w `spikes/firestore-offline` potwierdził, że niewysłany zapis przetrwa zamknięcie karty i całej przeglądarki w Chromium i WebKit.
- **Samodzielna rejestracja uczestników badania.** Firebase Authentication wysyła e-maile z potwierdzeniem adresu i resetem hasła bez własnego serwera SMTP.
- **Działanie aplikacji do obrony.** Darmowy projekt nie usypia się po tygodniu bez ruchu.
- **Hosting z HTTPS** jest w tej samej platformie.

Argument z ADR 0001 o analizie w SQL okazał się słaby przy kilkuset wpisach na osobę. Statystyki liczymy w `src/domain`, tak jak dotąd.

## Konsekwencje

- **Brak grupowania w zapytaniach.** Firestore nie grupuje danych, więc statystyki tygodniowe liczymy w aplikacji z pobranych wpisów albo z dokumentu podsumowania aktualizowanego przy zapisie.
- **Większa biblioteka:** około 175 KB po gzip dla Firestore z trybem offline. Firestore ładujemy po pierwszym renderze. W pomiarze Lighthouse daje to wynik jak przy Supabase: 88 wobec 92 bez backendu.
- **Interfejs nie czeka na potwierdzenie zapisu offline**, bo obietnica kończy się dopiero po zapisie na serwerze. Zamiast tego pokazujemy stan „czeka na wysłanie” na podstawie `hasPendingWrites`.
- **Konta Firebase Authentication są przetwarzane w USA**, a dane treningowe leżą w Warszawie. Opisujemy to w informacji dla uczestników badania. Konto przechowuje tylko e-mail.
- **Brak kopii zapasowych.** Darmowy plan nie ma zarządzanego eksportu ani kopii zapasowych, więc aplikacja dostanie eksport „Moje dane” do pliku JSON.
- **Safari może skasować dane witryny** po 7 dniach bez wejścia. Zachęcamy do instalacji PWA i wywołujemy `navigator.storage.persist()`.
- **Uzależnienie od dostawcy** ograniczamy warstwą repozytoriów: typy i obliczenia są w `src/domain`, a Firebase tylko w `src/infrastructure`.
- **Wylogowanie czyści lokalną pamięć Firestore**, żeby kolejna osoba na tym urządzeniu nie zobaczyła cudzych danych.

## Rozważone opcje

- **Supabase (PostgreSQL, RLS):** lepszy do analiz w SQL i bardziej przenośny. Nie ma jednak wbudowanego trybu offline, bez własnego SMTP wysyła e-maile tylko członkom zespołu i usypia darmowy projekt po tygodniu bez ruchu.
- **Firebase Data Connect (PostgreSQL w Firebase):** na planie Spark to tylko 90-dniowa wersja próbna, po której baza jest archiwizowana.

Źródła i pomiary: `docs/research/backend-firebase-vs-supabase.md` i `spikes/firestore-offline/RESULTS.md`.
