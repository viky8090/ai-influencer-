import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Show, RedirectToSignIn } from '@clerk/react'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from './context/theme'
import { GlassProvider } from './context/glass'
import { StoreProvider } from './store'
import { AstryxProvider } from './ui/ax/AstryxScope'
import { silentRefreshHFToken } from './utils/higgsfieldAuth'
import AmbientBackground from './components/AmbientBackground'
import Nav from './components/Nav'
import OnboardingTour from './components/OnboardingTour'
import Landing from './pages/Landing'

// Route-level code splitting: only Landing (the first-paint marketing page) ships in the
// entry bundle; every other page loads on demand. This matters because the entry bundle was
// ~994 KB with everything inlined — Influencers.jsx alone is 4,700+ lines.
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const Docs = lazy(() => import('./pages/Docs'))
const Earnings = lazy(() => import('./pages/Earnings'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Influencers = lazy(() => import('./pages/Influencers'))
const Inspiration = lazy(() => import('./pages/Inspiration'))
const BrandDeals = lazy(() => import('./pages/BrandDeals'))
const Create = lazy(() => import('./pages/Create'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Publish = lazy(() => import('./pages/Publish'))
const Usage = lazy(() => import('./pages/Usage'))
const Settings = lazy(() => import('./pages/Settings'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Contact = lazy(() => import('./pages/Contact'))
const Terms = lazy(() => import('./pages/legal/Terms'))
const Privacy = lazy(() => import('./pages/legal/Privacy'))
const Dmca = lazy(() => import('./pages/legal/Dmca'))
const Cookies = lazy(() => import('./pages/legal/Cookies'))

// Warm the most likely next chunks while the browser is idle, so in-app navigation never
// waits on the network. Failures are fine — the route's own lazy() retries on navigation.
// The heavy app chunks (Dashboard/Create/Influencers) are only warmed for signed-in users —
// a signed-out marketing visitor shouldn't pay to download the 339 KB studio they can't open.
function prefetchLikelyRoutes() {
  const warm = () => {
    import('./pages/Pricing').catch(() => {}) // relevant to everyone (upgrade path)
    if (window.Clerk?.user) {
      import('./pages/Dashboard').catch(() => {})
      import('./pages/Create').catch(() => {})
      import('./pages/Influencers').catch(() => {})
    }
  }
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 })
  else setTimeout(warm, 2500)
}

// Route fallback: hold the page area open (no layout jump) with a subtle brand pulse.
// Chunk loads are near-instant after the idle prefetch, so this rarely shows.
function RouteLoader() {
  return (
    <div style={{ minHeight: '100vh', paddingTop: 'var(--nav-h)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="blob-loader" style={{ width: 22, height: 22 }} />
    </div>
  )
}

export default function App() {
  useEffect(() => {
    silentRefreshHFToken()
    prefetchLikelyRoutes()
    function onVisible() {
      if (document.visibilityState === 'visible') silentRefreshHFToken()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <ThemeProvider>
    <AstryxProvider>
    <GlassProvider>
    <StoreProvider>
    <BrowserRouter>
      <AmbientBackground />
      <Nav />
      <OnboardingTour />
      <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/influencers" element={
          <Show when="signed-in" fallback={<RedirectToSignIn />}>
            <Influencers />
          </Show>
        } />
        <Route path="/inspiration" element={<Inspiration />} />
        <Route path="/brand-deals" element={<BrandDeals />} />
        <Route path="/create" element={<Create />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/publish" element={
          <Show when="signed-in" fallback={<RedirectToSignIn />}>
            <Publish />
          </Show>
        } />
        <Route path="/usage" element={<Usage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/dmca" element={<Dmca />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <Analytics />
    </BrowserRouter>
    </StoreProvider>
    </GlassProvider>
    </AstryxProvider>
    </ThemeProvider>
  )
}
