# ADR 0010: Automatyczny hosting bez sekretu przy budowaniu PR

Status: zaakceptowane, 10 listopada 2026 (issue #78). Podgląd pull requesta dzielimy na budowanie bez sekretów i wgranie gotowego `dist` z `workflow_run` na domyślnej gałęzi, bo kod PR w jednym jobie z kluczem konta serwisowego mógłby odczytać sekret administratora Firebase Authentication. Kanał `live` wdrażamy dopiero po udanym workflow CI na `main`; reguł Firestore automat nie wdraża, a gdy commit je zmienia, hosting jest pomijany, dopóki właściciel nie wgra reguł ręcznie i nie uruchomi workflow ponownie.
