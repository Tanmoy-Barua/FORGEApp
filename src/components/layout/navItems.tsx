import type { ReactNode } from 'react'

export type NavItem = {
  to: string
  label: string
  end?: boolean
  icon: ReactNode
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

function IconTrain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 7h12v10H6z" />
      <path d="M9 17v3M15 17v3M8 7V5h8v2M4 11h16" />
    </svg>
  )
}

function IconRace() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10l6-3 4 2 6-3v14" />
      <path d="M4 20h16M10 7v13M14 9v11" />
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

function IconFuel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10h12v10H4z" />
      <path d="M8 10V6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v4" />
      <path d="M16 13h2.5a1.5 1.5 0 0 1 1.5 1.5V20" />
    </svg>
  )
}

export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', end: true, icon: <IconWhoop /> },
  { to: '/train', label: 'Train', icon: <IconTrain /> },
  { to: '/race', label: 'Race', icon: <IconRace /> },
  { to: '/fuel', label: 'Fuel', icon: <IconFuel /> },
  { to: '/body', label: 'Body', icon: <IconBody /> },
]
