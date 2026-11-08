---
status: accepted
---

# Odczyt z Firestore przez `onSnapshot` w repozytoriach, bez TanStack Query

Decyzja właściciela z 5 listopada 2026 (Q10). Zastępuje zapis „dane serwerowe: docelowo TanStack Query” w `docs/architecture.md`.

Repozytoria w `src/infrastructure` słuchają kolekcji przez `onSnapshot` i oddają aplikacji dane już sprawdzone schematem `zod/mini`. Komponenty korzystają z nich przez mały własny hook z `src/application`, nigdy przez Firebase. Firestore sam daje to, czego potrzebujemy: pamięć podręczną na urządzeniu, działanie bez sieci, natychmiastowy lokalny wynik zapisu i znacznik `hasPendingWrites`, z którego interfejs pokazuje stan „czeka na wysłanie”.

TanStack Query trzymałby drugą kopię tych samych danych obok pamięci Firestore. Jego model „zapytanie i odświeżenie” źle pasuje do subskrypcji, a stan „czeka na wysłanie” i tak trzeba by brać z Firestore. Dokłada też zależność do paczki.

## Konsekwencje

- **Interfejs repozytorium** dostaje metodę subskrypcji, np. `subscribe(onChange, onError): Unsubscribe`. Zapis (`save`, `delete`, aktualizacje pól) zwraca się od razu po zapisie lokalnym i nie czeka na serwer (ADR 0004).
- **Jedna subskrypcja na kolekcję** dla całej zalogowanej sesji, w providerze nad trasami. Ekrany nie otwierają własnych nasłuchów tej samej kolekcji.
- **Stany hooka:** ładowanie, dane z `hasPendingWrites`, błąd. Dokument, który nie przejdzie walidacji, jest pomijany i zgłaszany jako błąd danych, a nie zatrzymuje całej listy.
- **Wylogowanie** zamyka wszystkie subskrypcje przed wyczyszczeniem pamięci Firestore.
- **Koszt odczytów** i to, czego słuchamy w każdej kolekcji, opisuje `docs/database-model.md`.
- Gdyby kiedyś doszły dane spoza Firestore z typowym zapytaniem i odświeżeniem, wybór biblioteki wymaga nowego ADR.
