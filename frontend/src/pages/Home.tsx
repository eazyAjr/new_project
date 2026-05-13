import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function Home() {
  const navigate = useNavigate()
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>欢迎，{username}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          退出登录
        </button>
      </div>
      <div style={styles.content}>
        <h1 style={styles.title}>首页</h1>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  logoutBtn: {
    padding: '6px 16px',
    fontSize: 14,
    borderRadius: 4,
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  content: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100vh - 60px)',
  },
  title: {
    fontSize: 48,
    color: '#333',
  },
}
