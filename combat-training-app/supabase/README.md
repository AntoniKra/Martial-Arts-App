# Supabase

- migracje trafiają do `migrations/`;
- dane startowe biblioteki trafiają do kontrolowanego seedera;
- zmiany schematu nie są wykonywane ręcznie bez migracji;
- przed wdrożeniem należy przetestować RLS na dwóch różnych zalogowanych kontach oraz dla żądania bez logowania.
