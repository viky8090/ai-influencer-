import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleOAuthCallback } from '../utils/higgsfieldAuth'
import { glassBtnPrimary } from '../ui/glass'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const err = params.get('error')

    if (err) {
      setError(params.get('error_description') || err)
      return
    }
    if (!code || !state) {
      setError('Missing OAuth parameters')
      return
    }

    const isPopup = !!(window.opener && !window.opener.closed)

    handleOAuthCallback(code, state)
      .then(() => {
        if (isPopup) {
          window.opener.postMessage({ type: 'hf_auth_success' }, window.location.origin)
          window.close()
        } else {
          const returnUrl = localStorage.getItem('hf_return_url') || '/settings?connected=1'
          localStorage.removeItem('hf_return_url')
          navigate(returnUrl, { replace: true })
        }
      })
      .catch(e => {
        if (isPopup) {
          window.opener.postMessage({ type: 'hf_auth_error', error: e.message }, window.location.origin)
          window.close()
        } else {
          setError(e.message)
        }
      })
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'transparent' }}>
      {error ? (
        <div className="reveal glass" style={{ textAlign: 'center', maxWidth: 380, padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Connection failed</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</div>
          <button onClick={() => navigate('/settings')} className="liquid-press" style={{ ...glassBtnPrimary, padding: '10px 26px', fontSize: 14 }}>
            Back to Settings
          </button>
        </div>
      ) : (
        <div className="reveal" style={{ textAlign: 'center' }}>
          <div className="blob-loader" style={{ width: 42, height: 42, margin: '0 auto 18px' }} />
          <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Connecting your Higgsfield account…</div>
        </div>
      )}
    </div>
  )
}
