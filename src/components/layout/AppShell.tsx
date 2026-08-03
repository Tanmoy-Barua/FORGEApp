import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useStore } from '../../store/StoreContext'
import { BottomNav } from './BottomNav'
import { QuickAddSheet } from './QuickAddSheet'
import { SideNav } from './SideNav'

export function AppShell() {
  const [quickOpen, setQuickOpen] = useState(false)
  const location = useLocation()
  const isDesktop = useIsDesktop()
  // Only the OAuth callback is chrome-free
  const hideChrome = location.pathname.startsWith('/whoop/')
  const showSidebar = isDesktop && !hideChrome
  const { user, syncStatus } = useStore()

  const userDot =
    user && syncStatus !== 'disabled' && syncStatus !== 'signed_out'
      ? syncStatus === 'synced'
        ? 'synced'
        : syncStatus === 'error'
          ? 'error'
          : 'idle'
      : null

  return (
    <div
      className={`app-frame ${isDesktop ? 'is-desktop' : 'is-mobile'}${
        showSidebar ? ' has-sidebar' : ''
      }`}
    >
      {showSidebar && <SideNav onQuickAdd={() => setQuickOpen(true)} userDot={userDot} />}

      <div className="app-shell">
        {!hideChrome && !isDesktop && (
          <header className="app-header mobile-only">
            <div className="brand">
              fogerapp<span>.</span>
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
              <Link
                to="/profile"
                className={`icon-btn${location.pathname === '/profile' ? ' active' : ''}`}
                aria-label="Settings"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 19.5c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
                </svg>
              </Link>
            </div>
          </header>
        )}

        {!hideChrome && isDesktop && (
          <header className="app-header desktop-header">
            <div>
              <div className="desktop-header-kicker">Command center</div>
              <div className="desktop-header-title">
                {location.pathname === '/profile' ? 'Settings' : 'Performance desk'}
              </div>
            </div>
            {location.pathname !== '/profile' && (
              <Link to="/profile" className="btn btn-ghost btn-sm">
                Profile & sync
              </Link>
            )}
          </header>
        )}

        <main className="app-main">
          <Outlet />
        </main>

        {!hideChrome && !isDesktop && <BottomNav onQuickAdd={() => setQuickOpen(true)} />}
        <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
      </div>
    </div>
  )
}
