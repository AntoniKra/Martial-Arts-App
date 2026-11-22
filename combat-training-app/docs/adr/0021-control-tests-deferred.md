# ADR 0021 — Testy kontrolne jako kierunek rozwoju

Data: 22 listopada 2026. Status: przyjęta.

Decyzją właściciela w [#225](https://github.com/AntoniKra/Martial-Arts-App/issues/225) testy kontrolne (R4) przechodzą z rdzenia MVP do kierunków rozwoju po audycie przed zamrożeniem funkcji. Zakres przyszły obejmuje test własny, burpees 3 min i KAST oraz paszport warunków. Nazwy `controlTests` i `controlTestResults` są zarezerwowane w modelu Firestore. Bieżąca aplikacja nie odczytuje ani nie zapisuje tych kolekcji. Zobacz [zakres wersji finalnej](../mvp-scope.md), [specyfikację ocen](../feedback-system.md) i [model danych](../database-model.md).
