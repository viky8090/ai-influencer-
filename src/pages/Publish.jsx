import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/react'
import {
  Card,
  Text,
  Button,
  EmptyState,
  Dialog,
  DialogHeader,
  Layout,
  LayoutContent,
  Avatar,
  VStack,
  HStack,
  IconButton,
} from '@astryxdesign/core'
import { api, ApiError } from '../api/client'
import { useInfluencers } from '../store'
import { glassCard, glassPanel, glassModal, glassOverlay, glassBtnPrimary, glassBtnGhost, glassInput, glassChip, pressHandlers } from '../ui/glass'
import AIAssist from '../components/AIAssist'
import AstryxScope from '../ui/ax/AstryxScope'
import RouterLink from '../ui/ax/RouterLink'

// Publish — social scheduling calendar + composer (PRD N13, §12.8).
// Postiz runs invisibly behind the Worker's /api/social; this page only ever
// talks Vymotion language: channels, posts, schedule. Paid plans only.

const PLATFORMS = {
  x: { name: 'X (Twitter)', glyph: '𝕏', tint: 'rgba(255,255,255,0.10)' },
  linkedin: { name: 'LinkedIn', glyph: 'in', tint: 'rgba(10,102,194,0.22)' },
  'linkedin-page': { name: 'LinkedIn Page', glyph: 'in+', tint: 'rgba(10,102,194,0.22)' },
  pinterest: { name: 'Pinterest', glyph: 'P', tint: 'rgba(230,0,35,0.20)' },
  facebook: { name: 'Facebook', glyph: 'f', tint: 'rgba(24,119,242,0.22)' },
  instagram: { name: 'Instagram', glyph: 'IG', tint: 'rgba(225,48,108,0.20)' },
  threads: { name: 'Threads', glyph: '@', tint: 'rgba(255,255,255,0.10)' },
  youtube: { name: 'YouTube', glyph: '▶', tint: 'rgba(255,0,0,0.18)' },
  tiktok: { name: 'TikTok', glyph: '♪', tint: 'rgba(105,201,208,0.20)' },
  reddit: { name: 'Reddit', glyph: 'r/', tint: 'rgba(255,69,0,0.18)' },
  bluesky: { name: 'Bluesky', glyph: '🦋', tint: 'rgba(0,133,255,0.18)' },
  mastodon: { name: 'Mastodon', glyph: 'm', tint: 'rgba(99,100,255,0.20)' },
}
const pName = (p) => PLATFORMS[p]?.name || p

const STATE_COLORS = {
  scheduled: 'var(--brand)',
  published: '#5EE07A',
  draft: 'var(--text-secondary)',
  error: '#FF3D8B',
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const fmtDay = (ts) => new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

// Renders a media thumbnail as <video> or <img> — the publishable library mixes both,
// and generated video URLs (/public/assets/:id) carry no extension to sniff, so callers
// pass isVideo explicitly (from generationHistory type / the backend media type field).
function MediaThumb({ url, isVideo, style, showBadge = false }) {
  if (!isVideo) return <img src={url} alt="" loading="lazy" style={style} />
  return (
    <span style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      <video src={url} muted loop playsInline preload="metadata" style={style} />
      {showBadge && (
        <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, fontWeight: 800, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 5, padding: '1px 4px', pointerEvents: 'none' }}>▶</span>
      )}
    </span>
  )
}

function PlatformBadge({ platform, size = 30 }) {
  const meta = PLATFORMS[platform] || { glyph: '?', tint: 'rgba(255,255,255,0.08)' }
  return (
    <span title={pName(platform)} style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: meta.tint, border: '1px solid var(--glass-border)',
      fontSize: size * 0.42, fontWeight: 800, color: 'var(--text-primary)',
    }}>{meta.glyph}</span>
  )
}

