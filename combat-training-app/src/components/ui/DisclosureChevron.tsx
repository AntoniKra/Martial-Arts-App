/** Down chevron of an expandable control; the nearest ancestor with `aria-expanded="true"` turns it up. */
export function DisclosureChevron() {
  return (
    <svg aria-hidden="true" className="disclosure-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
