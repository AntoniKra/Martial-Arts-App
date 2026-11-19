import { homeCardDate, homeCardDateShort } from '../homeLabels'

/** Full date for screen readers and wider screens; CSS swaps in the short form below 390 px. */
export function HomeCardDate({ date }: { date: string }) {
  return <p className="home-card-date">
    <span className="home-card-date-full">{homeCardDate(date)}</span>
    <span className="home-card-date-short" aria-hidden="true">{homeCardDateShort(date)}</span>
  </p>
}
