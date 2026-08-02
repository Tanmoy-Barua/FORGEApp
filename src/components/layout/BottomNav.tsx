import { NavLink } from 'react-router-dom'

interface BottomNavProps {
  onQuickAdd: () => void
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  )
}

function IconTrain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 7h12v10H6z" />
      <path d="M9 17v3M15 17v3M8 7V5h8v2M4 11h16" />
    </svg>
  )
}

function IconWhoop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
    </svg>
  )
}

function IconBody() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="5" r="2.5" />
      <path d="M8 10h8l-1.5 5H9.5L8 10zM9.5 15l-1.5 6M14.5 15l1.5 6M7 11.5 4.5 9M17 11.5 19.5 9" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function BottomNav({ onQuickAdd }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IconHome />
        Home
      </NavLink>
      <NavLink to="/train" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IconTrain />
        Train
      </NavLink>
      <button type="button" className="fab-log" onClick={onQuickAdd} aria-label="Quick log">
        <IconPlus />
      </button>
      <NavLink to="/whoop" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IconWhoop />
        Whoop
      </NavLink>
      <NavLink to="/body" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IconBody />
        Body
      </NavLink>
    </nav>
  )
}
