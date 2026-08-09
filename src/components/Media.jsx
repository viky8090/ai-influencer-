import { useState, useEffect, useRef } from 'react'

/**
 * Image and video primitives that survive a failed load.
 *
 * The app had no onError handling anywhere, so any URL that failed - a renamed bundled
 * asset, an expired remote CDN link, a dropped request on a cold reload - rendered the
 * browser's broken-image box permanently. Nothing retried, and nothing explained it.
 *
 * Behaviour:
 *  - one silent retry with a cache-busting param, which clears the common transient case
 *    (a request that died mid-flight, or a cached negative response)
 *  - after that, a placeholder occupying the same box, with a manual retry
 *
 * Automatic retry is capped at one attempt on purpose. A genuinely missing file will never
 * appear, and retrying across a grid of hundreds of thumbnails would spend real bandwidth
 * re-confirming the same 404.
 *
 * DELIBERATELY WRAPPER-FREE. An earlier draft wrapped the element in a positioned <span>,
 * which breaks any call site whose image sizes intrinsically (36px chips) or is a direct
 * grid/flex child. Instead the fallback is a <div> that inherits the same style object, so
 * it occupies the identical box and these are true drop-in replacements for <img>/<video>.
 */

const RETRY_LIMIT = 1

function useRetryableSrc(src) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)

  // A changed src is a different asset: clear any failure recorded against the old one.
  useEffect(() => { setAttempt(0); setFailed(false) }, [src])

  const onError = () => setAttempt((n) => {
    if (n >= RETRY_LIMIT) { setFailed(true); return n }
    return n + 1
  })
  const retry = () => { setAttempt(0); setFailed(false) }

  // Only bust the cache on retry - the first request should still hit the HTTP cache.
  const resolved = !src || attempt === 0
    ? src
    : `${src}${src.includes('?') ? '&' : '?'}__r=${attempt}`

  return { resolved, failed, onError, retry }
}

function Fallback({ style, label, onRetry, title }) {
  return (
    <div
      title={title || label || 'Preview unavailable'}
      onClick={(e) => { if (onRetry) { e.stopPropagation(); e.preventDefault(); onRetry() } }}
      style={{
        // Inherit the caller's box so the grid never reflows on failure.
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-tertiary)',
        color: 'var(--text-tertiary)',
        cursor: onRetry ? 'pointer' : 'default',
        overflow: 'hidden',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden
        style={{ flexShrink: 0, opacity: 0.75 }}>
        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
        <path d="M21 3v6h-6" />
      </svg>
    </div>
  )
}

export function SmartImage({ src, alt, fallbackLabel, style, ...rest }) {
  const { resolved, failed, onError, retry } = useRetryableSrc(src)
  if (failed) return <Fallback style={style} label={fallbackLabel || alt} onRetry={retry} title={`${fallbackLabel || alt || 'Image'} — click to retry`} />
  return (
    <img
      src={resolved}
      alt={alt}
      onError={onError}
      // Keeps a large decode off the main thread, which matters on a grid of hundreds.
      decoding="async"
      style={style}
      {...rest}
    />
  )
}

export function SmartVideo({ src, fallbackLabel, style, videoRef, ...rest }) {
  const { resolved, failed, onError, retry } = useRetryableSrc(src)
  const innerRef = useRef(null)
  const ref = videoRef || innerRef

  // A <video> whose src 404s can sit silently at readyState 0 rather than firing a React
  // onError, so listen on the element directly as well.
  useEffect(() => {
    const el = ref.current
    if (!el || failed) return
    const h = () => onError()
    el.addEventListener('error', h)
    return () => el.removeEventListener('error', h)
  }, [ref, resolved, failed]) // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return <Fallback style={style} label={fallbackLabel} onRetry={retry} title={`${fallbackLabel || 'Video'} — click to retry`} />
  return <video ref={ref} src={resolved} onError={onError} style={style} {...rest} />
}

export default SmartImage
