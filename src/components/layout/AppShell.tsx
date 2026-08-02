import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import { BottomNav } from './BottomNav'
import { QuickAddSheet } from './QuickAddSheet'

export function AppShell() {
  const [quickOpen, setQuickOpen] = useState(false)
  const location = useLocation()
  const hideChrome = location.pathname === '/profile'
  const { user, syncStatus } = useStore()

  return (
    <div className="app-shell">
      {!hideChrome && (
        <header className="app-header">
          <div className="brand">
            FORGE<span>.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user && (
              <span
                title={syncStatus}
                aria-label={`Cloud ${syncStatus}`}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background:
                    syncStatus === 'synced'
                      ? 'var(--green)'
                      : syncStatus === 'error'
                        ? 'var(--red)'
                        : 'var(--accent)',
                  boxShadow: '0 0 0 3px rgba(215,255,0,0.08)',
                }}
              />
            )}
            <Link to="/profile" className="icon-btn" aria-label="Settings">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 19.5c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
              </svg>
            </Link>
          </div>
        </header>
      )}
      <Outlet />
      {!hideChrome && <BottomNav onQuickAdd={() => setQuickOpen(true)} />}
      <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  )
}
