import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../utils/api'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', { username, password })
      alert('注册成功，请登录')
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>注册</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="确认密码"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p style={styles.linkText}>
          已有账号？<Link to="/login" style={styles.link}>去登录</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  card: {
    width: 360,
    padding: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  input: {
    padding: '12px 16px',
    fontSize: 14,
    borderRadius: 4,
    border: '1px solid #ddd',
    outline: 'none',
  },
  button: {
    padding: '12px 16px',
    fontSize: 14,
    borderRadius: 4,
    border: 'none',
    backgroundColor: '#1677ff',
    color: '#fff',
    cursor: 'pointer',
  },
  error: {
    color: '#ff4d4f',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  linkText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 16,
    color: '#666',
  },
  link: {
    color: '#1677ff',
    textDecoration: 'none',
  },
}
