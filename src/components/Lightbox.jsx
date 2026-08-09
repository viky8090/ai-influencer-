import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { glassOverlay } from '../ui/glass'

const glassCircleBtn = {
  borderRadius: '50%',
  background: 'var(--glass-bg-strong)',
  color: 'var(--text-primary)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'inset 0 1px 0 var(--glass-highlight), var(--shadow-sm)',
  backdropFilter: 'blur(var(--blur-sm)) saturate(1.5)',
  WebkitBackdropFilter: 'blur(var(--blur-sm)) saturate(1.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'transform 0.5s var(--ease-jelly), box-shadow 0.45s var(--ease-liquid)',
}

export default function Lightbox({ images, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const multi = images.length > 1
  const navigate = useNavigate()
  // Only server-hosted public assets can be published (blob:/data: URLs can't
  // be fetched by the publishing service).
  const publishable = typeof images[idx] === 'string' && images[idx].includes('/public/')

  useEffect(() => {
    setIdx(i => Math.min(i, Math.max(0, images.length - 1)))
  }, [images.length])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && multi) setIdx(i => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft' && multi) setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images, multi, onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        ...glassOverlay,
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="liquid-press"
        style={{
          ...glassCircleBtn,
          position: 'absolute', top: 20, right: 20,
          width: 40, height: 40, fontSize: 20,
        }}
      >×</button>

      {/* Post to socials */}
      {publishable && (
        <button
          onClick={e => { e.stopPropagation(); onClose(); navigate(`/publish?media=${encodeURIComponent(images[idx])}`) }}
          className="liquid-press"
          style={{
            ...glassCircleBtn,
            position: 'absolute', top: 20, left: 20,
            width: 'auto', height: 40, padding: '0 18px', borderRadius: 999,
            fontSize: 13.5, fontWeight: 800, gap: 7,
            background: 'var(--brand)', color: 'var(--brand-ink)',
            border: '1px solid rgba(255,255,255,0.35)',
          }}
        >↗ Post</button>
      )}

      {/* Counter */}
      {multi && (
        <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', color: 'var(--text-tertiary)', fontSize: 13 }}>
          {idx + 1} / {images.length}
        </div>
      )}

      {/* Prev */}
      {multi && idx > 0 && (
        <div style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)' }}>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => i - 1) }}
            className="liquid-press"
            style={{ ...glassCircleBtn, width: 44, height: 44, fontSize: 20 }}
          >‹</button>
        </div>
      )}

      {/* Image — click to close */}
      <img
        src={images[idx]}
        onClick={onClose}
        className="reveal"
        style={{cursor:'zoom-out',
          maxWidth: '88vw', maxHeight: '88vh',
          objectFit: 'contain',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
          userSelect: 'none',
        }}
        alt=""
      />

      {/* Next */}
      {multi && idx < images.length - 1 && (
        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)' }}>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => i + 1) }}
            className="liquid-press"
            style={{ ...glassCircleBtn, width: 44, height: 44, fontSize: 20 }}
          >›</button>
        </div>
      )}

      {/* Thumbnails strip */}
      {multi && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, maxWidth: '90vw', overflowX: 'auto',
          paddingBottom: 4,
        }}>
          {images.map((src, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              style={{
                width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                overflow: 'hidden', cursor: 'pointer',
                border: i === idx ? '2px solid var(--brand)' : '1px solid var(--glass-border)',
                boxShadow: i === idx ? 'var(--glow-brand)' : 'none',
                opacity: i === idx ? 1 : 0.55,
                transition: 'border-color 0.45s var(--ease-liquid), box-shadow 0.45s var(--ease-liquid), opacity 0.3s var(--ease-liquid)',
                flexShrink: 0,
              }}
            >
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
