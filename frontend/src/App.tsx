import { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import './index.css'

// Simple type for chat messages
type Message = {
  role: 'user' | 'ai';
  content: string;
}

function App() {
  // Mode: 'image' or 'chat'
  const [mode, setMode] = useState<'image' | 'chat'>('image')

  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [showApi, setShowApi] = useState(false)

  // Image State
  const [image, setImage] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hello, I am **ES Ai**. I can generate visuals, write code, and verify facts from the web. How can I help you today?' }
  ])

  // Refs for scrolling
  const chatEndRef = useRef<HTMLDivElement>(null)

  const API_URL = 'https://ssureshkxmar-my-image-gen-backend.hf.space'

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mode])

  // Poll backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/health`)
        const data = await res.json()
        if (data.status === 'ready') setStatus('ready')
        else { setStatus('loading'); setTimeout(checkHealth, 3000) }
      } catch (e) {
        setStatus('loading'); setTimeout(checkHealth, 3000)
      }
    }
    checkHealth()
  }, [])

  const handleAction = async () => {
    if (!prompt) return
    setLoading(true)
    setError(null)

    if (mode === 'image') {
      await generateImage()
    } else {
      await sendChatMessage()
    }
  }

  const generateImage = async () => {
    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, steps: 4 }),
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setImage(data.image)
      setHistory(prev => [data.image, ...prev].slice(0, 5))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Server error')
    } finally {
      setLoading(false)
    }
  }

  const sendChatMessage = async () => {
    // Add user message immediately
    const userMsg = prompt
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setPrompt('') // Clear input specifically for chat flow

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setMessages(prev => [...prev, { role: 'ai', content: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${err instanceof Error ? err.message : 'Server connection failed'}` }])
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

        {/* Mode Switcher */}
        <div className="mode-switch">
          <button
            className={`mode-btn ${mode === 'image' ? 'active' : ''}`}
            onClick={() => setMode('image')}
          >
            🖼 Visual
          </button>
          <button
            className={`mode-btn ${mode === 'chat' ? 'active' : ''}`}
            onClick={() => setMode('chat')}
          >
            💬 Neural Chat
          </button>
        </div>

        <div className="control-group">
          <label className="control-label">
            {mode === 'image' ? 'Visual Description' : 'Message / Query'}
          </label>
          <textarea
            className="cyber-input"
            placeholder={mode === 'image'
              ? "A futuristic city with flying cars, neon lights..."
              : "Write a python script to... / Who is the CEO of Google?"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAction()
              }
            }}
          />
        </div>

        {mode === 'image' && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Generating 4-step High-Res Image
          </div>
        )}

        <button
          className="neon-btn"
          onClick={handleAction}
          disabled={loading || (!prompt && mode === 'image') || status !== 'ready'}
        >
          {loading
            ? (mode === 'image' ? 'Synthesizing...' : 'Thinking...')
            : (mode === 'image' ? 'Generate Visual' : 'Send Message')}
        </button>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.9rem', background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px' }}>
            ⚠ {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={() => setShowApi(true)}
            style={{
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
              padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
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

        {mode === 'image' ? (
          /* IMAGE MODE */
          <div className={`image-frame ${image ? 'has-image' : ''}`}>
            {loading && (
              <div style={{ position: 'absolute', zIndex: 10 }}>
                <span className="loader"></span>
              </div>
            )}

            {image ? (
              <>
                <img src={image} alt="Generated" className="generated-img" style={{ opacity: loading ? 0.5 : 1 }} />
                <button className="download-btn" onClick={downloadImage}>⬇ Download</button>
              </>
            ) : (
              <div className="placeholder-text" style={{ textAlign: 'center', color: 'var(--text-muted)', opacity: 0.5 }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>ES Visual Engine</h2>
                <p>Enter a prompt to create art</p>
              </div>
            )}
          </div>
        ) : (
          /* CHAT MODE */
          <div className="chat-container">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                <Markdown>{msg.content}</Markdown>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble ai" style={{ display: 'flex', gap: '10px' }}>
                <div className="status-dot loading" style={{ animation: 'pulse 1s infinite' }}></div>
                <div className="status-dot loading" style={{ animation: 'pulse 1s infinite', animationDelay: '0.2s' }}></div>
                <div className="status-dot loading" style={{ animation: 'pulse 1s infinite', animationDelay: '0.4s' }}></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* History Strip (Only in Image Mode) */}
        {mode === 'image' && history.length > 0 && (
          <div className="history-bar">
            {history.map((img, i) => (
              <img key={i} src={img} className="history-thumb" onClick={() => setImage(img)} alt={`History ${i}`} />
            ))}
          </div>
        )}

      </main>

      {/* API Modal (Same as before) */}
      {showApi && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }} onClick={() => setShowApi(false)}>
          <div style={{
            background: '#111', border: '1px solid var(--border)', padding: '2rem', borderRadius: '16px',
            maxWidth: '600px', width: '90%', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>ES Ai Developer API</h2>
            <p style={{ color: '#aaa' }}>Endpoints for your applications:</p>

            <div style={{ background: '#222', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontFamily: 'monospace', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <span style={{ color: '#888' }}># 1. Generate Image</span><br />
              POST {API_URL}/generate<br />
              {`{ "prompt": "...", "steps": 4 }`}
            </div>

            <div style={{ background: '#222', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <span style={{ color: '#888' }}># 2. Chat / Code / Search</span><br />
              POST {API_URL}/chat<br />
              {`{ "message": "Write python code...", "token": "OPTIONAL_HF_TOKEN" }`}
            </div>

            <button onClick={() => setShowApi(false)} style={{
              marginTop: '1.5rem', background: 'var(--primary)', border: 'none', color: 'white',
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
