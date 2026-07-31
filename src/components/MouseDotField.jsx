import { useEffect, useRef } from 'react'

// Interactive dot field: a grid of dots that breathe on their own, get pushed away
// from the cursor by a damped spring, and brighten as it passes.
//
// This is a port of the kokonutui "mouse effect card" effect. The original renders one
// spring-driven <motion.div> per dot, which is fine inside a 400px card (~700 dots) but
// not for a full-bleed hero — at hero size that's several thousand animated DOM nodes,
// each with three motion values. Everything here draws into one canvas instead. All the
// original constants, the spring configs and the dot-generation rules are kept as-is, so
// the motion reads the same; only the renderer changed.

// framer-motion SPRING_CONFIG for the repulsion offset
const POS_STIFFNESS = 300
const POS_DAMPING = 30
const POS_MASS = 0.5
// ...and the softer spring the original puts on the proximity glow
const GLOW_STIFFNESS = 150
const GLOW_DAMPING = 25
const GLOW_MASS = 1

const OPACITY_DURATION_BASE = 0.8
const OPACITY_DURATION_VARIATION = 0.2
const OPACITY_DELAY_CYCLE = 1.5
const OPACITY_DELAY_STEP = 0.02
const MIN_OPACITY_MULTIPLIER = 0.5
const MAX_OPACITY_MULTIPLIER = 1.5
const MIN_OPACITY_FALLBACK = 0.3
const PROXIMITY_MULTIPLIER = 1.2
const PROXIMITY_OPACITY_BOOST = 0.8
const BASE_OPACITIES = [0.3, 0.5, 0.7]

const MAX_DT = 1 / 30      // clamp dt so a dropped frame can't blow the springs up
const REST_OFFSET = 0.01   // px — below this (and at rest) a dot snaps home and stops integrating
const REST_VELOCITY = 0.05
const MOBILE_SPACING_SCALE = 1.35 // thin the grid out on phones

// The original animates opacity with ease [0.4, 0, 0.2, 1]. Sample that curve once into a
// lookup table — solving the bezier per dot per frame would be the most expensive thing here.
const EASE_STEPS = 256
const EASE_LUT = buildEaseLut(0.4, 0, 0.2, 1)

function buildEaseLut(p1x, p1y, p2x, p2y) {
  // cubic bezier from (0,0) to (1,1) — only the two control values per axis vary
  const at = (a, b, t) => {
    const u = 1 - t
    return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
  }
  const lut = new Float32Array(EASE_STEPS + 1)
  const step = 1 / (EASE_STEPS * 4)
  let t = 0
  for (let i = 0; i <= EASE_STEPS; i++) {
    const x = i / EASE_STEPS
    while (t < 1 && at(p1x, p2x, t) < x) t += step
    lut[i] = at(p1y, p2y, t > 1 ? 1 : t)
  }
  return lut
}

const ease = (p) => EASE_LUT[(p * EASE_STEPS) | 0]

// The kokonut original DELETES dots toward the centre (`if (Math.random() > edge) continue`,
// edge≈0 in the middle). In a 400px card that's a tasteful vignette; across a full-screen
// hero it leaves a big hole in the middle with dots only ringing the edges — which reads as
// a "broken" grid, and means the cursor (which lives in that empty centre, over the copy)
// never passes any dots, so the hover looks dead.
//
// So we keep an EVEN, full-bleed grid — every dot exists, hover works anywhere — and instead
// of deleting the centre dots we just DIM them, so the headline stays legible without
// punching a hole in the field. `CENTER_DIM_FLOOR` is how bright a dead-centre dot is
// relative to a field dot; `CENTER_RELEASE` is the fraction of the half-diagonal over which
// the dimming lifts back to full.
const CENTER_DIM_FLOOR = 0.32
const CENTER_RELEASE = 0.46

