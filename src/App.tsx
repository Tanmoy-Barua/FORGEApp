import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './store/StoreContext'
import { AppShell } from './components/layout/AppShell'
import { Home } from './screens/Home'
import { Train } from './screens/Train'
import { Fuel } from './screens/Fuel'
import { Body } from './screens/Body'
import { Profile } from './screens/Profile'

function BootGate({ children }: { children: React.ReactNode }) {
  const { ready } = useStore()
  if (!ready) {
    return (
      <div className="boot">
        <div className="brand">FORGE</div>
      </div>
    )
  }
  return children
}

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter basename={routerBasename}>
        <BootGate>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="train" element={<Train />} />
              <Route path="fuel" element={<Fuel />} />
              <Route path="body" element={<Body />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BootGate>
      </BrowserRouter>
    </StoreProvider>
  )
}
