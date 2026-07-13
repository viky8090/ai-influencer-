import { createContext, useContext, useState, useEffect } from 'react'
import { flushSync } from 'react-dom'

const ThemeContext = createContext()

let busy = false

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (!localStorage.getItem('theme_default_v2')) {
      localStorage.setItem('theme_default_v2', '1')
      localStorage.setItem('theme', 'dark')
      return 'dark'
    }
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Liquid droplet reveal: the new theme spreads from the click point as a
  // growing droplet — swelling past its final size and settling back like
  // liquid finding its level, while the old theme blurs away underneath.
  function toggle(x, y) {
    if (busy) return
    const next = theme === 'light' ? 'dark' : 'light'
    if (!document.startViewTransition) { setTheme(next); return }

    busy = true

    document.getElementById('theme-droplet-style')?.remove()

    const cx = x ?? window.innerWidth - 46
    const cy = y ?? window.innerHeight - 46
    const endR = Math.hypot(
      Math.max(cx, window.innerWidth - cx),
      Math.max(cy, window.innerHeight - cy)
    )

    const styleEl = document.createElement('style')
    styleEl.id = 'theme-droplet-style'
    styleEl.textContent = `
      ::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}
      ::view-transition-new(root){z-index:1}
      ::view-transition-old(root){z-index:0}
    `
    document.head.appendChild(styleEl)

    function cleanup() { styleEl.remove(); busy = false }

    const vt = document.startViewTransition(() => { flushSync(() => setTheme(next)) })

    vt.ready.then(() => {
      // Old view slowly loses focus — like condensation fogging a pane.
      document.documentElement.animate(
        { opacity: [1, 0.6], filter: ['blur(0px)', 'blur(18px)'] },
        { duration: 620, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards', pseudoElement: '::view-transition-old(root)' }
      )

      // New view: droplet grows with a liquid overshoot, then settles.
      const anim = document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${cx}px ${cy}px)`,
            `circle(${Math.round(endR * 0.72)}px at ${cx}px ${cy}px)`,
            `circle(${Math.round(endR * 1.12)}px at ${cx}px ${cy}px)`,
            `circle(${Math.round(endR)}px at ${cx}px ${cy}px)`,
          ],
          offset: [0, 0.42, 0.78, 1],
        },
        { duration: 820, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' }
      )
      anim.onfinish = cleanup
      anim.oncancel = cleanup
    }).catch(cleanup)

    vt.finished.catch(cleanup)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
