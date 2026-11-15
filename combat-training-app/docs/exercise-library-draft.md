# Projekt rozszerzonej biblioteki ćwiczeń

Status: **zatwierdzone bez zmian przez właściciela 15 listopada 2026**, issue [#161](https://github.com/AntoniKra/Martial-Arts-App/issues/161). CSV jest źródłem 86 wbudowanych pozycji aplikacji. Poniższe uwagi przeglądu opisują pochodzenie listy; kolumna `note` nie trafia do aplikacji.

## Dane aplikacji

Po zmianie CSV uruchom z `combat-training-app/`: `node scripts/generate-exercise-library.mjs`. Test jednostkowy uruchamia wariant `--check` i wykrywa rozbieżność danych w kodzie ze źródłem. Generator zachowuje `existingId`, a dla nowych pozycji używa `id`; nie zmienia zapisanych planów ani historii. „Kopiuj do moich” przejmuje zatwierdzony typ, przypisania i domyślne parametry. Dodawanie wbudowanej pozycji do planu nadal dziedziczy konfigurację według specyfikacji kreatora.

## Zakres i liczby

[exercise-library-draft.csv](exercise-library-draft.csv) zawiera **86 unikalnych pozycji: 38 obecnych i 48 nowych**. Zachowano wszystkie obecne `id`; `existingId` wskazuje odpowiadający rekord z `src/features/workout-builder/data/exerciseLibraryFixtures.ts`. Wspólne ćwiczenie ma jeden wiersz i kilka wartości w `disciplines`.

Liczba pozycji dostępnych po wybraniu dyscypliny, przed filtrowaniem według bloku:

- Boks (`boxing`): **56**.
- Kickboxing (`kickboxing`): **55**.
- Muay Thai (`muay_thai`): **60**.
- K-1 (`k1`): **59**.
- MMA stójka (`mma_striking`): **54**.

To rozwinięcie orientacyjnego celu około 50 pozycji na dyscyplinę. Liczby w poszczególnych kategoriach z issue są wskazówką, nie kwotami do wypełnienia: zachowano pełne 38 dotychczasowych pozycji oraz dodano przykłady każdej grupy. Dlatego część wspólna obejmuje również dotychczasową kondycję i sprzęt siłowy. MMA korzysta wyłącznie ze współdzielonych pozycji boksu, kickboxingu i części ogólnej, bez osobnego katalogu.

## Podstawa kategorii

Układ pochodzi ze streszczenia researchu G §5 w issue #155 i zapisanej tam decyzji właściciela z 14 listopada 2026: rozszerzona baza, nazwy lewy/prawy dla postawy orthodox. Pełnego researchu G nie ma w repozytorium; poniższe materiały sprawdzono jako podstawę podziału, bez deklarowania odtworzenia całego researchu.

- **PZB**, [Program zadania Akademii Boksu Olimpijskiego](https://pzb.com.pl/dzieci-i-mlodziez/abo/program-zadania): przygotowanie ogólne, pozycja, poruszanie się i podstawowe ciosy.
- **AIBA**, [Coaches Manual, udostępniony przez IBA](https://www.iba.sport/wp-content/uploads/2018/07/AIBA-Coach-Regulations-Manual_WEB.pdf), rozdz. 2.5 i 2.6: podstawowe techniki, kombinacje, obrona i metody treningu. Stąd podział na długość kombinacji, obronę z kontrą oraz pracę na sprzęcie i walkę z cieniem.
- **PZKB**, [K-1 Style](https://pzkickboxing.pl/dok/311,regulamin,k,style.html), oraz **WAKO**, [Rules Overview](https://www.wako.sport/rules-overview): rozróżnienie technik ręcznych, kopnięć i kolan K-1. WAKO publikuje także zmiany zasad K-1 na 2026; katalog nie zastępuje regulaminu zawodów.
- **IFMA**, [Rules & Regulations v3.057](https://muaythai.sport/wp-content/uploads/2026/05/IFMA-Rules-and-Regulations-v3.057_110526.pdf), §49.8.1: postawa i ruch, pięści, łokcie, kolana, kopnięcia pchające i pozostałe kopnięcia oraz obrona. Rozdzielono więc teep, kopnięcie okrężne, kolana i łokcie; klincz ma osobne zadanie.

Kategorie i konkretne zestawienia są propozycją redakcyjną do oceny zawodnika. Organizacje nie zatwierdziły tej listy ani proponowanych czasów pracy.

## Jak czytać i poprawiać CSV

Plik ma **UTF-8 z BOM**, separator `;` i jeden wiersz na ćwiczenie. W Excelu można go otworzyć bezpośrednio; przy imporcie należy wybrać UTF-8 i średnik. Zapis po poprawkach powinien zachować ten format.

- `id`: istniejące identyfikatory z łącznikami zostają bez zmian; nowe są neutralnymi kluczami angielskimi z podkreśleniami. Nie zmieniać identyfikatora przy korekcie nazwy.
- `namePl`: proponowana nazwa polska. Orthodox oznacza lewą rękę i nogę z przodu, prawą z tyłu; `jab` zapisano jako „lewy prosty”, `cross` jako „prawy prosty”. „Sierp” oznacza cios sierpowy, „podbródkowy” — cios z dołu. Nie wprowadzamy przełączania postawy.
- `type`: klasyfikacja redakcyjna: `combination` — konkretna sekwencja technik, `drill` — zadanie, `continuous` — ćwiczenie ciągłe. Nie jest to pole `WorkoutItem.type` ani zmiana modelu aplikacji.
- `blockTypes`: dozwolone rodzaje bloków z obecnego modelu: `warmup`, `technique`, `pads`, `bag`, `sparring`, `conditioning`, `strengthAndConditioning`, `cooldown`. Wiele wartości rozdziela `|`. Gruszka należy do `bag`, klincz do `technique`; nie dodajemy nowych rodzajów bloków.
- `disciplines`: klucze dyscyplin rozdzielone `|`. W przeglądzie należy sprawdzić obecność danej wartości na liście. Sumowanie liczebności dyscyplin wielokrotnie liczy wspólne wiersze. Aby uzyskać listę dla konkretnego bloku, trzeba dodatkowo uwzględnić `blockTypes`.
- `category`: jedna kategoria przeglądu, niezależna od rodzaju bloku. Kombinacje ręczne są wspólne, a pozycje szczegółowe mają węższe przypisanie dyscyplin. „Kickboxing” obejmuje tutaj również wariant low kick, do potwierdzenia przez właściciela. Nowe kolana K-1 są tylko w `k1`; zachowano obecne przypisanie `combo-jab-cross-knee` również do Muay Thai i MMA. Nowe łokcie i klincz są tylko w Muay Thai.
- `defaultMode`, `defaultRounds`, `defaultWorkSec`, `defaultRestSec`: **propozycje do przeglądu**, a nie obecne ustawienia rekordów biblioteki. Rundy: 3 × 180 s, odpoczynek 60 s między rundami. Ciągłe: `defaultRounds` i `defaultRestSec` puste, `defaultWorkSec` oznacza cały czas pracy (zwykle 300 s). Cała kategoria „Siła na czas”, w tym pompki, przysiady, deska, brzuch i burpees, ma roboczo 60 s. Nie dodajemy trybu `strength`, serii ani powtórzeń. Konfiguracja kreatora i jej dziedziczenie pozostają opisane w [specyfikacji kreatora](workout-builder-spec.md).
- `existingId`: wypełnione wyłącznie dla 38 obecnych rekordów; puste dla nowych. Burpees proponuje się także do bloku siły i motoryki, z zachowaniem dotychczasowego bloku kondycji.
- `note`: miejsca do doprecyzowania, w tym ręka w „prosty w korpus”, noga kopnięcia frontalnego i znaczenie dawnego „Check”. Brak notatki nie oznacza zatwierdzenia wiersza. Właściciel może tu dopisać poprawkę, pytanie albo decyzję o odrzuceniu pozycji.

Przed wdrożeniem właściciel ocenia nazwy, przypisania, kompletność kategorii i parametry. Historyczne snapshoty ćwiczeń pozostają poza zakresem tego szkicu.
