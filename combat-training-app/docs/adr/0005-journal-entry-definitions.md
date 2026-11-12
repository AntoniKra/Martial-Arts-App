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

**Rodzaj treningu** (`category`) to typ bloku bez rozgrzewki i rozluźnienia (`technique`, `pads`, `bag`, `sparring`, `conditioning`, `strengthAndConditioning`) albo `mixed`. Wpis z planu dostaje rodzaj automatycznie: jeśli wszystkie bloki oprócz rozgrzewki i rozluźnienia mają ten sam typ, wpis dostaje ten typ, w przeciwnym razie `mixed`. Ręczny wpis zawiera datę, dyscyplinę, rodzaj i czas trwania. Nie dopisujemy mu wymyślonych rund ani godzin.

## Status

- `completed`: przebieg całego planu albo wszystkich rund bez pomijania ćwiczeń. Pominięta przerwa nie obniża statusu.
- `partial`: trening zakończony wcześniej (przycisk „Zakończ wcześniej” z potwierdzeniem) albo z pominiętym ćwiczeniem, w którym była jakaś praca, czyli czas ćwiczeń większy od zera.
- Przebieg bez żadnej pracy **nie zapisuje się**, a użytkownik widzi o tym komunikat.

Do celów liczą się wpisy `completed` i `partial`. Historia pokazuje, który jest który. Nie stosujemy progu minimalnego czasu. Ręczny wpis jest deklaracją wykonanego treningu z dodatnim czasem.

## Czas i realizacja

Trzy osobne miary, nigdy mieszane:

- **Czas treningu** (`durationSeconds`): ile naprawdę biegł stoper, razem z odpoczynkami, przerwami i powtórzonymi rundami, ale bez pauz. W ręcznym wpisie to czas podany przez użytkownika.
- **Czas pracy** (`workSeconds`): tylko etapy ćwiczeń dokończone do końca czasu (doprecyzowanie z 6 listopada poniżej), bez odpoczynków i przerw. Osobno liczymy czas sparingu (`sparringSeconds`, dokończone ćwiczenia w blokach typu `sparring`). W ręcznym wpisie oba mogą być nieznane.
- **Realizacja:** dla planu ukończone ćwiczenia wobec zaplanowanych, dla szybkiego stopera ukończone rundy wobec zaplanowanych. Dla ręcznego wpisu „nie dotyczy”, a nie 100%. Realizacji nie wyliczamy z czasu ani z ocen.

## Korekty zegara (12 listopada 2026, issue #91)

`plannedDurationSeconds` w wyniku etapu oznacza czas docelowy po korektach `−15 s` / `+15 s`, co najmniej 1 s. Ukończona runda 3:00 wydłużona o 15 s zapisuje `plannedDurationSeconds = performedDurationSeconds = 195` i wnosi 195 s pracy. Skrócenie przy 15 s lub mniej kończy etap zwykłym przejściem `elapsed`, bez przenoszenia nadmiaru skrócenia na kolejny etap. Czasem docelowym jest wtedy czas już przepracowany według zegara: runda 3:00 skrócona przy 0:10 zapisuje 170 s, a nie 165 s. Korekty nie zmieniają licznika realizacji. Restart przywraca czas z planu, zachowując dotychczasowy najlepszy wynik i osobne czasy prób. Lokalny zapis wznowienia zachowuje cele etapów; historyczne zapisy bez korekt pozostają czytelne. Pola dokumentu i reguły Firestore nie zmieniają się.

## Dzień treningu

`workoutDate` to dzień **rozpoczęcia** treningu w strefie czasowej użytkownika (`timezone` zapisany razem z wpisem), utrwalony przy zapisie. Trening od 23:30 do 00:30 należy do dnia startu. Późniejsza zmiana strefy nie przesuwa dawnych wpisów. Ręczny wpis ma samą datę, bez godziny. Moment zapisu (`createdAt`) to osobne pole.

## Zmiana z 6 listopada 2026

Decyzja właściciela: pracą są wyłącznie rundy lub ciągłe etapy ćwiczeń dokończone do końca czasu.

- Etap ćwiczenia dostaje wynik `completed` tylko przy zakończeniu z powodem `elapsed`.
- Każde inne zakończenie etapu ćwiczenia (`next`, `previous`, a w przyszłości także „Zakończ”) daje `skipped`, `performedDurationSeconds: 0` oraz zero wkładu do `workSeconds` i `sparringSeconds`, niezależnie od upływu czasu.
- Rzeczywisty czas przerwanej próby nadal wchodzi do `durationSeconds`. Pauzy nadal są wyłączone z tego czasu.
- Każde dokończenie powtórzonej rundy dodaje pełny czas do pracy i, dla bloku `sparring`, do sparingu. Licznik realizacji nadal dotyczy zaplanowanych ćwiczeń, nie liczby prób.
- Przebieg bez żadnego dokończonego etapu ćwiczenia nie zapisuje się i pokazuje komunikat o braku pracy. Przeklikanie etapów po 0,5 s nie tworzy wpisu. Nie jest to nowy próg czasu — warunkiem jest dokończenie etapu.
- Odpoczynki między rundami i osobne przerwy zachowują dotychczasowe wyniki oraz sposób liczenia czasu.
- Migracja v1/v2 liczy pracę i sparing wyłącznie z etapów ćwiczeń o wyniku `completed`. Zachowane `stepResults`, również historyczne `partial`, nie są zmieniane; ich rzeczywisty zapisany czas nadal wchodzi do czasu treningu.

## Zmiana z 8 listopada 2026

Rodzaj treningu pomija rozgrzewkę (`warmup`) i rozluźnienie (`cooldown`). Plan z workiem, rozgrzewką i rozluźnieniem ma rodzaj `bag`. Plan złożony tylko z rozgrzewki, tylko z rozluźnienia albo z obu tych bloków ma rodzaj `mixed`. `cooldown` nie jest wartością `category`.

## Poza tym ADR

Zakres danych zbieranych po treningu (RPE, oceny ćwiczeń, inne miary) i sposób oceny postępów zostaną ustalone po researchu literatury i funkcji (listopad 2026).
