---
status: accepted
---

# Wpis w dzienniku: źródła, status, czas i dzień treningu

Ustalenia właściciela z 4 listopada 2026 (druga runda ustaleń, pytania Q1–Q4). Od tych definicji zależą cele, statystyki i model danych w Firestore, więc obowiązują wszystkie moduły.

## Źródła wpisu

Każdy trening trafia do jednego dziennika i ma oznaczone źródło (`source`):

- `plan`: plan wykonany w odtwarzaczu;
- `quickTimer`: szybki stoper, czyli same rundy bez zapisywania planu;
- `manual`: ręczny wpis treningu wykonanego poza aplikacją.

**Rodzaj treningu** (`category`) to typ bloku bez rozgrzewki (`technique`, `pads`, `bag`, `sparring`, `conditioning`, `strengthAndConditioning`) albo `mixed`. Wpis z planu dostaje rodzaj automatycznie: jeśli wszystkie bloki oprócz rozgrzewki mają ten sam typ, wpis dostaje ten typ, w przeciwnym razie `mixed`. Ręczny wpis zawiera datę, dyscyplinę, rodzaj i czas trwania. Nie dopisujemy mu wymyślonych rund ani godzin.

## Status

- `completed`: przebieg całego planu albo wszystkich rund bez pomijania ćwiczeń. Pominięta przerwa nie obniża statusu.
- `partial`: trening zakończony wcześniej (przycisk „Zakończ wcześniej” z potwierdzeniem) albo z pominiętym ćwiczeniem, w którym była jakaś praca, czyli czas ćwiczeń większy od zera.
- Przebieg bez żadnej pracy **nie zapisuje się**, a użytkownik widzi o tym komunikat.

Do celów liczą się wpisy `completed` i `partial`. Historia pokazuje, który jest który. Nie stosujemy progu minimalnego czasu. Ręczny wpis jest deklaracją wykonanego treningu z dodatnim czasem.

## Czas i realizacja

Trzy osobne miary, nigdy mieszane:

- **Czas treningu** (`durationSeconds`): ile naprawdę biegł stoper, razem z odpoczynkami, przerwami i powtórzonymi rundami, ale bez pauz. W ręcznym wpisie to czas podany przez użytkownika.
- **Czas pracy** (`workSeconds`): tylko etapy ćwiczeń, bez odpoczynków i przerw. Osobno liczymy czas sparingu (`sparringSeconds`, ćwiczenia w blokach typu `sparring`). W ręcznym wpisie oba mogą być nieznane.
- **Realizacja:** dla planu ukończone ćwiczenia wobec zaplanowanych, dla szybkiego stopera ukończone rundy wobec zaplanowanych. Dla ręcznego wpisu „nie dotyczy”, a nie 100%. Realizacji nie wyliczamy z czasu ani z ocen.

## Dzień treningu

`workoutDate` to dzień **rozpoczęcia** treningu w strefie czasowej użytkownika (`timezone` zapisany razem z wpisem), utrwalony przy zapisie. Trening od 23:30 do 00:30 należy do dnia startu. Późniejsza zmiana strefy nie przesuwa dawnych wpisów. Ręczny wpis ma samą datę, bez godziny. Moment zapisu (`createdAt`) to osobne pole.

## Poza tym ADR

Zakres danych zbieranych po treningu (RPE, oceny ćwiczeń, inne miary) i sposób oceny postępów zostaną ustalone po researchu literatury i funkcji (listopad 2026).
