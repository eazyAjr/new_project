export default function Home() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>首页</h1>
      <p style={styles.desc}>欢迎使用管理系统</p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  title: {
    fontSize: 48,
    color: '#333',
    margin: 0,
  },
  desc: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
}
