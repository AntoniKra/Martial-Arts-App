---
status: accepted
---

# Supabase jako backend (BaaS)

Temat pracy wymaga architektury chmurowej typu BaaS, a karta tematu dopuszcza Firebase albo Supabase. Wybieramy Supabase, bo dane aplikacji są relacyjne (plan → bloki → elementy, sesje z wynikami rund), a analiza postępów to agregacje SQL: sumy, średnie i trendy. PostgreSQL z Row Level Security izoluje dane użytkowników na poziomie samej bazy, a migracje SQL wersjonują schemat.

## Rozważone opcje

- **Firebase (Firestore):** baza dokumentowa. Relacje między planem, blokami i sesjami oraz raporty analityczne byłyby trudniejsze do modelowania i zapytań.
- **Własny backend:** więcej pracy i utrzymania bez korzyści dla tematu pracy, który zakłada BaaS.
