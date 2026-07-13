import { useState, useRef, useEffect } from 'react'
import { generateSingleImage, initSession, pollAllJobs } from '../utils/higgsfieldGenerate'
import { generateId } from '../store'
import { glassInput } from '../ui/glass'

export function buildWardrobePrompt(influencer, { outfit, hair, customText }) {
  const phys = influencer.physicalDesc ? `The subject: ${influencer.physicalDesc}. ` : ''
  const identity = `IDENTITY LOCK — replicate exactly from reference: facial bone structure, face shape, jaw, nose bridge and tip, lip shape, eye shape and color, eyebrow arch and thickness, skin tone, skin texture and pores, all freckles, moles, marks, scars, natural asymmetries. Zero facial drift — this must be unmistakably the same person.`
  const layout = `Output must be the exact same 4-panel character turnaround sheet as the reference image. Single row of four equally sized full-body panels with these labels in clean sans-serif capitals above each: "FRONT VIEW" | "SIDE VIEW" | "BACK VIEW" | "THREE-QUARTER VIEW". Keep identical body poses, stance, arm positions, proportions, and panel layout from the reference. Do NOT change poses, labels, panel structure, background (pure white seamless), or lighting.`
  const changeParts = [
    outfit && `outfit — ${outfit}`,
    hair && `hairstyle — ${hair}`,
    customText?.trim() || '',
  ].filter(Boolean)
  const changes = `Change only: ${changeParts.join('; ') || 'casual stylish outfit, natural hairstyle'}.`
  return `Professional full-body character turnaround sheet. ${phys}Pure white seamless background throughout. Soft neutral studio lighting, perfectly flat and even across all four panels — no shadows, no color cast.\n\n${layout}\n\n${identity}\n\n${changes}\n\nPhotorealistic RAW photograph quality, ultra-sharp micro detail. Shot on Hasselblad X2D 100C.`
}

export const jobsKey   = id => `wd_jobs_${id}`

export function saveJobs(id, jobIds) {
  try { localStorage.setItem(jobsKey(id), JSON.stringify({ jobIds, startedAt: Date.now() })) } catch {}
}
export function loadJobs(id) {
  try {
    const d = JSON.parse(localStorage.getItem(jobsKey(id)) || 'null')
    if (!d) return null
    if (Date.now() - d.startedAt > 15 * 60 * 1000) { localStorage.removeItem(jobsKey(id)); return null }
    return d
  } catch { return null }
}
export function clearJobs(id) { try { localStorage.removeItem(jobsKey(id)) } catch {} }

