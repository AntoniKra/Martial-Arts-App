# ADR 0020: Konta pokazowe w produkcji

Data: 21 listopada 2026. Status: przyjęta.

Zgodnie z decyzją właściciela w [#215](https://github.com/AntoniKra/Martial-Arts-App/issues/215) fikcyjne dane pokazowe trafiają na trzy osobne, zweryfikowane konta właściciela w produkcji. Dzięki temu przykłady do pracy dyplomowej i sprawdzenie widoku Postęp korzystają z tej samej aplikacji co użytkownicy. Właściciel po potwierdzeniu projektu i adresu uruchamia lokalny skrypt, który waliduje dokumenty schematami trybu demo i zapisuje je przez REST Firestore z tokenem zalogowanego użytkownika. Obowiązują reguły właściciela ścieżki `users/{uid}`. Po przerwaniu zapisu `--replace` usuwa dokumenty z kolekcji pokazowych tego konta przed odtworzeniem zestawu. Trwałe usunięcie zestawu i tożsamości konta odbywa się przez Profil zgodnie z ADR 0013. Dane logowania są przechowywane w lokalnym pliku `.env.showcase`.