export default function Publish() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useUser()
  const [params] = useSearchParams()
  const press = pressHandlers(0.95)

  const [plan, setPlan] = useState(null)
  const [gate, setGate] = useState('loading') // loading | free | unconfigured | ok
  const [channels, setChannels] = useState([])
  const [connectable, setConnectable] = useState([])
  const [posts, setPosts] = useState([])
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [composerOpen, setComposerOpen] = useState(Boolean(params.get('media')))
  const [detailPost, setDetailPost] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [connecting, setConnecting] = useState(null) // platform while popup flow runs
  const [toast, setToast] = useState(null)
  const popupRef = useRef(null)

  useEffect(() => { if (isLoaded && !isSignedIn) navigate('/', { replace: true }) }, [isLoaded, isSignedIn]) // eslint-disable-line

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4200)
  }

  // Gate: plan first, then whether publishing is configured server-side.
  useEffect(() => {
    if (!isSignedIn) return
    let dead = false
    api.billing.plan().then((p) => {
      if (dead) return
      setPlan(p)
      if (p.plan === 'free') { setGate('free'); return }
      loadChannels()
    }).catch(() => !dead && setGate('unconfigured'))
    return () => { dead = true }
  }, [isSignedIn]) // eslint-disable-line

  async function loadChannels() {
    try {
      const r = await api.social.channels()
      setChannels(r.channels)
      setConnectable(r.connectable || [])
      setGate('ok')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'plan_required') setGate('free')
      else if (e instanceof ApiError && e.code === 'publishing_not_configured') setGate('unconfigured')
      else setGate('unconfigured')
    }
  }

  const range = useMemo(() => {
    const from = new Date(month.y, month.m, 1).getTime() - 7 * 86400_000
    const to = new Date(month.y, month.m + 1, 1).getTime() + 14 * 86400_000
    return { from, to }
  }, [month])

  async function loadPosts() {
    try { setPosts((await api.social.listPosts(range.from, range.to)).posts) } catch { /* gate handles errors */ }
  }
  useEffect(() => { if (gate === 'ok') loadPosts() }, [gate, range]) // eslint-disable-line

  // ── Connect flow: popup + claim polling ─────────────────────────────
  async function startConnect(platform) {
    setPickerOpen(false)
    setConnecting(platform)
    try {
      const { url, pending_id } = await api.social.connect(platform)
      popupRef.current = window.open(url, 'vy-connect', 'width=620,height=780')
      for (let i = 0; i < 100; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const res = await api.social.claim(pending_id).catch(() => null)
        if (res?.channel) {
          try { popupRef.current?.close() } catch { /* cross-origin close race */ }
          await loadChannels()
          showToast(`${pName(platform)} connected`)
          return
        }
        if (res && !res.pending) break // expired / error
        if (popupRef.current?.closed && i > 2) {
          // Give the redirect a moment after close, then a few final polls.
          if (i > 6) break
        }
      }
      showToast('Connection didn’t complete — try again')
    } catch (e) {
      showToast(e?.code === 'platform_not_enabled'
        ? `${pName(platform)} isn’t available just yet`
        : 'Couldn’t start the connection — try again')
    } finally {
      setConnecting(null)
    }
  }

  async function disconnect(ch) {
    if (!window.confirm(`Disconnect ${ch.name || pName(ch.platform)}? Posts still scheduled to this channel will be removed too.`)) return
    try {
      await api.social.disconnect(ch.id)
      await loadChannels(); await loadPosts()
    } catch { showToast('Couldn’t disconnect — try again') }
  }

  // ── Calendar grid ────────────────────────────────────────────────────
  const weeks = useMemo(() => {
    const first = new Date(month.y, month.m, 1)
    const start = new Date(first)
    start.setDate(1 - ((first.getDay() + 6) % 7)) // Monday-start grid
    const out = []
    for (let w = 0; w < 6; w++) {
      const row = []
      for (let d = 0; d < 7; d++) {
        const day = new Date(start)
        day.setDate(start.getDate() + w * 7 + d)
        row.push(day)
      }
      out.push(row)
    }
    return out
  }, [month])

  const postsByDay = useMemo(() => {
    const map = new Map()
    for (const p of posts) {
      const k = new Date(p.scheduled_at).toDateString()
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(p)
    }
    for (const list of map.values()) list.sort((a, b) => a.scheduled_at - b.scheduled_at)
    return map
  }, [posts])

  const upcoming = useMemo(
    () => posts.filter((p) => p.state === 'scheduled' && p.scheduled_at >= Date.now()).sort((a, b) => a.scheduled_at - b.scheduled_at).slice(0, 8),
    [posts]
  )

  if (!isLoaded || !isSignedIn) return null

  return (
    <AstryxScope>
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 70px' }}>

        <div className="reveal" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <Text type="display-3" weight="bold" display="block" style={{ letterSpacing: '-0.4px' }}>Publish</Text>
            <Text type="body" size="sm" color="secondary" display="block" style={{ marginTop: 5 }}>
              Schedule your influencer’s content straight to your social channels.
            </Text>
          </div>
          {gate === 'ok' && (
            <Button
              label="+ New post"
              variant="primary"
              size="md"
              isDisabled={!channels.length}
              onClick={() => setComposerOpen(true)}
            />
          )}
        </div>

        {gate === 'loading' && <div className="blob-loader" style={{ margin: '80px auto' }} />}

        {gate === 'free' && (
          <div className="reveal-1" style={{ maxWidth: 620, margin: '40px auto' }}>
            <EmptyState
              title="Publishing starts on Starter"
              description="Connect social accounts and schedule posts from Vymotion on Starter ($5), Creator, Pro, or Studio. Free accounts can explore the app but not publish."
              icon={<span style={{ fontSize: 38 }}>📅</span>}
              actions={<Button label="See plans" variant="primary" size="md" href="/pricing" as={RouterLink} />}
            />
          </div>
        )}

        {gate === 'unconfigured' && (
          <div className="reveal-1" style={{ maxWidth: 620, margin: '40px auto' }}>
            <EmptyState
              title="Publishing is almost ready"
              description="We’re finishing the setup of social publishing. Check back soon — your plan already includes it."
              icon={<span style={{ fontSize: 38 }}>🛠️</span>}
            />
          </div>
        )}

        {gate === 'ok' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 18, alignItems: 'start' }} className="publish-grid">

            {/* Calendar */}
            <Card className="reveal-1" padding={4}>
              <HStack justify="between" align="center" style={{ marginBottom: 14 }}>
                <Text type="body" weight="bold" size="lg">{MONTHS[month.m]} {month.y}</Text>
                <HStack gap={1}>
                  <IconButton
                    label="Previous month"
                    variant="secondary"
                    size="sm"
                    icon={<span style={{ fontSize: 15, lineHeight: 1 }}>‹</span>}
                    onClick={() => setMonth(({ y, m }) => (m ? { y, m: m - 1 } : { y: y - 1, m: 11 }))}
                  />
                  <Button
                    label="Today"
                    variant="secondary"
                    size="sm"
                    onClick={() => { const d = new Date(); setMonth({ y: d.getFullYear(), m: d.getMonth() }) }}
                  />
                  <IconButton
                    label="Next month"
                    variant="secondary"
                    size="sm"
                    icon={<span style={{ fontSize: 15, lineHeight: 1 }}>›</span>}
                    onClick={() => setMonth(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}
                  />
                </HStack>
              </HStack>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center', padding: '4px 0' }}>{d}</div>
                ))}
              </div>
              {weeks.map((row, wi) => (
                <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                  {row.map((day) => {
                    const inMonth = day.getMonth() === month.m
                    const isToday = day.toDateString() === new Date().toDateString()
                    const dayPosts = postsByDay.get(day.toDateString()) || []
                    return (
                      <div key={day.toISOString()} style={{
                        minHeight: 78, padding: 5, borderRadius: 10,
                        background: isToday ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                        border: `1px solid ${isToday ? 'var(--brand)' : 'var(--border-subtle)'}`,
                        opacity: inMonth ? 1 : 0.38,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--brand)' : 'var(--text-secondary)', marginBottom: 3 }}>{day.getDate()}</div>
                        {dayPosts.slice(0, 3).map((p) => (
                          <button key={p.id} onClick={() => setDetailPost(p)} style={{
                            display: 'flex', alignItems: 'center', gap: 4, width: '100%', marginBottom: 2,
                            padding: '2px 5px', borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left',
                            background: 'var(--glass-bg)', overflow: 'hidden',
                          }}>
                            <span className={p.state === 'scheduled' ? 'droplet-wobble' : undefined} style={{ width: 6, height: 6, borderRadius: 999, flexShrink: 0, background: STATE_COLORS[p.state] || 'var(--text-secondary)' }} />
                            <span style={{ fontSize: 10.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {fmtTime(p.scheduled_at)} {p.content || 'Media post'}
                            </span>
                          </button>
                        ))}
                        {dayPosts.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-secondary)', paddingLeft: 5 }}>+{dayPosts.length - 3} more</div>}
                      </div>
                    )
                  })}
                </div>
              ))}

              <HStack gap={4} style={{ marginTop: 10, flexWrap: 'wrap' }}>
                {Object.entries({ scheduled: 'Scheduled', published: 'Published', draft: 'Draft', error: 'Needs attention' }).map(([k, label]) => (
                  <HStack key={k} gap={1.5} align="center">
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: STATE_COLORS[k] }} />
                    <Text type="supporting" size="xsm" color="secondary">{label}</Text>
                  </HStack>
                ))}
              </HStack>
            </Card>

            {/* Right rail: channels + upcoming */}
            <VStack gap={4}>
              <Card className="reveal-2" padding={4}>
                <HStack justify="between" align="center" style={{ marginBottom: 12 }}>
                  <Text type="body" weight="bold" size="sm">Channels</Text>
                  <Button label="+ Connect" variant="secondary" size="sm" onClick={() => setPickerOpen(true)} />
                </HStack>
                {!channels.length && (
                  <Text type="body" size="sm" color="secondary" display="block" style={{ lineHeight: 1.55 }}>
                    No channels yet. Connect your first social account to start scheduling.
                  </Text>
                )}
                {channels.map((ch) => (
                  <HStack key={ch.id} gap={2} align="center" style={{ padding: '7px 0' }}>
                    {ch.picture
                      ? <Avatar src={ch.picture} name={ch.name || pName(ch.platform)} size={32} />
                      : <PlatformBadge platform={ch.platform} />}
                    <VStack gap={0} style={{ minWidth: 0, flex: 1 }}>
                      <Text type="body" size="sm" weight="bold" maxLines={1}>{ch.name || pName(ch.platform)}</Text>
                      <Text type="supporting" size="xsm" color={ch.status === 'active' ? 'secondary' : 'accent'}>
                        {pName(ch.platform)}{ch.status !== 'active' ? ' · needs reconnect' : ''}
                      </Text>
                    </VStack>
                    <IconButton
                      label="Disconnect"
                      variant="ghost"
                      size="sm"
                      icon={<span style={{ fontSize: 14 }}>✕</span>}
                      onClick={() => disconnect(ch)}
                    />
                  </HStack>
                ))}
                {connecting && (
                  <HStack gap={2} align="center" style={{ marginTop: 8 }}>
                    <span className="droplet-wobble" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--brand)' }} />
                    <Text type="supporting" size="xsm" color="secondary">
                      Connecting {pName(connecting)}… finish in the popup
                    </Text>
                  </HStack>
                )}
              </Card>

              <Card className="reveal-3" padding={4}>
                <Text type="body" weight="bold" size="sm" display="block" style={{ marginBottom: 10 }}>Up next</Text>
                {!upcoming.length && (
                  <Text type="body" size="sm" color="secondary">Nothing scheduled yet.</Text>
                )}
                {upcoming.map((p) => (
                  <button key={p.id} type="button" onClick={() => setDetailPost(p)} style={{
                    display: 'flex', gap: 9, width: '100%', textAlign: 'left', padding: '7px 0',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                  }}>
                    {p.media?.[0]?.url && <MediaThumb url={p.media[0].url} isVideo={p.media[0].type === 'video'} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--glass-border)', display: 'block' }} />}
                    <VStack gap={0} style={{ minWidth: 0 }}>
                      <Text type="body" size="sm" weight="bold" maxLines={1}>{p.content || 'Media post'}</Text>
                      <Text type="supporting" size="xsm" color="secondary">{fmtDay(p.scheduled_at)} · {fmtTime(p.scheduled_at)}</Text>
                    </VStack>
                  </button>
                ))}
              </Card>
            </VStack>
          </div>
        )}
      </div>

      {/* Platform picker */}
      {pickerOpen && (
        <Dialog
          isOpen
          onOpenChange={(open) => { if (!open) setPickerOpen(false) }}
          purpose="info"
          width={430}
          padding={0}
        >
          <Layout
            height="auto"
            header={
              <DialogHeader
                title="Connect a channel"
                subtitle="You’ll sign in to the platform in a popup — Vymotion never sees your password."
                onOpenChange={(open) => { if (!open) setPickerOpen(false) }}
                hasDivider
              />
            }
            content={
              <LayoutContent padding={4} isScrollable={false}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {connectable.filter((p) => PLATFORMS[p]).map((p) => (
                    <Button
                      key={p}
                      label={pName(p)}
                      variant="secondary"
                      size="md"
                      icon={<PlatformBadge platform={p} size={26} />}
                      onClick={() => startConnect(p)}
                      style={{ justifyContent: 'flex-start' }}
                    />
                  ))}
                </div>
                <Text type="supporting" size="xsm" color="secondary" display="block" style={{ marginTop: 14, lineHeight: 1.5 }}>
                  Instagram, TikTok and YouTube are coming soon — platform approvals are in progress.
                </Text>
              </LayoutContent>
            }
          />
        </Dialog>
      )}

      {/* Composer */}
      {composerOpen && (
        <Composer
          channels={channels.filter((c) => c.status === 'active')}
          initialMedia={params.get('media')}
          initialMediaType={params.get('mediaType')}
          onClose={() => setComposerOpen(false)}
          onCreated={() => { setComposerOpen(false); loadPosts(); showToast('Post saved') }}
        />
      )}

      {/* Post detail */}
      {detailPost && (
        <PostDetail
          post={detailPost}
          onClose={() => setDetailPost(null)}
          onChanged={() => { setDetailPost(null); loadPosts() }}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="reveal" style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999,
          padding: '11px 22px', fontSize: 13.5, fontWeight: 700, boxShadow: 'var(--shadow-md)',
          color: 'var(--text-primary)', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <style>{`@media (max-width: 900px) { .publish-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
    </AstryxScope>
  )
}

// ── Composer modal ───────────────────────────────────────────────────────

function Composer({ channels, initialMedia, initialMediaType, onClose, onCreated }) {
  const press = pressHandlers(0.95)
  const [influencers] = useInfluencers()
  const [selected, setSelected] = useState([])
  const [content, setContent] = useState('')
  const [media, setMedia] = useState(initialMedia ? [initialMedia] : [])
  const [when, setWhen] = useState(() => {
    // datetime-local wants LOCAL wall-clock time — toISOString() would shift to UTC.
    const d = new Date(Date.now() + 3600_000)
    d.setMinutes(0, 0, 0)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
  })
  const [busy, setBusy] = useState(null) // 'now' | 'schedule' | 'draft'
  const [error, setError] = useState(null)
  const [libOpen, setLibOpen] = useState(false)

  // Publishable media = server-hosted public assets (blob:/data: URLs can't be
  // fetched by the publishing service).
  const library = useMemo(() => {
    const items = []
    try {
      for (const p of JSON.parse(localStorage.getItem('photo_studio_history') || '[]')) {
        if (p.url) items.push({ url: p.url, type: 'image', date: p.createdAt || 0, influencerId: p.influencerId || null })
      }
    } catch { /* corrupt LS entry */ }
    for (const inf of influencers || []) {
      for (const g of inf.generationHistory || []) if (g.url) items.push({ url: g.url, type: g.type === 'video' ? 'video' : 'image', date: g.date || 0, influencerId: inf.id })
    }
    return items
      .filter((i) => i.url.includes('/public/'))
      .sort((a, b) => (b.date || 0) - (a.date || 0))
      .slice(0, 60)
  }, [influencers])

  // Which selected/library URLs are videos — generated video URLs have no extension to
  // sniff, so we track them explicitly (from the library type + the ?mediaType hand-off).
  const videoUrls = useMemo(() => {
    const s = new Set()
    if (initialMedia && initialMediaType === 'video') s.add(initialMedia)
    for (const it of library) if (it.type === 'video') s.add(it.url)
    return s
  }, [library, initialMedia, initialMediaType])
  const isVid = (url) => videoUrls.has(url)

  // Which influencer this post is about — so the AI caption speaks in their voice. Inferred from
  // the attached media (library items carry influencerId); the user can override via the small
  // persona picker when they have more than one. Always resolves to a specific persona.
  const [captionInfId, setCaptionInfId] = useState(null)
  const urlToInfId = useMemo(() => {
    const m = new Map()
    for (const it of library) if (it.influencerId) m.set(it.url, it.influencerId)
    return m
  }, [library])
  const activeInfluencer = useMemo(() => {
    const list = influencers || []
    if (!list.length) return null
    const inferred = media.map((u) => urlToInfId.get(u)).find(Boolean)
    return list.find((i) => i.id === (captionInfId || inferred)) || list[0]
  }, [influencers, media, urlToInfId, captionInfId])
  const captionPlatforms = useMemo(
    () => selected.map((id) => channels.find((c) => c.id === id)?.platform).filter(Boolean).map(pName),
    [selected, channels],
  )
  const captionImage = media.find((u) => !isVid(u)) || null

  function toggleChannel(id) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  }

  async function submit(type) {
    setError(null)
    if (!selected.length) { setError('Pick at least one channel.'); return }
    if (!content.trim() && !media.length) { setError('Write a caption or add media.'); return }
    if (type === 'schedule' && new Date(when).getTime() < Date.now()) { setError('Pick a time in the future.'); return }
    setBusy(type)
    try {
      await api.social.createPost({
        type,
        date: type === 'schedule' ? new Date(when).toISOString() : undefined,
        content: content.trim(),
        media,
        channels: selected.map((channel_id) => ({ channel_id })),
      })
      onCreated()
    } catch (e) {
      setError(e?.code === 'date_in_past' ? 'Pick a time in the future.'
        : e?.code === 'empty_post' ? 'Write a caption or add media.'
        : 'Couldn’t save the post — please try again.')
      setBusy(null)
    }
  }

  return (
    <div style={{ ...glassOverlay, position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="reveal" style={{ ...glassModal, width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>New post</h3>

        {/* Channels */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 7 }}>Post to</div>
        {!channels.length && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No active channels — connect one first.</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
          {channels.map((ch) => {
            const on = selected.includes(ch.id)
            return (
              <button key={ch.id} onClick={() => toggleChannel(ch.id)} style={{
                ...glassChip,
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px 6px 7px',
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)',
                border: `1px solid ${on ? 'var(--brand)' : 'var(--border-subtle)'}`,
                background: on ? 'var(--accent-light)' : 'var(--bg-tertiary)',
              }}>
                <PlatformBadge platform={ch.platform} size={22} />
                {ch.name || pName(ch.platform)}
              </button>
            )
          })}
        </div>

        {/* Caption */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Caption</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(influencers?.length || 0) > 1 && (
              <select
                value={activeInfluencer?.id || ''}
                onChange={(e) => setCaptionInfId(e.target.value)}
                title="Whose voice to write in"
                style={{ ...glassInput, fontSize: 11.5, fontWeight: 600, padding: '4px 6px', maxWidth: 132, color: 'var(--text-secondary)' }}
              >
                {(influencers || []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            )}
            <AIAssist
              purpose="caption"
              label="Write"
              title="Write a caption with AI"
              context={{
                influencer: activeInfluencer,
                platforms: captionPlatforms,
                hasImage: !!captionImage,
                mediaType: media.length ? (captionImage ? 'image' : 'video') : 'none',
              }}
              images={captionImage ? [captionImage] : []}
              draft={content}
              onAccept={setContent}
            />
          </div>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Write your caption…"
          style={{ ...glassInput, width: '100%', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }}
        />

        {/* Media */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 7 }}>Media</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {media.map((url) => (
            <div key={url} style={{ position: 'relative' }}>
              <MediaThumb url={url} isVideo={isVid(url)} showBadge style={{ width: 74, height: 74, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--glass-border)', display: 'block' }} />
              <button onClick={() => setMedia((m) => m.filter((u) => u !== url))} style={{
                position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 999,
                border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                fontSize: 11, cursor: 'pointer', lineHeight: 1,
              }}>✕</button>
            </div>
          ))}
          <button {...press} onClick={() => setLibOpen((o) => !o)} style={{
            ...glassBtnGhost, width: 74, height: 74, borderRadius: 10, fontSize: 22, fontWeight: 400,
          }}>{libOpen ? '−' : '+'}</button>
        </div>
        {libOpen && (
          <div style={{ ...glassCard, padding: 10, marginBottom: 16, maxHeight: 220, overflowY: 'auto' }}>
            {!library.length && <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 4 }}>No publishable media yet — generate some photos first.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 6 }}>
              {library.map((item) => (
                <button key={item.url} onClick={() => { setMedia((m) => m.includes(item.url) ? m : [...m, item.url]); }} style={{
                  padding: 0, border: media.includes(item.url) ? '2px solid var(--brand)' : '1px solid var(--glass-border)',
                  borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: 'transparent', aspectRatio: '1', position: 'relative',
                }}>
                  <MediaThumb url={item.url} isVideo={item.type === 'video'} showBadge style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schedule time */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 7 }}>Schedule for</div>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          style={{ ...glassInput, padding: '9px 12px', fontSize: 13.5, fontFamily: 'inherit', marginBottom: 18, colorScheme: 'dark light' }}
        />

        {error && <div style={{ fontSize: 13, color: '#FF3D8B', fontWeight: 600, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button {...press} onClick={onClose} style={{ ...glassBtnGhost, padding: '9px 18px', fontSize: 13.5 }}>Cancel</button>
          <button {...press} disabled={!!busy} onClick={() => submit('draft')} style={{ ...glassBtnGhost, padding: '9px 18px', fontSize: 13.5, opacity: busy ? 0.6 : 1 }}>
            {busy === 'draft' ? 'Saving…' : 'Save draft'}
          </button>
          <button {...press} disabled={!!busy} onClick={() => submit('now')} style={{ ...glassBtnGhost, padding: '9px 18px', fontSize: 13.5, opacity: busy ? 0.6 : 1 }}>
            {busy === 'now' ? 'Posting…' : 'Post now'}
          </button>
          <button {...press} disabled={!!busy} onClick={() => submit('schedule')} style={{ ...glassBtnPrimary, padding: '9px 20px', fontSize: 13.5, opacity: busy ? 0.6 : 1 }}>
            {busy === 'schedule' ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post detail modal ────────────────────────────────────────────────────

function PostDetail({ post, onClose, onChanged, showToast }) {
  const press = pressHandlers(0.95)
  const [busy, setBusy] = useState(false)

  async function act(fn, failMsg) {
    setBusy(true)
    try { await fn(); onChanged() }
    catch { showToast(failMsg); setBusy(false) }
  }

  return (
    <div style={{ ...glassOverlay, position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="reveal" style={{ ...glassModal, width: 'min(460px, 100%)', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: STATE_COLORS[post.state] || 'var(--text-secondary)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
            {post.state === 'error' ? 'Needs attention' : post.state}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--text-secondary)' }}>{fmtDay(post.scheduled_at)} · {fmtTime(post.scheduled_at)}</span>
        </div>

        {post.media?.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {post.media.map((m) => <MediaThumb key={m.url || m.path} url={m.url || m.path} isVideo={m.type === 'video'} showBadge style={{ width: 84, height: 84, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--glass-border)', display: 'block' }} />)}
          </div>
        )}
        {post.content && <p style={{ fontSize: 14, lineHeight: 1.55, margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>{post.content}</p>}

        {post.state === 'error' && (
          <p style={{ fontSize: 13, color: '#FF3D8B', margin: '0 0 14px' }}>This post didn’t go out. Delete it and try again, or check that the channel is still connected.</p>
        )}

        {post.release_urls?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            {post.release_urls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 13, color: 'var(--brand)', fontWeight: 700, textDecoration: 'none', marginBottom: 4 }}>
                View published post ↗
              </a>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button {...press} disabled={busy} onClick={() => act(() => api.social.deletePost(post.id), 'Couldn’t delete — try again')} style={{ ...glassBtnGhost, padding: '8px 16px', fontSize: 13, color: '#FF3D8B', opacity: busy ? 0.6 : 1 }}>Delete</button>
          {post.state === 'scheduled' && (
            <button {...press} disabled={busy} onClick={() => act(() => api.social.updatePost(post.id, 'draft'), 'Couldn’t update — try again')} style={{ ...glassBtnGhost, padding: '8px 16px', fontSize: 13, opacity: busy ? 0.6 : 1 }}>Move to drafts</button>
          )}
          {post.state === 'draft' && (
            <button {...press} disabled={busy} onClick={() => act(() => api.social.updatePost(post.id, 'schedule'), 'Couldn’t update — try again')} style={{ ...glassBtnPrimary, padding: '8px 18px', fontSize: 13, opacity: busy ? 0.6 : 1 }}>Schedule</button>
          )}
          <button {...press} onClick={onClose} style={{ ...glassBtnGhost, padding: '8px 16px', fontSize: 13 }}>Close</button>
        </div>
      </div>
    </div>
  )
}
