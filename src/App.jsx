import { useState } from 'react'

const WORKATO_ENDPOINT = '/api/summarize'

export default function App() {
  const [channel, setChannel] = useState('')
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!channel) { setError('チャンネル名を入力してください'); return }
    setLoading(true)
    setError('')
    setSummary('')
    try {
      const res = await fetch(WORKATO_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, days })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'エラーが発生しました')
      setSummary(data.summary)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📊 Slack サマライザー</h1>
        <p style={styles.subtitle}>Snowflake内のSlackデータをAIで要約します</p>

        <div style={styles.form}>
          <label style={styles.label}>チャンネル名</label>
          <input
            style={styles.input}
            type="text"
            placeholder="例: sales-weekly"
            value={channel}
            onChange={e => setChannel(e.target.value)}
          />

          <label style={styles.label}>対象期間（日数）</label>
          <select
            style={styles.input}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            <option value={3}>直近3日</option>
            <option value={7}>直近7日</option>
            <option value={14}>直近14日</option>
            <option value={30}>直近30日</option>
          </select>

          <button
            style={loading ? {...styles.button, opacity: 0.6} : styles.button}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '⏳ サマライズ中...' : '🚀 サマライズ実行'}
          </button>
        </div>

        {error && <div style={styles.error}>❌ {error}</div>}

        {summary && (
          <div style={styles.result}>
            <h2 style={styles.resultTitle}>📝 サマリー結果</h2>
            <pre style={styles.summaryText}>{summary}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '600px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
  },
  title: { fontSize: '28px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' },
  subtitle: { color: '#666', margin: '0 0 32px', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: { fontSize: '14px', fontWeight: 600, color: '#333' },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  button: {
    marginTop: '8px',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  error: {
    marginTop: '16px',
    padding: '12px 16px',
    background: '#fff5f5',
    border: '1px solid #fc8181',
    borderRadius: '8px',
    color: '#c53030',
    fontSize: '14px'
  },
  result: { marginTop: '24px' },
  resultTitle: { fontSize: '18px', fontWeight: 600, color: '#1a1a2e', marginBottom: '12px' },
  summaryText: {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '14px',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    color: '#2d3748'
  }
}
