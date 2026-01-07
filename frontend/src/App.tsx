import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [showApi, setShowApi] = useState(false)

  // Use the Hugging Face URL
  const API_URL = 'https://ssureshkxmar-my-image-gen-backend.hf.space'

  // Poll backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/health`)
        const data = await res.json()
        if (data.status === 'ready') {
          setStatus('ready')
        } else {
          setStatus('loading')
          setTimeout(checkHealth, 3000)
        }
      } catch (e) {
        setStatus('loading')
        setTimeout(checkHealth, 3000)
      }
    }
    checkHealth()
  }, [])

  const generateImage = async () => {
    if (!prompt) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          steps: 4
        }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      setImage(data.image)
      // Add to history
      setHistory(prev => [data.image, ...prev].slice(0, 5))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Server error')
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = () => {
    if (!image) return
    const link = document.createElement('a')
    link.href = image
    link.download = `es-ai-gen-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="app-container">
      {/* Sidebar Controls */}
      <aside className="sidebar">
        <div className="logo-area">
          <h1 style={{ letterSpacing: '-0.05em' }}>ES Ai</h1>
          <div className="status-badge">
            <span className={`status-dot ${status}`}></span>
            {status === 'ready' ? 'Neural Core Online' : 'Connecting...'}
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">Prompt</label>
          <textarea
            className="cyber-input"
            placeholder="Describe your vision for ES Innovation..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                generateImage()
              }
            }}
          />
        </div>

        <button
          className="neon-btn"
          onClick={generateImage}
          disabled={loading || !prompt || status !== 'ready'}
        >
          {loading ? 'Synthesizing...' : 'Generate Visual'}
        </button>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.9rem', background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px' }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <button
            onClick={() => setShowApi(true)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              padding: '0.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            &lt;/&gt; Developer API
          </button>

          <div style={{ opacity: 0.5, fontSize: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <p style={{ fontWeight: 600 }}>© 2025 ES Innovation</p>
            <p>All rights reserved.</p>
          </div>
        </div>
      </aside>

      {/* Main Stage */}
      <main className="main-stage">

        <div className={`image-frame ${image ? 'has-image' : ''}`}>
          {loading && (
            <div style={{ position: 'absolute', zIndex: 10 }}>
              <span className="loader"></span>
            </div>
          )}

          {image ? (
            <>
              <img src={image} alt="Generated" className="generated-img" style={{ opacity: loading ? 0.5 : 1 }} />
              <button className="download-btn" onClick={downloadImage}>
                ⬇ Download
              </button>
            </>
          ) : (
            <div className="placeholder-text">
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>ES Ai Engine</h2>
              <p>Enter a prompt to begin generation</p>
            </div>
          )}
        </div>

        {/* History Strip */}
        {history.length > 0 && (
          <div className="history-bar">
            {history.map((img, i) => (
              <img
                key={i}
                src={img}
                className="history-thumb"
                onClick={() => setImage(img)}
                alt={`History ${i}`}
              />
            ))}
          </div>
        )}

      </main>

      {/* API Modal */}
      {showApi && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }} onClick={() => setShowApi(false)}>
          <div style={{
            background: '#111', border: '1px solid var(--border)', padding: '2rem', borderRadius: '16px',
            maxWidth: '600px', width: '90%', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>ES Ai API Integration</h2>
            <p style={{ color: '#aaa' }}>Use our backend in your own future projects.</p>

            <div style={{ background: '#222', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <span style={{ color: '#888' }}># POST Request Example</span><br />
              <span style={{ color: '#c792ea' }}>curl</span> -X POST {API_URL}/generate \<br />
              &nbsp;&nbsp;-H <span style={{ color: '#a5d6ff' }}>"Content-Type: application/json"</span> \<br />
              &nbsp;&nbsp;-d <span style={{ color: '#a5d6ff' }}>'{`{"prompt": "A modern building", "steps": 4}`}'</span>
            </div>

            <p style={{ fontSize: '0.9rem', marginTop: '1.5rem' }}>
              <strong>Endpoint:</strong> <code style={{ color: 'var(--accent)' }}>{API_URL}/generate</code><br />
              <strong>Method:</strong> POST<br />
              <strong>Format:</strong> JSON <code>{`{ "image": "data:image/png;base64,..." }`}</code>
            </p>

            <button onClick={() => setShowApi(false)} style={{
              marginTop: '1rem', background: 'var(--primary)', border: 'none', color: 'white',
              padding: '0.5rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
            }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