function generateDots(width, height, spacing) {
  const cols = Math.ceil(width / spacing)
  const rows = Math.ceil(height / spacing)
  const cx = width / 2
  const cy = height / 2
  const releaseR = Math.sqrt(cx * cx + cy * cy) * CENTER_RELEASE

  const bx = []
  const by = []
  const minO = []
  const maxO = []
  const dur = []
  const del = []

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const x = col * spacing
      const y = row * spacing
      const dx = x - cx
      const dy = y - cy
      const dc = Math.sqrt(dx * dx + dy * dy)
      // 1 out in the field, easing down to CENTER_DIM_FLOOR right behind the headline
      const dim = CENTER_DIM_FLOOR + (1 - CENTER_DIM_FLOOR) * Math.min(dc / releaseR, 1)

      const base = BASE_OPACITIES[(row + col) % 3] * dim
      const i = bx.length
      bx.push(x)
      by.push(y)
      minO.push(Math.max(base * MIN_OPACITY_MULTIPLIER, MIN_OPACITY_FALLBACK * dim))
      maxO.push(Math.min(base * MAX_OPACITY_MULTIPLIER, 1))
      dur.push(OPACITY_DURATION_BASE + (i % 4) * OPACITY_DURATION_VARIATION)
      del.push((i * OPACITY_DELAY_STEP) % OPACITY_DELAY_CYCLE)
    }
  }

  const n = bx.length
  return {
    n,
    bx: Float32Array.from(bx),
    by: Float32Array.from(by),
    minO: Float32Array.from(minO),
    maxO: Float32Array.from(maxO),
    dur: Float32Array.from(dur),
    del: Float32Array.from(del),
    ox: new Float32Array(n), // spring offset from base position
    oy: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    glow: new Float32Array(n), // spring-smoothed proximity boost
    gv: new Float32Array(n),
  }
}

/**
 * Fills its nearest positioned ancestor. Never eats pointer events, so it can sit
 * directly under headings and buttons.
 *
 * Defaults are tuned for a full-screen hero — the card original uses radius 80 /
 * strength 20, which barely registers across 1900px.
 */