// WardrobeDrawer receives pendingResult from its parent (parent owns localStorage persistence)
// onResult(url) — parent saves to localStorage; onResult(null) — parent clears it
export default function WardrobeDrawer({ influencer, pendingResult, onResult, onClose, onSave }) {
  const [top, setTop] = useState('')
  const [bottom, setBottom] = useState('')
  const [hair, setHair] = useState('')
  const [footwear, setFootwear] = useState('')
  const [customText, setCustomText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(pendingResult || null)
  const [saveName, setSaveName] = useState('Custom Look')
  const cancelRef = useRef(false)
  const drawerRef = useRef()

  // Sync result when pendingResult prop changes (e.g. parent restores from localStorage)
  useEffect(() => {
    if (pendingResult && !result) setResult(pendingResult)
  }, [pendingResult])

  const refImage = influencer?.mainImage || null
  const canGenerate = refImage && !generating && !result && (
    customText.trim() || top.trim() || bottom.trim() || hair.trim() || footwear.trim()
  )

  // On mount: resume any in-flight generation (jobs saved to localStorage before tab switch)
  useEffect(() => {
    const pending = loadJobs(influencer?.id)
    if (!pending) return
    cancelRef.current = false
    setGenerating(true)
    setProgress(30)
    initSession()
      .then(() => pollAllJobs(pending.jobIds, 1, setProgress, 16, () => cancelRef.current))
      .then(urls => {
        if (!cancelRef.current && urls[0]) {
          clearJobs(influencer?.id)
          onResult(urls[0])
          setResult(urls[0])
          setSaveName('Custom Look')
        }
      })
      .catch(e => { if (!cancelRef.current) setError(e.message) })
      .finally(() => {
        clearJobs(influencer?.id)
        if (!cancelRef.current) { setGenerating(false); setProgress(0) }
      })
  }, [influencer?.id])

  useEffect(() => {
    function onDown(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  function cancelGeneration() {
    cancelRef.current = true
    clearJobs(influencer?.id)
    setGenerating(false)
    setProgress(0)
  }

  async function generate() {
    if (!canGenerate) return
    cancelRef.current = false
    setGenerating(true)
    setProgress(0)
    setError(null)
    try {
      const outfitParts = [top, bottom, footwear].filter(Boolean).join(', ')
      const prompt = buildWardrobePrompt(influencer, { outfit: outfitParts, hair, customText: customText || null })
      const url = await generateSingleImage({
        prompt, aspectRatio: '16:9', referenceImage: refImage,
        onProgress: setProgress,
        onJobIds: jobIds => saveJobs(influencer?.id, jobIds),
        isCancelled: () => cancelRef.current,
      })
      if (!cancelRef.current && url) {
        clearJobs(influencer?.id)
        onResult(url)   // parent persists to localStorage
        setResult(url)
        setSaveName('Custom Look')
      }
    } catch (e) {
      clearJobs(influencer?.id)
      if (!cancelRef.current && e.message !== 'CANCELLED') setError(e.message)
    } finally {
      if (!cancelRef.current) { setGenerating(false); setProgress(0) }
    }
  }

  function save() {
    if (!result) return
    onSave({ id: generateId(), name: saveName.trim() || 'Custom Look', image: result })
    onResult(null)  // parent clears localStorage
    setResult(null); setSaveName('Custom Look'); setTop(''); setBottom(''); setHair(''); setFootwear(''); setCustomText('')
  }

  function discard() {
    onResult(null)  // parent clears localStorage
    setResult(null); setSaveName('Custom Look')
  }

  const iS = { ...glassInput, padding: '9px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
  const lS = { fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }

  return (
    <div ref={drawerRef} style={{
      position: 'fixed', top: 'var(--nav-h)', right: 0, bottom: 0,
      width: 400, zIndex: 400,
      background: 'var(--glass-bg-strong)',
      backdropFilter: 'blur(var(--blur-lg)) saturate(1.8)',
      WebkitBackdropFilter: 'blur(var(--blur-lg)) saturate(1.8)',
      boxShadow: 'inset 1px 1px 0 var(--glass-highlight), var(--shadow-lg)',
      borderLeft: '1px solid var(--glass-border)',
      borderTopLeftRadius: 'var(--radius-xl)',
      animation: 'liquidDrawerIn 0.6s var(--ease-liquid)',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`@keyframes liquidDrawerIn{from{transform:translateX(48px) scale(0.98);opacity:0;filter:blur(10px)}to{transform:translateX(0) scale(1);opacity:1;filter:blur(0)}}`}</style>

      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Add Outfit</div>
          <button onClick={onClose} className="liquid-press" style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', boxShadow: 'inset 0 1px 0 var(--glass-highlight)', color: 'var(--text-secondary)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Uses character sheet as identity lock · 16:9 · 4K</div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {result && (
          <>
            <img src={result} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'block' }} />
            <div>
              <span style={lS}>Name this look</span>
              <input value={saveName} onChange={e => setSaveName(e.target.value)} style={iS} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={save} className="liquid-press" style={{ flex: 1, padding: '11px', borderRadius: 999, fontSize: 14, fontWeight: 800, background: 'var(--brand)', color: 'var(--brand-ink)', border: '1px solid rgba(255,255,255,0.35)', cursor: 'pointer', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), var(--glow-brand)', fontFamily: 'inherit' }}>Save to Wardrobe</button>
              <button onClick={discard} className="liquid-press" style={{ padding: '11px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', boxShadow: 'inset 0 1px 0 var(--glass-highlight)', cursor: 'pointer', fontFamily: 'inherit' }}>Discard</button>
            </div>
          </>
        )}

        {generating && !result && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Generating look…</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{progress > 0 ? `${Math.round(progress)}%` : 'Starting…'}</span>
                <button onClick={cancelGeneration} style={{ padding: '3px 10px', borderRadius: 980, fontSize: 11, fontWeight: 600, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-tertiary)', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)' }}>
              <div style={{ height: '100%', width: `${Math.max(3, progress)}%`, background: 'linear-gradient(90deg, rgba(199,242,78,0.7), var(--brand))', borderRadius: 999, transition: 'width 0.7s var(--ease-liquid)', boxShadow: '0 0 12px rgba(199,242,78,0.55)' }} />
            </div>
          </div>
        )}

        {!result && !generating && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <span style={lS}>Top</span>
                <input value={top} onChange={e => setTop(e.target.value)} placeholder={influencer?.gender === 'Male' ? 'e.g. white oxford' : 'e.g. white crop top'} style={iS} />
              </div>
              <div>
                <span style={lS}>Bottom</span>
                <input value={bottom} onChange={e => setBottom(e.target.value)} placeholder={influencer?.gender === 'Male' ? 'e.g. dark chinos' : 'e.g. baggy jeans'} style={iS} />
              </div>
            </div>
            <div>
              <span style={lS}>Hairstyle</span>
              <input value={hair} onChange={e => setHair(e.target.value)} placeholder={influencer?.gender === 'Male' ? 'e.g. slicked back' : 'e.g. sleek low bun'} style={iS} />
            </div>
            <div>
              <span style={lS}>Footwear</span>
              <input value={footwear} onChange={e => setFootwear(e.target.value)} placeholder={influencer?.gender === 'Male' ? 'e.g. white sneakers' : 'e.g. strappy heels'} style={iS} />
            </div>
            <div>
              <span style={lS}>Full look description</span>
              <textarea value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Describe the complete outfit — overrides the fields above…" rows={3} style={{ ...iS, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
            {!refImage && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '9px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                No main image — add one to the profile first.
              </div>
            )}
            {error && <div style={{ fontSize: 12, color: '#FF3B30' }}>{error}</div>}
          </>
        )}
      </div>

      {!result && !generating && (
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={generate} disabled={!canGenerate} className="liquid-press" style={{
            width: '100%', padding: '13px', borderRadius: 999, fontSize: 14, fontWeight: 800,
            background: canGenerate ? 'var(--brand)' : 'var(--bg-tertiary)',
            color: canGenerate ? 'var(--brand-ink)' : 'var(--text-tertiary)',
            border: canGenerate ? '1px solid rgba(255,255,255,0.35)' : '1px solid var(--glass-border)',
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            boxShadow: canGenerate ? 'inset 0 1px 0 rgba(255,255,255,0.55), var(--glow-brand)' : 'inset 0 1px 0 var(--glass-highlight)',
            transition: 'background 0.45s var(--ease-liquid), box-shadow 0.45s var(--ease-liquid), transform 0.5s var(--ease-jelly)', fontFamily: 'inherit',
          }}>Generate Look</button>
        </div>
      )}
    </div>
  )
}
