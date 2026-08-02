import { NavLink } from 'react-router-dom'
import { PRIMARY_NAV } from './navItems'

interface SideNavProps {
  onQuickAdd: () => void
  userDot?: 'synced' | 'error' | 'idle' | null
}

export function SideNav({ onQuickAdd, userDot }: SideNavProps) {
  return (
    <aside className="side-nav" aria-label="Primary">
      <div className="side-nav-brand">
        FORGE<span>.</span>
        {userDot && (
          <span
            className={`side-nav-dot side-nav-dot-${userDot === 'idle' ? 'pending' : userDot}`}
            title={`Cloud ${userDot}`}
          />
        )}
      </div>
      <p className="side-nav-tag">Train for the race. Track for life.</p>

      <nav className="side-nav-links">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="side-nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="side-nav-footer">
        <button type="button" className="btn btn-primary btn-block" onClick={onQuickAdd}>
          Quick log
        </button>
        <NavLink to="/profile" className="side-nav-link side-nav-settings">
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
