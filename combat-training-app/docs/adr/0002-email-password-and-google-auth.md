---
status: accepted
---

# Logowanie e-mailem i hasłem oraz kontem Google

Karta tematu wymaga rejestracji i logowania opartego na chmurze, dlatego rezygnujemy z planowanego wcześniej anonimowego konta bez ekranu logowania. Używamy Firebase Authentication (dostawcę zmienił ADR 0004, wcześniej Supabase Auth): e-mail i hasło z potwierdzeniem adresu i resetem hasła oraz logowanie kontem Google. Nie importujemy danych zapisanych wcześniej w przeglądarce (localStorage), bo aplikacja nie ma jeszcze użytkowników.
