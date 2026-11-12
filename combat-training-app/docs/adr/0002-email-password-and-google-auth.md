---
status: accepted
---

# Logowanie e-mailem i hasłem oraz kontem Google

Karta tematu wymaga rejestracji i logowania opartego na chmurze, dlatego rezygnujemy z planowanego wcześniej anonimowego konta bez ekranu logowania. Używamy Firebase Authentication (dostawcę zmienił ADR 0004, wcześniej Supabase Auth): e-mail i hasło z potwierdzeniem adresu i resetem hasła oraz logowanie kontem Google. Nie importujemy danych zapisanych wcześniej w przeglądarce (localStorage), bo aplikacja nie ma jeszcze użytkowników.

**Dopisek (12.11.2026, logowanie Google).** Na telefonie i w zainstalowanej PWA logowanie Google używa przekierowania (`signInWithRedirect`), bo okna są tam zawodne; na komputerze z myszą używa okna (`signInWithPopup`). Wynik przekierowania odbiera aplikacja po powrocie. Żeby przekierowanie działało w przeglądarkach blokujących dane stron trzecich (Safari, nowsze Chrome), `authDomain` wskazuje domenę, na której działa aplikacja (`combat-training-830fb.web.app`), a nie `…firebaseapp.com`; Hosting serwuje `/__/auth/handler`, a service worker nie podmienia tej ścieżki. Kont nie łączymy w aplikacji. Firebase przy zgodnym, potwierdzonym przez Google adresie sam dopina Google do istniejącego konta (ten sam `uid`, dane zostają); gdy odmawia (`auth/account-exists-with-different-credential`), aplikacja prosi o logowanie hasłem.
