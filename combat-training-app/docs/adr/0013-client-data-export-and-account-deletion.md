---
status: accepted
---

# Eksport danych i usunięcie konta po stronie klienta

Na planie Firebase Spark eksport i natychmiastowe usunięcie konta wykonuje klient, bez Cloud Functions i okresu karencji. Profil oferuje osobno surowy JSON wszystkich wdrożonych kolekcji i dokumentu profilu oraz CSV dziennika dla polskiego Excela. Odczyt pochodzi wyłącznie z serwera; brak sieci i niewysłane zapisy blokują operację. JSON zachowuje także dokumenty niezgodne ze schematami aplikacji. Usunięcie wymaga ponownego logowania hasłem albo Google (przekierowanie na telefonie/PWA, okno na komputerze) i osobnego końcowego potwierdzenia. Przed pierwszym usunięciem odświeżamy token i wymagamy potwierdzenia nie starszego niż 4 minuty, liczonego z dwóch czasów serwera w tym tokenie (`issuedAtTime − authTime`), bez zegara urządzenia. Zapis zatrzymany przez utratę sieci w trakcie usuwania kończy etap błędem zamiast czekać. Najpierw usuwamy `bodyWeights`, potem `workoutSessions`, `focusSkills`, `weekPlans`, `workoutPlans` partiami do 500, następnie profil, a na końcu konto Auth. Przerwane usuwanie można powtórzyć. Sprzątanie pamięci urządzenia wykonuje warstwa application także po odmontowaniu trasy: zamyka nasłuchy, czyści Firestore, klucze `combat-training.*.{uid}` i znacznik przekierowania, zachowując ustawienia urządzenia.

## Znane ograniczenie planu Spark

Token na innym urządzeniu może pozostać ważny do godziny po usunięciu Auth. Zaległy zapis offline może wtedy odtworzyć dokument pod usuniętym kontem, a lokalna kopia pozostaje na tamtym urządzeniu. Blokada wycofywania zgody na pomiary (issue #226) jest przechowywana w profilu, który znika podczas usuwania konta. Po usunięciu konta ograniczenie nadal obowiązuje na planie Spark bez Cloud Functions. Przed usunięciem należy połączyć pozostałe urządzenia z internetem i wylogować się na nich. Właściciel ręcznie sprawdza konsolę Firebase według `deployment.md`. Ochrona przed zaległymi zapisami po usunięciu konta pozostaje pracą przyszłą (rozdział 6.3 pracy).
