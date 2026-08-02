import { NavLink } from 'react-router-dom'
import { PRIMARY_NAV } from './navItems'

interface BottomNavProps {
  onQuickAdd: () => void
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** Mobile-only primary nav (hidden on desktop via CSS). */
export function BottomNav({ onQuickAdd }: BottomNavProps) {
  // Mobile keeps Home / Train / + / Race / Body (Fuel lives in desktop sidebar + settings)
  const mobile = PRIMARY_NAV.filter((n) => n.to !== '/fuel')

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {mobile.slice(0, 2).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
      <button type="button" className="fab-log" onClick={onQuickAdd} aria-label="Quick log">
        <IconPlus />
      </button>
      {mobile.slice(2).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
