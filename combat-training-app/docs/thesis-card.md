# Karta tematu pracy dyplomowej

## 1. Ostateczna treść pracy dyplomowej

Projekt i implementacja progresywnej aplikacji internetowej wspomagającej ewidencję i analizę treningów sportów walki w oparciu o architekturę chmurową.

## 2. Spis treści

1. Wstęp
   - 1.1. Cel i zakres pracy
   - 1.2. Problem badawczy i pytania badawcze
   - 1.3. Struktura pracy
2. Wstęp teoretyczny i przegląd rozwiązań
   - 2.1. Definicje i pojęcia kluczowe
   - 2.2. Charakterystyka technologii PWA (Progressive Web App) i architektury chmurowej (BaaS)
   - 2.3. Specyfika ewidencji danych w metodyce treningu sportów walki
   - 2.4. Przegląd i ocena dostępnych na rynku rozwiązań informatycznych
   - 2.5. Podsumowanie rozdziału
3. Analiza wymagań i projekt systemu
   - 3.1. Wymagania funkcjonalne i niefunkcjonalne
   - 3.2. Wybór stosu technologicznego
   - 3.3. Projekt architektury chmurowej i model bazy danych
   - 3.4. Projekt graficznego interfejsu użytkownika (UI/UX)
   - 3.5. Podsumowanie rozdziału
4. Implementacja aplikacji
   - 4.1. Realizacja struktury bazy danych i mechanizmów autoryzacji
   - 4.2. Implementacja interfejsu użytkownika i responsywności (RWD)
   - 4.3. Realizacja kluczowych modułów logiki biznesowej
   - 4.4. Podsumowanie rozdziału
5. Testowanie, analiza i dyskusja wyników
   - 5.1. Założenia i scenariusze testowe
   - 5.2. Testy wydajnościowe i funkcjonalne
   - 5.3. Analiza użyteczności interfejsu
   - 5.4. Dyskusja wyników w kontekście postawionych pytań badawczych
   - 5.5. Podsumowanie rozdziału
6. Podsumowanie
   - 6.1. Wnioski końcowe
   - 6.2. Ograniczenia zrealizowanego systemu
   - 6.3. Kierunki dalszego rozwoju aplikacji

## 3. Cel i zakres pracy

**Cel pracy:** Głównym celem pracy jest zaprojektowanie oraz implementacja responsywnej aplikacji webowej (PWA) działającej w modelu chmurowym, przeznaczonej do ewidencjonowania i analizy postępów treningowych w sportach walki.

**Zakres pracy:** Zakres projektu obejmuje opracowanie architektury chmurowej, zamodelowanie struktury danych, implementację interfejsu użytkownika z wykorzystaniem technologii frontendowych oraz przeprowadzenie testów weryfikujących poprawność działania i użyteczność systemu na urządzeniach o różnej rozdzielczości ekranu.

## 4. Stack technologiczny

- Frontend: React.js, TypeScript, Tailwind CSS (wykorzystane do budowy aplikacji typu PWA).
- Backend i usługi chmurowe: Firebase / Supabase (architektura BaaS zapewniająca system uwierzytelniania, bazę danych działającą w czasie rzeczywistym oraz usługi hostingowe).

## 5. Przegląd dostępnych rozwiązań

Wstępna analiza rynku oprogramowania sportowego wykazuje wyraźną polaryzację. Najpopularniejsze systemy (m.in. Strava, Garmin Connect) są silnie zoptymalizowane pod kątem sportów wytrzymałościowych. Z kolei oprogramowanie przeznaczone do sportów siłowych rzadko uwzględnia taksonomię specyficzną dla sportów walki. Dodatkowo zauważalny jest brak lekkich rozwiązań niewymagających instalacji poprzez dedykowane sklepy (App Store, Google Play), co uzasadnia budowę systemu w technologii PWA, łączącej uniwersalność stron internetowych z wydajnością aplikacji natywnych.

## 6. Lista funkcjonalności

**Planowane do dostarczenia w czerwcu (wersja MVP):**

- Moduł dziennika treningowego umożliwiający podstawowe operacje na danych (dodawanie, usuwanie, przeglądanie logów zawierających datę, kategorię, czas trwania oraz notatkę).
- Responsywny interfejs użytkownika (RWD) dostosowujący się do liczby pikseli na ekranach urządzeń mobilnych i stacjonarnych.
- Funkcjonalność zmiany kontrastu aplikacji (Dark Mode / Light Mode) w celu zwiększenia czytelności w różnych warunkach oświetleniowych.

**Planowane dla całej pracy (do obrony):**

- System uwierzytelniania (logowanie i rejestracja użytkowników) oparty na infrastrukturze chmurowej.
- Moduł celów treningowych zawierający wskaźnik postępu (Progress Bar), wyliczany na podstawie liczby zrealizowanych jednostek względem zadeklarowanego planu.
- Wbudowany stoper zadaniowy (interwałowy) z możliwością konfiguracji czasu pracy i odpoczynku.
- Cyfrowy profil zawodnika agregujący podstawowe parametry biometryczne (waga) oraz ogólne statystyki wyciągane z bazy danych.
