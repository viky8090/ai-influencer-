import { useState, useRef, useEffect } from 'react'
import { assistWrite } from '../utils/aiAssist'
import { glassModal, glassBtnPrimary, glassBtnGhost, glassChip, pressHandlers } from '../ui/glass'

// Small, reusable "write this for me" button. Click ✨ → one metered Claude call → a review
// popover shows the suggestion with Use it / Try again. The user's draft is NEVER overwritten
// until they hit "Use it". Context and purpose drive what gets written (see utils/aiAssist.js).
//
// Props:
//   purpose   'caption' | 'backstory' | 'script'
//   context   object passed to the purpose's prompt builder (influencer, platforms, wizard data…)
//   draft     current field value — improved rather than replaced when present
//   onAccept  (text) => void — called with the suggestion when the user accepts
//   images    optional [url] for vision (caption only); non-fetchable URLs are ignored server-side
//   label     button text (default 'AI')
//   title     tooltip
export default function AIAssist({ purpose, context, draft = '', onAccept, images, label = 'AI', title = 'Write this with AI' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState(null)
  const wrapRef = useRef(null)
  const press = pressHandlers(0.92)

  // Snapshot the live props at click time so the request always reflects the current draft/context.
  const live = useRef({ context, draft, images })
  live.current = { context, draft, images }

  async function run() {
    setLoading(true)
    setError(null)
    setResult('')
    try {
      const text = await assistWrite({
        purpose,
        context: live.current.context || {},
        draft: live.current.draft || '',
        images: live.current.images || [],
      })
      setResult(text)
    } catch (e) {
      if (e?.code === 'SIGN_IN_REQUIRED') setError({ kind: 'signin', msg: 'Sign in to use AI assist.' })
      else if (e?.status === 402 || /credit/i.test(e?.message || '')) setError({ kind: 'credits', msg: 'You’re out of credits.' })
      else setError({ kind: 'error', msg: e?.message || 'Couldn’t write that — try again.' })
    } finally {
      setLoading(false)
    }
  }

  function openAndRun() {
    setOpen(true)
    run()
  }

  function close() {
    setOpen(false)
    setResult('')
    setError(null)
  }

  function accept() {
    if (result) onAccept?.(result)
    close()
  }

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) close() }
    function onKey(e) { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button
        type="button"
        {...press}
        onClick={() => (open ? close() : openAndRun())}
        title={title}
        style={{
          ...glassChip,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
          color: 'var(--brand-ink, #0b0b0b)', background: 'var(--brand)',
          border: '1px solid rgba(255,255,255,0.35)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
          lineHeight: 1,
        }}
      >
        <span aria-hidden style={{ fontSize: 12 }}>✨</span>{label}
      </button>

      {open && (
        <div
          className="reveal"
          onClick={(e) => e.stopPropagation()}
          style={{
            ...glassModal,
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60,
            width: 'min(340px, 78vw)', padding: 14,
            borderRadius: '6px 16px 16px 16px',
          }}
        >
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px', color: 'var(--text-secondary)', fontSize: 13 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--brand)', boxShadow: '0 0 12px rgba(199,242,78,0.7)', animation: 'droplet-wobble 1.2s var(--ease-liquid) infinite' }} />
              Writing…
            </div>
          )}

          {!loading && error && (
            <div>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{error.msg}</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {error.kind === 'signin' ? (
                  <button {...press} onClick={() => { window.Clerk?.openSignIn?.(); close() }} style={{ ...glassBtnPrimary, padding: '7px 14px', fontSize: 12.5 }}>Sign in</button>
                ) : error.kind === 'credits' ? (
                  <button {...press} onClick={close} style={{ ...glassBtnGhost, padding: '7px 14px', fontSize: 12.5 }}>Close</button>
                ) : (
                  <button {...press} onClick={run} style={{ ...glassBtnPrimary, padding: '7px 14px', fontSize: 12.5 }}>Try again</button>
                )}
              </div>
            </div>
          )}

          {!loading && !error && result && (
            <div>
              <div style={{
                fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-primary)', whiteSpace: 'pre-wrap',
                maxHeight: 200, overflowY: 'auto', marginBottom: 12,
                padding: '10px 11px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
              }}>{result}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button {...press} onClick={run} style={{ ...glassBtnGhost, padding: '7px 13px', fontSize: 12.5 }}>Try again</button>
                <button {...press} onClick={accept} style={{ ...glassBtnPrimary, padding: '7px 15px', fontSize: 12.5 }}>Use it</button>
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  )
}
