# START HERE

## Cel tego pakietu

Pakiet oddziela zaakceptowany prototyp wizualny od właściwego kodu pracy dyplomowej:

- `../_DO_NOT_EDIT_figma-reference` — tylko do odczytu;
- `combat-training-app` — jedyne miejsce implementacji;
- `docs` — źródło prawdy o produkcie;
- `.cursor/rules` — krótkie instrukcje operacyjne dla Agenta.

## Kolejność pracy

1. Zweryfikuj audyt prototypu w `figma-audit.md`.
2. Uruchom czysty projekt i sprawdź `typecheck` oraz `build`.
3. Przenieś design system i podstawowe komponenty UI.
4. Migrację wykonuj ekran po ekranie z danymi demonstracyjnymi.
5. Dopiero po zatwierdzeniu wyglądu dodawaj Supabase i logikę domenową.
6. Timer, gong, Wake Lock i zapis wykonania implementuj od nowa.

## Dokumenty obowiązkowe przed zmianą danego obszaru

- zakres: `mvp-scope.md`;
- model treningu: `domain-model.md`;
- kreator: `workout-builder-spec.md`;
- odtwarzacz: `workout-player-spec.md`;
- oceny: `feedback-system.md`;
- design: `design-system.md`;
- baza: `database-model.md`;
- architektura: `architecture.md`.

## Decyzje nieblokujące, pozostawione na później

- nazwa i logotyp aplikacji;
- pełny light mode po ustabilizowaniu dark mode;
- trening siłowy z seriami, ciężarem i powtórzeniami;
- kreator kombinacji z pojedynczych technik;
- cele, profil, waga i wykresy;
- zaawansowane porównywanie postępów.
