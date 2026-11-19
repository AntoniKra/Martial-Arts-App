import { HomeActionIcon } from './HomeActionIcon'

export function HomeQuickLinkContent({ icon, title, subtitle }: {
  icon: 'book' | 'clock' | 'heart'
  title: string
  subtitle: string
}) {
  return <>
    <span className="icon-box-5a"><HomeActionIcon kind={icon} strokeWidth={2} /></span>
    <span className="quick-link-content-5a">
      <span className="quick-link-title-5a">{title}</span>
      <span className="quick-link-sub-5a">{subtitle}</span>
    </span>
    <HomeActionIcon kind="right" className="quick-link-chevron" />
  </>
}
