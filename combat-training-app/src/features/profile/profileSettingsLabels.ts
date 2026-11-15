import { profileLabels } from './profileLabels'
import { wellbeingLabels } from '@/features/wellbeing/wellbeingLabels'

export const profileSettingsLabels = {
  settings: 'Ustawienia', training: 'Trening', health: 'Zdrowie i zgody', appearance: 'Wygląd', account: 'Konto',
  roundWarning: 'Sygnał przed końcem rundy', restWarning: 'Sygnał przed końcem przerwy', off: 'Wyłączony',
  trainingHint: 'Ustawienia tego urządzenia dotyczą planów i szybkiego stopera. Sygnał to trzy krótkie stuknięcia.',
  trainingLink: 'Ustawienia treningu w Profilu',
  theme: 'Motyw', system: 'Systemowy', light: 'Jasny', dark: 'Ciemny',
  enabled: 'Włączone', disabled: 'Wyłączone',
  weightPurpose: 'Pomiary pozwalają pokazać średnią masy ciała z 7 dni i średnie tygodniowe.',
  wellbeingPurpose: 'Wpisy pozwalają porównać samopoczucie z Twoją normą i zobaczyć kontekst RPE.',
  manageWeight: `Zgoda: ${profileLabels.weight.toLowerCase()}`,
  manageWellbeing: `Zgoda: ${wellbeingLabels.title.toLowerCase()}`,
  passwordProvider: 'Hasło', googleProvider: 'Google', googleSignIn: 'Logujesz się przez Google',
  currentPassword: 'Obecne hasło', newPassword: 'Nowe hasło', changePassword: 'Zmień hasło',
  currentRequired: 'Wpisz obecne hasło.', wrongPassword: 'Obecne hasło jest nieprawidłowe.',
  passwordChanged: 'Hasło zostało zmienione.', changingPassword: 'Zmiana hasła…',
  noWeightConsent: 'Zapis wyłączony', noWellbeingConsent: 'Zapis wyłączony',
  wellbeingToday: 'Dzisiejszy wpis zapisany', wellbeingMissing: 'Brak dzisiejszego wpisu',
  deleteHint: 'Trwałe usunięcie konta i jego danych wymaga osobnego potwierdzenia.',
} as const