export default function MouseDotField({
  dotSize = 2,
  dotSpacing = 22,
  repulsionRadius = 170,
  repulsionStrength = 26,
  color = '#ffffff',
  style,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Only the autonomous pulse is gated on reduced-motion; the pointer-driven repulsion and
    // glow run regardless, matching the hero's parallax cards (which also react to the cursor
    // under reduced-motion). `breathe` can flip live if the user toggles the OS setting.
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let breathe = !(motionQuery?.matches)

    let dots = null
    let rect = canvas.getBoundingClientRect()
    let rectStale = false
    let dpr = 1
    let sprite = null
    let spriteCss = 0
    let cssW = 0
    let cssH = 0
    let raf = 0
    let last = 0
    let elapsed = 0
    let onScreen = true
    const mouse = { x: Infinity, y: Infinity }

    // One pre-rendered dot, stamped thousands of times per frame. Building a fresh arc()
    // path per dot is what actually costs at this count; drawImage of a cached bitmap doesn't.
    function buildSprite() {
      const px = Math.max(1, Math.round(dotSize * dpr))
      const pad = 2 // room for the antialiased edge
      const s = document.createElement('canvas')
      s.width = px + pad * 2
      s.height = px + pad * 2
      const sc = s.getContext('2d')
      sc.fillStyle = color
      sc.beginPath()
      sc.arc(s.width / 2, s.height / 2, px / 2, 0, Math.PI * 2)
      sc.fill()
      sprite = s
      // drawn back at exactly 1:1 device pixels inside the dpr-scaled context
      spriteCss = s.width / dpr
    }

    function measure() {
      rect = canvas.getBoundingClientRect()
      rectStale = false
      const w = Math.max(1, Math.round(rect.width))
      const h = Math.max(1, Math.round(rect.height))
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2)
      if (w === cssW && h === cssH && nextDpr === dpr && dots) return false

      cssW = w
      cssH = h
      dpr = nextDpr
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildSprite()
      dots = generateDots(w, h, w < 640 ? dotSpacing * MOBILE_SPACING_SCALE : dotSpacing)
      return true
    }

    function frame(now) {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, MAX_DT)
      last = now
      elapsed += dt

      const { n, bx, by, minO, maxO, dur, del, ox, oy, vx, vy, glow, gv } = dots
      const hasMouse = Number.isFinite(mouse.x) && Number.isFinite(mouse.y)
      const mx = mouse.x
      const my = mouse.y
      const glowR = repulsionRadius * PROXIMITY_MULTIPLIER
      const glowR2 = glowR * glowR
      const half = spriteCss / 2

      ctx.clearRect(0, 0, cssW, cssH)

      for (let i = 0; i < n; i++) {
        let tx = 0
        let ty = 0
        let tg = 0

        if (hasMouse) {
          const dx = bx[i] - mx
          const dy = by[i] - my
          const d2 = dx * dx + dy * dy
          if (d2 < glowR2) {
            const d = Math.sqrt(d2)
            if (d < repulsionRadius) {
              // same as the original's cos/sin of atan2(dy, dx), without the trig
              const force = (1 - d / repulsionRadius) * repulsionStrength
              const inv = d > 1e-4 ? force / d : 0
              tx = dx * inv
              ty = dy * inv
            }
            tg = (1 - d / glowR) * PROXIMITY_OPACITY_BOOST
          }
        }

        // position spring — skipped entirely for the (many) dots sitting still
        if (tx !== 0 || ox[i] !== 0 || vx[i] !== 0) {
          let v = vx[i] + ((-POS_STIFFNESS * (ox[i] - tx) - POS_DAMPING * vx[i]) / POS_MASS) * dt
          let o = ox[i] + v * dt
          if (tx === 0 && Math.abs(o) < REST_OFFSET && Math.abs(v) < REST_VELOCITY) { o = 0; v = 0 }
          vx[i] = v
          ox[i] = o
        }
        if (ty !== 0 || oy[i] !== 0 || vy[i] !== 0) {
          let v = vy[i] + ((-POS_STIFFNESS * (oy[i] - ty) - POS_DAMPING * vy[i]) / POS_MASS) * dt
          let o = oy[i] + v * dt
          if (ty === 0 && Math.abs(o) < REST_OFFSET && Math.abs(v) < REST_VELOCITY) { o = 0; v = 0 }
          vy[i] = v
          oy[i] = o
        }
        if (tg !== 0 || glow[i] !== 0 || gv[i] !== 0) {
          let v = gv[i] + ((-GLOW_STIFFNESS * (glow[i] - tg) - GLOW_DAMPING * gv[i]) / GLOW_MASS) * dt
          let g = glow[i] + v * dt
          if (tg === 0 && Math.abs(g) < 0.002 && Math.abs(v) < 0.01) { g = 0; v = 0 }
          gv[i] = v
          glow[i] = g
        }

        // Idle brightness. When breathing (the default) it's the min→max→min loop, per-dot
        // duration and staggered start. Under reduced-motion we hold the resting brightness
        // and skip the autonomous pulse — but the pointer-driven `glow`/repulsion below still
        // apply, since those are a direct response to the user moving the cursor, not motion
        // the page starts on its own.
        let a
        if (breathe) {
          let ph = (elapsed - del[i]) / dur[i]
          ph = ph <= 0 ? 0 : ph % 1
          const tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2
          a = minO[i] + (maxO[i] - minO[i]) * ease(tri) + glow[i]
        } else {
          a = minO[i] + glow[i]
        }
        if (a <= 0.004) continue
        if (a > 1) a = 1

        ctx.globalAlpha = a
        ctx.drawImage(sprite, bx[i] + ox[i] - half, by[i] + oy[i] - half, spriteCss, spriteCss)
      }

      ctx.globalAlpha = 1
    }

    function start() {
      if (raf || !onScreen || document.hidden) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    function onPointerMove(e) {
      if (e.pointerType === 'touch') return // no cursor to follow on touch
      if (rectStale) { rect = canvas.getBoundingClientRect(); rectStale = false }
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const slack = repulsionRadius
      if (x < -slack || y < -slack || x > rect.width + slack || y > rect.height + slack) {
        mouse.x = Infinity
        mouse.y = Infinity
        return
      }
      mouse.x = x
      mouse.y = y
    }

    function onLeave() {
      mouse.x = Infinity
      mouse.y = Infinity
    }

    function onScroll() { rectStale = true }

    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    measure()

    const ro = new ResizeObserver(() => { measure() })
    ro.observe(canvas)

    // React live to the OS "Reduce Motion" toggle instead of only reading it once at mount.
    const onMotionPref = (e) => { breathe = !e.matches }
    motionQuery?.addEventListener?.('change', onMotionPref)

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen) start()
      else stop()
    })
    io.observe(canvas)

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    start()

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      motionQuery?.removeEventListener?.('change', onMotionPref)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerMove)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [dotSize, dotSpacing, repulsionRadius, repulsionStrength, color])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}
