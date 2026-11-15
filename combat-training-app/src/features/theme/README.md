# theme

Motyw Systemowy / Jasny / Ciemny oraz zapis preferencji.

Bez poprawnego zapisanego wyboru motyw wynika z `prefers-color-scheme` i reaguje na zmiany systemu.
Wybór w Profilu zapisuje preferencję; Systemowy przywraca śledzenie systemu. Dotychczasowe wybory
jasnego i ciemnego motywu zachowują pierwszeństwo. Na ekranach logowania nadal jest skrót przełączania.
Jawny wybór ma pierwszeństwo przed systemem, również gdy zapis
do localStorage się nie powiedzie (wtedy tylko do zamknięcia strony).

Skrypt w `index.html` ustawia motyw i kolor paska przeglądarki przed pierwszym renderowaniem.
Testy porównują jego zachowanie i kolory z kodem Reacta oraz tokenami CSS. Kolory oznaczeń dyscyplin
mają kontrast co najmniej 4,5:1 na powierzchniach kart w obu motywach.
