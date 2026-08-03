import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './store/StoreContext'
import { AppShell } from './components/layout/AppShell'
import { Home } from './screens/Home'
import { Train } from './screens/Train'
import { Fuel } from './screens/Fuel'
import { Body } from './screens/Body'
import { Whoop } from './screens/Whoop'
import { Profile } from './screens/Profile'
import { WhoopCallback } from './screens/WhoopCallback'

function BootGate({ children }: { children: React.ReactNode }) {
  const { ready } = useStore()
  if (!ready) {
    return (
      <div className="boot">
        <div className="brand">fogerapp</div>
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
              <Route index element={<Whoop />} />
              <Route path="train" element={<Train />} />
              <Route path="fuel" element={<Fuel />} />
              <Route path="race" element={<Home />} />
              <Route path="whoop" element={<Navigate to="/" replace />} />
              <Route path="body" element={<Body />} />
              <Route path="profile" element={<Profile />} />
              <Route path="whoop/callback" element={<WhoopCallback />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BootGate>
      </BrowserRouter>
    </StoreProvider>
  )
}
