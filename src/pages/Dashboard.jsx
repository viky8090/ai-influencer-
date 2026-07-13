import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import {
  Card,
  Text,
  Button,
  Badge,
  Banner,
  ClickableCard,
  VStack,
  HStack,
} from '@astryxdesign/core'
import { useInfluencers } from '../store'
import { gColor } from '../utils/influencerUtils'
import { api } from '../api/client'
import { useCredits } from '../api/creditsStore'
import { isTourDone } from '../components/OnboardingTour'
import AstryxScope from '../ui/ax/AstryxScope'
import RouterLink from '../ui/ax/RouterLink'

// Speaker icons for the video mute toggle.
const IconMuted = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
  </svg>
)
const IconSound = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" />
  </svg>
)

// A recent-generation tile. Videos play on hover and carry a mute/unmute toggle;
// anything served from /public/ can be posted straight to socials.
function RecentTile({ m, navigate }) {
  const vidRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const isVideo = m.type === 'video'
  const postable = m.url.includes('/public/')

  function enter() {
    const v = vidRef.current
    if (v) { v.play().catch(() => {}) }
  }
  function leave() {
    const v = vidRef.current
    if (v) { v.pause(); v.currentTime = 0 }
  }

  return (
    <div
      style={{ breakInside: 'avoid', marginBottom: 10, borderRadius: 9, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}
      onMouseEnter={isVideo ? enter : undefined}
      onMouseLeave={isVideo ? leave : undefined}
    >
      {isVideo
        ? <video ref={vidRef} src={m.url} muted={muted} loop playsInline preload="metadata" style={{ width: '100%', display: 'block' }} />
        : <img src={m.url} alt="" loading="lazy" style={{ width: '100%', display: 'block' }} />}

      {isVideo && (
        <>
          <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10.5, fontWeight: 700, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', pointerEvents: 'none' }}>▶</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); const next = !muted; setMuted(next); const v = vidRef.current; if (v && !next) v.play().catch(() => {}) }}
            title={muted ? 'Unmute' : 'Mute'}
            className="liquid-press"
            style={{ position: 'absolute', bottom: 8, left: 8, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'rgba(10,10,15,0.55)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)', backdropFilter: 'blur(8px) saturate(1.5)', WebkitBackdropFilter: 'blur(8px) saturate(1.5)', cursor: 'pointer' }}
          >
            {muted ? <IconMuted /> : <IconSound />}
          </button>
        </>
      )}

      {postable && (
        <button
          type="button"
          onClick={() => navigate(`/publish?media=${encodeURIComponent(m.url)}${isVideo ? '&mediaType=video' : ''}`)}
          className="liquid-press"
          title="Post to socials"
          style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 11, fontWeight: 800, background: 'rgba(10,10,15,0.55)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)', backdropFilter: 'blur(8px) saturate(1.5)', WebkitBackdropFilter: 'blur(8px) saturate(1.5)', borderRadius: 999, padding: '3px 10px', cursor: 'pointer' }}
        >↗ Post</button>
      )}
    </div>
  )
}

function Stat({ label, big, meta, link, onLink, children }) {
  return (
    <Card padding={4} style={{ display: 'flex', flexDirection: 'column' }}>
      <Text
        type="supporting"
        size="xsm"
        weight="bold"
        color="secondary"
        style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
      >
        {label}
      </Text>
      <Text type="display-3" weight="bold" display="block" style={{ letterSpacing: '-0.5px', margin: '8px 0 2px' }}>
        {big}
      </Text>
      {meta && (
        <Text type="supporting" size="sm" color="secondary" display="block">{meta}</Text>
      )}
      {children}
      {link && (
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <Button
            label={`${link} →`}
            variant="ghost"
            size="sm"
            onClick={onLink}
          />
        </div>
      )}
    </Card>
  )
}

