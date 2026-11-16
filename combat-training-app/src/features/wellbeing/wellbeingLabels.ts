import type { WellbeingCategory, WellbeingField } from '@/domain/wellbeing/wellbeing'

export const wellbeingLabels = {
  title: 'Samopoczucie', prompt: 'Jak się dziś czujesz?', save: 'Zapisz', skip: 'Nie dziś',
  noSelection: 'Nie wybrano odpowiedzi',
  note: 'Coś nietypowego? (opcjonalnie)', noteHint: 'Do 300 znaków. Notatka nie jest analizowana.',
  invalid: 'Odpowiedz na wszystkie cztery pytania (1–5). Notatka może mieć do 300 znaków.',
  failed: 'Nie udało się zapisać samopoczucia. Ponów odczyt i spróbuj jeszcze raz.',
  enable: 'Włącz Samopoczucie', enabled: 'Samopoczucie włączone', edit: 'Popraw dzisiejszy wpis',
  intro: 'Cztery krótkie pytania raz dziennie pomogą Ci porównać samopoczucie z własną normą i zrozumieć kontekst RPE. Wymagają osobnej zgody na dane o zdrowiu.',
  consentTitle: 'Zgoda na Samopoczucie',
  adult: 'Mam ukończone 18 lat.',
  agree: 'Wyrażam wyraźną zgodę na przetwarzanie moich danych o samopoczuciu w opisanym celu.',
  notice: [
    'Co zapisujemy: dzienne oceny jakości snu, wypoczęcia, bolesności mięśni i stresu (1–5), datę, czas wpisu oraz opcjonalną krótką notatkę.',
    'Cel: pokazywanie Twoich odpowiedzi, porównanie każdej z nich z Twoją normą z poprzednich 28 dni i kontekstu samopoczucia obok RPE w dzienniku treningów. Notatek nie analizujemy.',
    'Są to dane o zdrowiu. Podstawą ich przetwarzania jest Twoja wyraźna zgoda: art. 9 ust. 2 lit. a RODO. Funkcja jest dostępna dla osób pełnoletnich.',
    'Dane przechowujemy na Twoim koncie w Firebase (Google Cloud), w regionie Warszawa (europe-central2). Dostęp masz tylko Ty. Pozostają do wycofania zgody lub usunięcia konta; możesz je wyeksportować.',
    'Zgoda jest dobrowolna, osobna od zgody na masę ciała. Treningi i RPE działają bez niej. Wycofasz ją w Profilu jednym przełącznikiem z potwierdzeniem. Usuniemy wtedy wszystkie wpisy samopoczucia; wymaga to internetu. Wycofanie nie wpływa na zgodność wcześniejszego przetwarzania z prawem.',
    'Aplikacja nie diagnozuje, nie przewiduje urazów i nie zaleca, czy trenować.',
  ],
  later: 'Nie teraz', withdrawTitle: 'Wyłączyć Samopoczucie?', withdrawConfirm: 'Usuń wpisy i wyłącz',
  withdrawDescription: 'Usuniemy wszystkie wpisy samopoczucia i wycofamy tę zgodę. Tego nie da się cofnąć. Zgoda na masę ciała pozostanie bez zmian.',
  withdrawalFailed: 'Nie udało się zakończyć usuwania. Zgoda pozostaje aktywna. Połącz się z internetem i ponów wyłączenie.',
  withdrawalPending: 'Trwa wycofywanie zgody. Zapisy są zablokowane. Jeśli usuwanie przerwano, połącz się z internetem i ponów wyłączenie w Profilu.',
  onlineRequired: 'Wyłączenie wymaga internetu, żeby usunąć wszystkie wpisy.',
  disclaimer: 'To nie jest ocena medyczna. Jeśli coś Cię niepokoi albo dolegliwości się utrzymują, skonsultuj się z lekarzem.',
  empty: 'Nie masz jeszcze wpisów samopoczucia. Pierwszy możesz dodać na Starcie.',
  missing: (n: number) => `Jeszcze ${n} wpisów do Twojej normy`,
  span: 'Norma wymaga co najmniej 14 wpisów rozłożonych na 21 dni w poprzednich 28 dniach.',
  showData: 'Pokaż dane', date: 'Data', answer: 'Odpowiedź', band: 'Pasmo P25–P75', noData: 'Brak wpisu', noNorm: 'Brak normy',
  chartHint: 'Ostatnie 28 dni. Punkty oznaczają odpowiedzi 1–5, szare pasmo P25–P75 z dni poprzedzających każdy wpis. Pominięte dni pozostają puste.',
  loading: 'Wczytywanie samopoczucia…', unavailable: 'Dane samopoczucia są niepełne lub niedostępne. Połącz się z internetem i ponów odczyt.', retry: 'Ponów odczyt',
} as const

export const wellbeingQuestions: Record<WellbeingField, { name: string; question: string; options: readonly string[] }> = {
  sleep: { name: 'Sen', question: 'Jak oceniasz jakość snu ostatniej nocy?', options: ['bardzo zła', 'zła', 'przeciętna', 'dobra', 'bardzo dobra'] },
  energy: { name: 'Wypoczęcie', question: 'Jak wypoczęty czujesz się teraz?', options: ['skrajnie zmęczony', 'zmęczony', 'normalnie', 'wypoczęty', 'w pełni wypoczęty'] },
  soreness: { name: 'Mięśnie', question: 'Jak odczuwasz teraz mięśnie (bolesność, sztywność)?', options: ['silny ból', 'wyraźna bolesność', 'lekka bolesność', 'prawie nic', 'brak bolesności'] },
  stress: { name: 'Stres', question: 'Jaki jest dziś Twój ogólny poziom stresu (trening, praca, życie)?', options: ['bardzo wysoki', 'wysoki', 'umiarkowany', 'niski', 'bardzo niski'] },
}
export const wellbeingCategoryLabels: Record<WellbeingCategory, string> = { worse: 'gorzej niż zwykle', typical: 'typowo dla Ciebie', better: 'lepiej niż zwykle' }
