# Pierwsze prompty do Cursora

## Prompt 1 — weryfikacja fundamentu bez zmian

```text
Pracujemy w workspace zawierającym:
- _DO_NOT_EDIT_figma-reference — wyłącznie referencja read-only,
- combat-training-app — jedyne miejsce implementacji.

Przeczytaj wszystkie pliki w combat-training-app/.cursor/rules oraz:
- docs/START-HERE.md,
- docs/figma-audit.md,
- docs/architecture.md,
- docs/design-system.md.

Nie zmieniaj żadnych plików.

Zweryfikuj:
1. czy struktura czystego projektu jest spójna,
2. czy package.json, TypeScript, Vite i Tailwind są poprawnie skonfigurowane,
3. czy audyt odpowiada rzeczywistemu kodowi referencyjnemu,
4. jakie najmniejsze poprawki są potrzebne przed pierwszą migracją.

Podaj plan, listę plików i komendy weryfikacyjne. Nie implementuj Supabase.
```

## Prompt 2 — pierwsza migracja design systemu

```text
Przenieś zatwierdzony design system z _DO_NOT_EDIT_figma-reference do combat-training-app.

Zakres:
- tokeny kolorów,
- fonty Archivo i Inter,
- focus states,
- reduced motion,
- bazowe komponenty Button, SegmentedControl i RatingScale.

Ograniczenia:
- nie modyfikuj folderu referencyjnego,
- nie migruj ekranów,
- nie dodawaj backendu,
- zachowaj kanciasty, monochromatyczny design z oszczędną czerwienią,
- przygotuj tokeny również pod przyszły light mode,
- TypeScript bez any.

Najpierw pokaż plan i listę plików. Po implementacji uruchom typecheck i build.
```

## Prompt 3 — migracja pojedynczego ekranu

```text
Odtwórz ekran Home z _DO_NOT_EDIT_figma-reference w combat-training-app możliwie 1:1.

Użyj danych demonstracyjnych w osobnym module mock data.
Nie dodawaj Supabase ani nowej logiki biznesowej.
Nie zmieniaj designu bez osobnej propozycji.
Przetłumacz tekst widoczny użytkownikowi na język polski.

Wydziel komponenty tylko według odpowiedzialności, nie dla samego zmniejszenia liczby linii.
Najpierw pokaż plan i listę plików.
```
