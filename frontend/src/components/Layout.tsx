import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../utils/api'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const username = localStorage.getItem('username') || ''

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

  const menuItems = [
    { path: '/', label: '首页' },
    { path: '/bank-locator', label: '银行定位器' },
    { path: '/route-planner', label: '线路规划' },
  ]

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>管理系统</div>
        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
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
          <span style={styles.welcome}>欢迎，{username}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            退出登录
          </button>
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
    justifyContent: 'flex-end',
    padding: '0 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    flexShrink: 0,
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
