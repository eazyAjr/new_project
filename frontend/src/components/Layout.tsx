import { useEffect, useState, useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { KeepAliveContext } from '../App'
import api from '../utils/api'

interface LayoutProps {
  children: React.ReactNode
}

interface TabItem {
  path: string
  label: string
}

const TAB_MAP: Record<string, string> = {
  '/': '首页',
  '/bank-locator': '银行定位器',
  '/route-planner': '线路规划',
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { closePath } = useContext(KeepAliveContext)
  const username = localStorage.getItem('username') || ''

  const [tabs, setTabs] = useState<TabItem[]>([{ path: '/', label: '首页' }])
  const [activeTab, setActiveTab] = useState('/')

  // 路由变化时同步 tabs
  useEffect(() => {
    const pathname = location.pathname
    setActiveTab(pathname)
    setTabs((prev) => {
      if (prev.some((t) => t.path === pathname)) {
        // 确保首页始终排在第一位
        const sorted = [...prev]
        const homeIdx = sorted.findIndex((t) => t.path === '/')
        if (homeIdx > 0) {
          const [home] = sorted.splice(homeIdx, 1)
          sorted.unshift(home)
        }
        return sorted
      }
      const label = TAB_MAP[pathname] || '页面'
      return [...prev, { path: pathname, label }]
    })
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // 即使接口失败也清除本地状态
    }
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    navigate('/login', { replace: true })
    window.location.reload()
  }

  const menuItems: TabItem[] = [
    { path: '/', label: '首页' },
    { path: '/bank-locator', label: '银行定位器' },
    { path: '/route-planner', label: '线路规划' },
  ]

  const switchTab = (path: string) => {
    if (path !== location.pathname) {
      navigate(path)
    }
  }

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (path === '/') return
    const idx = tabs.findIndex((t) => t.path === path)
    const newTabs = tabs.filter((t) => t.path !== path)
    if (newTabs.length === 0) return
    setTabs(newTabs)
    closePath(path)
    if (activeTab === path) {
      const fallback = newTabs[Math.max(0, idx - 1)] || newTabs[0]
      navigate(fallback.path)
    }
  }

  const handleMenuClick = (item: TabItem) => {
    if (!tabs.some((t) => t.path === item.path)) {
      setTabs((prev) => [...prev, item])
    }
    navigate(item.path)
  }

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>管理系统</div>
        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={(e) => {
                e.preventDefault()
                handleMenuClick(item)
              }}
              style={{
                ...styles.menuItem,
                ...(location.pathname === item.path ? styles.menuItemActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.breadcrumb}>
            {tabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => switchTab(tab.path)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.path ? styles.tabActive : {}),
                }}
              >
                <span style={styles.tabLabel}>{tab.label}</span>
                {tab.path !== '/' && (
                  <span
                    style={styles.tabClose}
                    onClick={(e) => closeTab(tab.path, e)}
                  >
                    ×
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={styles.headerRight}>
            <span style={styles.welcome}>欢迎，{username}</span>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              退出登录
            </button>
          </div>
        </header>
        <main style={styles.content}>{children}</main>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
  },
  sidebar: {
    width: 200,
    backgroundColor: '#001529',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  logo: {
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 12,
  },
  menuItem: {
    display: 'block',
    padding: '14px 24px',
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'all 0.2s',
  },
  menuItemActive: {
    color: '#fff',
    backgroundColor: '#1890ff',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#f0f2f5',
  },
  header: {
    height: 64,
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 0 0 16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    flexShrink: 0,
    gap: 16,
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 4,
    flex: 1,
    overflow: 'hidden',
    height: '100%',
    paddingTop: 12,
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    fontSize: 13,
    color: '#666',
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    border: '1px solid #e8e8e8',
    borderBottom: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transition: 'all 0.2s',
    position: 'relative',
    top: 1,
  },
  tabActive: {
    backgroundColor: '#f0f2f5',
    color: '#1890ff',
    fontWeight: 600,
    borderColor: '#e8e8e8',
    borderBottom: '1px solid #f0f2f5',
    zIndex: 1,
  },
  tabLabel: {
    maxWidth: 120,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tabClose: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    borderRadius: '50%',
    fontSize: 14,
    lineHeight: 1,
    color: '#999',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginLeft: 2,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    paddingRight: 24,
  },
  welcome: {
    fontSize: 14,
    color: '#333',
    marginRight: 16,
  },
  logoutBtn: {
    padding: '6px 16px',
    fontSize: 13,
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    backgroundColor: '#fff',
    cursor: 'pointer',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 24,
    overflow: 'hidden',
    minWidth: 0,
  },
}
