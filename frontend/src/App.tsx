import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, createContext, useCallback } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import BankLocator from './pages/BankLocator'
import RoutePlanner from './pages/RoutePlanner'
import Layout from './components/Layout'

const VALID_PATHS = ['/', '/bank-locator', '/route-planner']

const PAGE_MAP: Record<string, React.ReactNode> = {
  '/': <Home />,
  '/bank-locator': <BankLocator />,
  '/route-planner': <RoutePlanner />,
}

interface KeepAliveContextType {
  visitedPaths: string[]
  closePath: (path: string) => void
}

export const KeepAliveContext = createContext<KeepAliveContextType>({
  visitedPaths: [],
  closePath: () => {},
})

function KeepAliveLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [visitedPaths, setVisitedPaths] = useState<string[]>([location.pathname])

  useEffect(() => {
    const path = location.pathname
    if (!VALID_PATHS.includes(path)) {
      navigate('/', { replace: true })
      return
    }
    setVisitedPaths((prev) => {
      if (prev.includes(path)) return prev
      return [...prev, path]
    })
  }, [location.pathname, navigate])

  const closePath = useCallback((path: string) => {
    if (path === '/') return
    setVisitedPaths((prev) => prev.filter((p) => p !== path))
  }, [])

  return (
    <KeepAliveContext.Provider value={{ visitedPaths, closePath }}>
      <Layout>
        <div style={{ width: '100%', height: '100%' }}>
          {visitedPaths.map((path) => (
            <div
              key={path}
              style={{
                display: location.pathname === path ? 'block' : 'none',
                width: '100%',
                height: '100%',
              }}
            >
              {PAGE_MAP[path]}
            </div>
          ))}
        </div>
      </Layout>
    </KeepAliveContext.Provider>
  )
}

function App() {
  const isLoggedIn = !!localStorage.getItem('token')

  if (!isLoggedIn) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <KeepAliveLayout />
    </BrowserRouter>
  )
}

export default App
