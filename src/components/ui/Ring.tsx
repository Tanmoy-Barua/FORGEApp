interface RingProps {
  value: number
  max: number
  label: string
  color?: string
  display?: string
}

function statusColor(ratio: number, fallback: string): string {
  if (ratio >= 1) return 'var(--green)'
  if (ratio >= 0.7) return fallback
  if (ratio >= 0.4) return 'var(--amber)'
  return 'var(--red)'
}

export function Ring({ value, max, label, color = 'var(--accent)', display }: RingProps) {
  const size = 64
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = max > 0 ? Math.min(value / max, 1) : 0
  const offset = c * (1 - ratio)
  const strokeColor = statusColor(ratio, color)
  const pct = Math.round(ratio * 100)

  return (
    <div className="ring-item">
      <div className="ring" aria-label={`${label}: ${pct}%`}>
        <svg viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--ring-track)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="ring-value">{display ?? `${pct}%`}</div>
      </div>
      <span>{label}</span>
    </div>
  )
}
