import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { useInfluencers } from '../store'
import { glassModal, glassOverlay, glassBtnPrimary, glassBtnGhost } from '../ui/glass'

// First-time product tour. Persisted so it only runs once per browser.
export const TOUR_KEY = 'vy_onboarding_tour_v1'

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Vymotion',
    body: 'Create a consistent AI influencer, generate on-brand photos and video, then publish. We’ll walk you through the basics in under a minute.',
    cta: 'Show me around',
  },
  {
    id: 'camila',
    title: 'Meet Camila — your example',
    body: 'Camila is a fully built sample influencer. Open her profile to explore character sheets, wardrobe, Photo Studio, and Video Studio before you create your own.',
    cta: 'Open Camila',
    action: 'camila',
  },
  {
    id: 'create',
    title: 'Create your own influencer',
    body: 'When you’re ready, use Create to design a new persona — face references, vibe, and look — then generate your first images.',
    cta: 'Go to Create',
    action: 'create',
  },
  {
    id: 'credits',
    title: 'Credits power generations',
    body: 'Every image, video, and AI prompt uses credits. Free accounts explore only — start Starter ($5) or higher to generate. Your balance lives in the top bar. Failed generations are never charged.',
    cta: 'Got it',
  },
  {
    id: 'done',
    title: 'You’re ready',
    body: 'Explore Camila, create your first influencer, or jump into Photo Studio. You can restart this tour anytime from Settings.',
    cta: 'Start creating',
    action: 'finish',
  },
]

export function isTourDone() {
  try { return localStorage.getItem(TOUR_KEY) === 'done' } catch { return false }
}

export function markTourDone() {
  try { localStorage.setItem(TOUR_KEY, 'done') } catch {}
}

export function resetTour() {
  try { localStorage.removeItem(TOUR_KEY) } catch {}
}

export default function OnboardingTour() {
  const { isLoaded, isSignedIn } = useAuth()
  const [influencers] = useInfluencers()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  // Auto-start only for first-time / example-only accounts (not power users with many personas).
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    if (isTourDone()) return
    const list = influencers || []
    const onlyExample = list.length === 0
      || (list.length === 1 && list[0]?.id === 'camila-template')
      || list.every(i => i.id === 'camila-template')
    if (!onlyExample) {
      // Existing multi-influencer users: mark done so we never nag
      markTourDone()
      return
    }
    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [isLoaded, isSignedIn, influencers])

  // Allow Settings (or any page) to re-open the tour
  useEffect(() => {
    function onStart() {
      setStep(0)
      setOpen(true)
    }
    window.addEventListener('vymotion:start-tour', onStart)
    return () => window.removeEventListener('vymotion:start-tour', onStart)
  }, [])

  if (!open) return null

  const s = STEPS[step]
  const isLast = step >= STEPS.length - 1
  const progress = `${step + 1} / ${STEPS.length}`

  function finish() {
    markTourDone()
    setOpen(false)
  }

  function skip() {
    finish()
  }

  function next() {
    if (s.action === 'camila') {
      navigate('/influencers')
    } else if (s.action === 'create') {
      navigate('/create')
    } else if (s.action === 'finish') {
      navigate('/create')
      finish()
      return
    }

    if (isLast) {
      finish()
      return
    }
    setStep((n) => n + 1)
  }

  function back() {
    if (step > 0) setStep((n) => n - 1)
  }

  // Don't block pure marketing pages if tour somehow opens signed-out
  if (!isSignedIn) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        ...glassOverlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div className="reveal" style={{
        ...glassModal,
        width: '100%', maxWidth: 440, padding: '28px 26px 22px',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Quick tour · {progress}
          </span>
          <button
            onClick={skip}
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-tertiary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Skip
          </button>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                height: 4, flex: 1, borderRadius: 99,
                background: i <= step ? 'var(--brand)' : 'var(--border)',
                transition: 'background 0.15s var(--ease-out)',
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div style={{
            width: '100%', aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden',
            border: '1px solid var(--border)', marginBottom: 16, background: 'var(--bg-tertiary)',
          }}>
            <img src="/camila/main.jpg" alt="Camila" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%' }} />
          </div>
        )}

        <h2 id="tour-title" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 10px', lineHeight: 1.2 }}>
          {s.title}
        </h2>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 22px' }}>
          {s.body}
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {step > 0 && (
            <button onClick={back} className="liquid-press" style={{ ...glassBtnGhost, padding: '11px 16px', fontSize: 13 }}>
              Back
            </button>
          )}
          <button onClick={next} className="liquid-press" style={{ ...glassBtnPrimary, flex: 1, padding: '12px 18px', fontSize: 14, textAlign: 'center' }}>
            {s.cta}
          </button>
        </div>

        {pathname === '/dashboard' && step === 0 && (
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
            Tip: Camila is already in your Influencers list as a working example.
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
