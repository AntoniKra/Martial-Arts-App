# ADR 0019: Kierunek wizualny Karmazyn z żarem

Data: 17 listopada 2026. Status: przyjęta.

Decyzja właściciela z 16 listopada 2026 w #184 przyjmuje kierunek „Karmazyn z żarem”: czerwień prowadzi, pomarańczowy żar stanowi akcent. Zniesiono zakaz gradientów pochodzący z kierunku Figmy w `docs/design-system.md`, a nie z decyzji właściciela. Gradienty są dozwolone na przyciskach głównych, akcentach, wykresach i dekoracji głównej karty Startu (statyczna burza SVG), nadal bez glassmorphismu. Oba motywy korzystają z tokenów; jasny osłabia burzę do około 60% i stosuje ciemniejsze kolory tekstu. Statusy mają także symbole i opisy dostępności, tekst spełnia kontrast 4,5:1, w tym na całym gradiencie przycisku. Makiety w komentarzach #184 wiążą wizualnie (menu „+”: wariant 2, romb), a treść issue ma pierwszeństwo. Zmiana obejmuje wyłącznie prezentację, bez zmiany modelu danych, reguł, obliczeń i działań aplikacji.
