# Supabase integration

Implementacja zostanie dodana razem z logowaniem i pierwszymi migracjami.

Docelowo katalog zawiera:

- `client.ts`;
- wygenerowane typy bazy;
- mapowanie błędów;
- repozytoria danych;
- obsługę sesji zalogowanego użytkownika (Supabase Auth: e-mail i hasło oraz Google, zob. `docs/adr/0002-email-password-and-google-auth.md`).

Nie wykonuj surowych zapytań Supabase w komponentach React.
