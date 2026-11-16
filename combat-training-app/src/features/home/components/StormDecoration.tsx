import { useId } from 'react'

export function StormDecoration() {
  const gradient = useId()
  return <svg aria-hidden="true" focusable="false" className="storm-decoration" viewBox="0 0 358 340" fill="var(--app-ember)">
    <defs><linearGradient id={gradient} x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="var(--app-ember)" stopOpacity=".95" />
      <stop offset=".35" stopColor="var(--app-storm-mid)" stopOpacity=".75" />
      <stop offset=".8" stopColor="var(--app-storm-end)" stopOpacity="0" />
    </linearGradient></defs>
    <path fill={`url(#${gradient})`} d="M276 0 L228 104 L258 104 L200 214 L226 214 L184 318 L290 168 L258 168 L312 74 L282 74 L340 0 Z" />
    <path opacity=".55" d="M300 0 L262 82 L284 82 L250 150 L318 46 L296 46 L322 0 Z" />
    <g fill="none" stroke="var(--app-ember)">
      <polyline points="258,168 296,196 312,236 340,258" strokeWidth="2" opacity=".7" />
      <polyline points="296,196 286,226" strokeWidth="1.5" opacity=".55" />
      <polyline points="312,74 336,98 350,134" strokeWidth="1.5" opacity=".6" />
      <polyline points="228,104 214,82 196,76" strokeWidth="1.5" opacity=".45" />
    </g>
    <path opacity=".9" d="M352 120 L336 150 L346 150 L326 196 L358 140 L348 140 L358 120 Z" />
    <rect x="240" y="132" width="6" height="6" opacity=".9" transform="rotate(45 243 135)" />
    <rect x="300" y="128" width="4" height="4" opacity=".7" transform="rotate(45 302 130)" />
    <rect x="330" y="56" width="5" height="5" opacity=".8" transform="rotate(45 332.5 58.5)" />
    <rect x="214" y="248" width="5" height="5" opacity=".6" transform="rotate(45 216.5 250.5)" />
    <rect x="268" y="22" width="4" height="4" opacity=".7" transform="rotate(45 270 24)" />
  </svg>
}
