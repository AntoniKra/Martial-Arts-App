# Model domenowy

## Trening

Trening przechodzi przez statusy:

- `draft` — lokalny lub rozpoczęty szkic;
- `planned` — zapisany plan;
- `in_progress` — rozpoczęty trening;
- `completed` — zakończona jednostka.

W MVP plan po rozpoczęciu staje się aktywnym treningiem, a po zakończeniu trafia do Historii. Reużywalne szablony są funkcją przyszłą.

## Dyscyplina

Dostępne wartości:

- `boxing`;
- `kickboxing`;
- `muay_thai`;
- `k1`;
- `mma_striking`.

Dyscyplinę można zmienić do momentu dodania pierwszego ćwiczenia. Później jest zablokowana.

## Bloki

- Rozgrzewka;
- Technika;
- Tarcze;
- Worek;
- Sparing;
- Kondycja;
- Siła i motoryka.

Blok grupuje elementy w logiczną sekcję. Elementy zachowują kolejność.

## Element bloku

Element jest jednym z dwóch typów MVP:

- `exercise`;
- `break`.

Przerwa między ćwiczeniami jest osobnym elementem, a nie odpoczynkiem zapisanym przy poprzednim ćwiczeniu.

## Tryby ćwiczenia

### Rundowy

- liczba rund;
- długość rundy;
- odpoczynek między rundami;
- jedna kombinacja lub instrukcja;
- opcjonalna notatka wykonawcza.

### Ciągły

- czas trwania;
- nazwa;
- opcjonalna instrukcja.

### Siłowy — przygotowany, ale nieobowiązkowy w MVP

Docelowo:

- serie;
- planowany ciężar i powtórzenia;
- rzeczywisty ciężar i powtórzenia dla każdej serii;
- odpoczynek między seriami.

## Kombinacja

Ćwiczenie może wskazywać rekord biblioteki przez `combinationId`, ale zawsze zachowuje `exerciseNameSnapshot`. Snapshot chroni historię po zmianie lub usunięciu nazwy w bibliotece.

Jedno ćwiczenie zawiera jedną kombinację lub jedną instrukcję.

## Pominięcia i wykonanie

- pominięte ćwiczenie nie otrzymuje oceny 0;
- nie wchodzi do średniej;
- pozostaje oznaczone jako pominięte;
- częściowo wykonane ćwiczenie przechowuje rzeczywistą liczbę ukończonych rund;
- jakość i ilość wykonania są prezentowane oddzielnie.
