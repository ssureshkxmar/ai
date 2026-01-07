import { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
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
  const [previewCode, setPreviewCode] = useState<string | null>(null)
  const [pythonOutput, setPythonOutput] = useState<string | null>(null)
  const [pyodide, setPyodide] = useState<any>(null)

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hello, I am **ES Ai**. I can generate visuals, write code, and verify facts. \n\nTry asking: *"Write a python snake game"*' }
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
    const userMsg = prompt
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setPrompt('')

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

  // --- Pre-load Pyodide ---
  useEffect(() => {
    const initPyodide = async () => {
      try {
        // @ts-ignore
        const py = await loadPyodide()
        setPyodide(py)
        await py.loadPackage(['micropip'])
      } catch (e) {
        console.error("Failed to load Pyodide:", e)
      }
    }
    initPyodide()
  }, [])

  // --- Code Download Helper ---
  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }



  // --- Python Runner ---
  const runPython = async (code: string) => {
    setPythonOutput('Initializing Python kernel...\n')
    try {
      let py = pyodide
      if (!py) {
        // @ts-ignore
        py = await loadPyodide()
        setPyodide(py)
        await py.loadPackage(['micropip']) // Pre-load micropip
      }
      setPythonOutput('Running...\n')
      // redirect stdout
      py.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
      `)
      await py.runPythonAsync(code)
      const stdout = py.runPython("sys.stdout.getvalue()")
      setPythonOutput(stdout || '[No Output]')
    } catch (err) {
      setPythonOutput(`Error:\n${String(err)}`)
    }
  }

  // --- Project Runner ---
  const runProject = async (markdownContent: string) => {
    setPythonOutput('Initializing Python kernel for project...\n')
    try {
      let py = pyodide
      if (!py) {
        // @ts-ignore
        py = await loadPyodide()
        setPyodide(py)
        await py.loadPackage(['micropip'])
      }

      setPythonOutput('Running project...\n')
      py.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
      `)

      // Extract all code blocks from the markdown content
      const codeBlocks = markdownContent.match(/```(\w+)(?::([^\n]+))?\n([\s\S]*?)```/g) || []
      let fullOutput = ''

      for (const block of codeBlocks) {
        const match = /```(\w+)(?::([^\n]+))?\n([\s\S]*?)```/.exec(block)
        if (match) {
          const lang = match[1]
          const filename = match[2]
          const code = match[3].trim()

          if (lang === 'python' || (filename && filename.endsWith('.py'))) {
            fullOutput += `\n--- Executing ${filename || 'Python Code Block'} ---\n`
            await py.runPythonAsync(code)
            const stdout = py.runPython("sys.stdout.getvalue()")
            fullOutput += stdout
            py.runPython("sys.stdout = StringIO()") // Reset stdout for next block
          } else if (lang === 'html' || (filename && filename.endsWith('.html'))) {
            setPreviewCode(code)
            fullOutput += `\n--- HTML file ${filename || 'index.html'} opened in preview ---\n`
          }
        }
      }
      setPythonOutput(fullOutput || '[No Output]')

    } catch (err) {
      setPythonOutput(`Error:\n${String(err)}`)
    }
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
              ? "A futuristic city with flying cars..."
              : "Generate a python snake game..."}
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
          <>
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

            {/* History Strip */}
            {history.length > 0 && (
              <div className="history-bar">
                {history.map((img, i) => (
                  <img key={i} src={img} className="history-thumb" onClick={() => setImage(img)} alt={`History ${i}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          /* CHAT MODE */
          <div className="chat-container">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`chat-bubble ${msg.role}`}>
                  <Markdown
                    components={{
                      code(props) {
                        const { children, className, node, ...rest } = props
                        // Extract ref from rest to prevent passing it to SyntaxHighlighter
                        // @ts-ignore - ref types mismatch between Markdown and SyntaxHighlighter
                        const { ref, ...syntaxHighlighterProps } = rest

                        const match = /language-(\w+)(?::(.+))?/.exec(className || '')
                        // Logic: if language string has a colon (e.g. language-python:game.py), capture filename
                        let lang = match ? match[1] : ''
                        let filename = match ? match[2] : ''

                        // Fallback: sometimes LLM writes ```python:game.py without space
                        // so className might just be language-python:game.py
                        if (!filename && className && className.includes(':')) {
                          const parts = className.replace('language-', '').split(':')
                          lang = parts[0]
                          filename = parts[1]
                        }

                        return match || filename ? (
                          <div style={{ margin: '1rem 0' }}>
                            {filename && (
                              <div style={{
                                background: '#333', padding: '0.5rem 1rem', borderTopLeftRadius: '8px',
                                borderTopRightRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                              }}>
                                <span style={{ fontSize: '0.8rem', color: '#ccc', fontFamily: 'monospace' }}>📄 {filename}</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  {/* Web Preview */}
                                  {(lang === 'html' || filename.endsWith('.html')) && (
                                    <button
                                      onClick={() => setPreviewCode(String(children))}
                                      style={{
                                        background: '#3b82f6', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                        fontSize: '0.75rem', padding: '2px 8px', color: '#fff', fontWeight: 'bold'
                                      }}
                                    >
                                      ▶ Preview
                                    </button>
                                  )}
                                  {/* Python Runner */}
                                  {(lang === 'python' || filename.endsWith('.py')) && (
                                    <button
                                      onClick={() => runPython(String(children))}
                                      style={{
                                        background: '#eab308', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                        fontSize: '0.75rem', padding: '2px 8px', color: '#000', fontWeight: 'bold'
                                      }}
                                    >
                                      ▶ Run
                                    </button>
                                  )}
                                  <button
                                    onClick={() => downloadCode(String(children).replace(/\n$/, ''), filename)}
                                    style={{
                                      background: '#4ade80', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                      fontSize: '0.75rem', padding: '2px 8px', color: '#000', fontWeight: 'bold'
                                    }}
                                  >
                                    ⬇ Download
                                  </button>
                                </div>
                              </div>
                            )}
                            <SyntaxHighlighter
                              PreTag="div"
                              children={String(children).replace(/\n$/, '')}
                              language={lang}
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                borderTopLeftRadius: filename ? 0 : '8px',
                                borderTopRightRadius: filename ? 0 : '8px',
                                borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'
                              }}
                            />
                          </div>
                        ) : (
                          <code {...rest} className={className}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {msg.content}
                  </Markdown>
                </div>

                {/* Project Runner Button (Only for AI messages with code) */}
                {i === messages.length - 1 && msg.role === 'ai' && msg.content.includes('```') && (
                  <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => runProject(msg.content)}
                      className="neon-btn"
                      style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: '#ec4899', width: 'auto' }}
                    >
                      ▶ Run Full Project
                    </button>
                  </div>
                )}
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

      </main>

      {showApi && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }} onClick={() => setShowApi(false)}>
          {/* API Modal Content (Same as before) */}
          <div style={{
            background: '#111', border: '1px solid var(--border)', padding: '2rem', borderRadius: '16px',
            maxWidth: '600px', width: '90%', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>ES Ai Developer API</h2>
            <button onClick={() => setShowApi(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewCode && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200,
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{
            padding: '1rem', background: '#111', borderBottom: '1px solid #333',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, color: '#fff' }}>Live Preview</h3>
            <button
              onClick={() => setPreviewCode(null)}
              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              Close Preview
            </button>
          </div>
          <iframe
            style={{ flex: 1, border: 'none', background: '#fff' }}
            srcDoc={previewCode}
            sandbox="allow-scripts"
            title="Preview"
          />
        </div>
      )}

      {/* Terminal Modal */}
      {pythonOutput !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setPythonOutput(null)}>
          <div style={{
            background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px',
            width: '80%', maxWidth: '800px', height: '600px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '0.75rem', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#161b22', borderTopLeftRadius: '8px', borderTopRightRadius: '8px'
            }}>
              <span style={{ color: '#c9d1d9', fontFamily: 'monospace', fontWeight: 'bold' }}>💻 Python Terminal</span>
              <button onClick={() => setPythonOutput(null)} style={{ background: '#da3633', border: 'none', borderRadius: '4px', color: '#fff', padding: '4px 12px', cursor: 'pointer' }}>Close</button>
            </div>
            <pre style={{
              flex: 1, padding: '1rem', margin: 0, overflow: 'auto', color: '#3fb950', fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', fontSize: '0.9rem'
            }}>
              {pythonOutput}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