const QUICK = [
  { title: 'New influencer', cost: 'from 18 credits', to: '/create', icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></> },
  { title: 'Photo Studio', cost: '6–22 credits / image', to: '/influencers', icon: <><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6l1.5-2h5L16 6" /></> },
  { title: 'Video Studio', cost: '25–200+ credits / clip', to: '/influencers', icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9h4M3 14h4M17 9h4M17 14h4" /></> },
  { title: 'Brand Deal', cost: 'from 28 credits', to: '/brand-deals', icon: <><path d="M6 7h12l1 13H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></> },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn, user } = useUser()
  const [influencers] = useInfluencers()
  const { bal: balance, total: creditTotal } = useCredits()
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate('/', { replace: true })
  }, [isLoaded, isSignedIn]) // eslint-disable-line

  useEffect(() => {
    if (!isSignedIn) return
    api.billing.plan().then(setPlan).catch(() => {})
  }, [isSignedIn])

  const recent = useMemo(() => {
    const items = []
    try {
      for (const p of JSON.parse(localStorage.getItem('photo_studio_history') || '[]')) {
        if (p.url) items.push({ url: p.url, type: 'image', date: p.createdAt || 0 })
      }
    } catch { /* ignore */ }
    for (const inf of influencers || []) {
      for (const g of inf.generationHistory || []) if (g.url) items.push({ url: g.url, type: g.type, date: g.date || 0 })
    }
    return items.sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 12)
  }, [influencers])

  const totalGens = useMemo(
    () => (influencers || []).reduce((n, i) => n + (i.generationHistory?.length || 0), 0),
    [influencers],
  )

  const total = creditTotal
  const firstName = user?.firstName || (user?.fullName || '').split(' ')[0] || 'creator'
  const lowBalance = total != null && total < 20
  const planName = plan ? plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1) : 'Free'
  const PLAN_CREDITS = { free: 'No gen credits', starter: '200 credits / mo', creator: '600 credits / mo', pro: '1,800 credits / mo', studio: '5,500 credits / mo' }
  const firstVisit = !isTourDone()
  const onlyExample = (influencers || []).length === 1 && influencers[0]?.id === 'camila-template'

  return (
    <AstryxScope>
      <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'transparent' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 70px' }}>

          {/* Header */}
          <div className="reveal" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text
                type="supporting"
                size="xsm"
                weight="bold"
                color="secondary"
                display="block"
                style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}
              >
                Studio · {planName} plan
              </Text>
              <Text type="display-2" weight="bold" display="block" style={{ letterSpacing: '-1px', lineHeight: 1.05 }}>
                {firstVisit ? `Welcome, ${firstName}` : `Welcome back, ${firstName}`}
              </Text>
              <Text type="body" size="sm" color="secondary" display="block" style={{ marginTop: 7 }}>
                {firstVisit || onlyExample
                  ? 'Camila is your example influencer — explore her studio, then create your own.'
                  : "Here's where you left off."}
              </Text>
            </div>
            <Button
              label="Upgrade plan"
              variant="secondary"
              size="sm"
              href="/pricing"
              as={RouterLink}
            />
          </div>

          {/* First-time checklist */}
          {(firstVisit || onlyExample) && (
            <Card className="reveal-1" padding={4} style={{ marginBottom: 18 }}>
              <HStack justify="between" align="center" gap={3} style={{ flexWrap: 'wrap' }}>
                <VStack gap={0.5} style={{ flex: 1, minWidth: 200 }}>
                  <Text type="body" size="sm" weight="bold">Getting started</Text>
                  <Text type="supporting" size="sm" color="secondary">
                    1) Open Camila · 2) Try Photo Studio · 3) Create your influencer
                  </Text>
                </VStack>
                <HStack gap={2}>
                  <Button label="Open Camila" variant="primary" size="sm" href="/influencers" as={RouterLink} />
                  <Button label="Create yours" variant="secondary" size="sm" href="/create" as={RouterLink} />
                </HStack>
              </HStack>
            </Card>
          )}

          {/* Low-balance nudge */}
          {lowBalance && (
            <div className="reveal-1" style={{ marginBottom: 18 }}>
              <Banner
                status="warning"
                title="Running low on credits"
                description={`${total} credits left — top up to keep generating.`}
                endContent={
                  <Button label="Top up" variant="primary" size="sm" onClick={() => navigate('/pricing')} />
                }
              />
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="dash-stats reveal-2">
            <Stat
              label="Credit balance"
              big={total != null ? total.toLocaleString() : '…'}
              meta={balance ? `${balance.subscription_vc} plan · ${balance.topup_vc} top-up` : 'Loading…'}
              link="Usage & history"
              onLink={() => navigate('/usage')}
            />
            <Stat
              label="Plan"
              big={planName}
              meta={PLAN_CREDITS[plan?.plan] || ''}
              link="Manage billing"
              onLink={() => navigate('/pricing')}
            />
            <Stat
              label="Library"
              big={(influencers?.length || 0).toString()}
              meta={`influencers · ${totalGens} generations`}
              link="Open studio"
              onLink={() => navigate('/influencers')}
            />
          </div>

          {/* Quick actions */}
          <div style={{ margin: '26px 0 12px' }}>
            <Text type="body" weight="bold" size="sm">Quick actions</Text>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="dash-actions reveal-3">
            {QUICK.map((a) => (
              <ClickableCard
                key={a.title}
                label={a.title}
                onClick={() => navigate(a.to)}
                padding={4}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: 'rgba(199,242,78,0.12)', color: 'var(--brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{a.icon}</svg>
                </div>
                <Text type="body" size="sm" weight="bold" display="block">{a.title}</Text>
                <Text type="supporting" size="xsm" color="secondary" display="block" style={{ marginTop: 3 }}>{a.cost}</Text>
              </ClickableCard>
            ))}
          </div>

          {/* Recent generations */}
          <HStack justify="between" align="center" style={{ margin: '26px 0 12px' }}>
            <Text type="body" weight="bold" size="sm">Recent generations</Text>
            <Button label="View all →" variant="ghost" size="sm" href="/influencers" as={RouterLink} />
          </HStack>
          {recent.length ? (
            <div style={{ columnCount: 5, columnGap: 10 }} className="dash-grid">
              {recent.map((m, i) => (
                <RecentTile key={i} m={m} navigate={navigate} />
              ))}
            </div>
          ) : (
            <Card padding={6} style={{ textAlign: 'center' }}>
              <Text type="body" size="sm" color="secondary">
                No generations yet.{' '}
              </Text>
              <Button
                label="Create your first influencer →"
                variant="ghost"
                size="sm"
                href="/create"
                as={RouterLink}
              />
            </Card>
          )}

          {/* Your influencers */}
          <HStack justify="between" align="center" style={{ margin: '26px 0 12px' }}>
            <Text type="body" weight="bold" size="sm">Your influencers</Text>
            <Button label="Manage →" variant="ghost" size="sm" href="/influencers" as={RouterLink} />
          </HStack>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }} className="dash-inf">
            {(influencers || []).slice(0, 5).map((inf) => (
              <ClickableCard
                key={inf.id}
                label={inf.name || 'Untitled'}
                onClick={() => navigate('/influencers')}
                padding={0}
                style={{ overflow: 'hidden', position: 'relative' }}
              >
                <div style={{
                  aspectRatio: '4 / 5',
                  background: 'var(--bg-tertiary)',
                  backgroundImage: inf.mainImage ? `url(${inf.mainImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 20%',
                }} />
                {inf.id === 'camila-template' && (
                  <span style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Badge label="Example" variant="success" />
                  </span>
                )}
                <div style={{ padding: '10px 12px' }}>
                  <Text type="body" size="sm" weight="bold" display="block">{inf.name || 'Untitled'}</Text>
                  <Text type="supporting" size="xsm" display="block" style={{ marginTop: 2, color: gColor(inf.gender) }}>
                    {inf.niche || inf.gender || '—'}
                  </Text>
                </div>
              </ClickableCard>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 1100px) {
            .dash-stats { grid-template-columns: 1fr !important; }
            .dash-actions { grid-template-columns: repeat(2, 1fr) !important; }
            .dash-grid { column-count: 3 !important; }
            .dash-inf { grid-template-columns: repeat(3, 1fr) !important; }
          }
          @media (max-width: 640px) {
            .dash-grid { column-count: 2 !important; }
            .dash-inf { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>
      </div>
    </AstryxScope>
  )
}
