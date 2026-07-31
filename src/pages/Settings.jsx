import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/react'
import { Sun, Moon } from 'lucide-react'
import {
  Card,
  Text,
  Button,
  TextInput,
  TextArea,
  Selector,
  Badge,
  Avatar,
  SegmentedControl,
  SegmentedControlItem,
  VStack,
  HStack,
  Divider,
} from '@astryxdesign/core'
import { useTheme } from '../context/theme'
import { api } from '../api/client'
import { useCredits } from '../api/creditsStore'
import AstryxScope from '../ui/ax/AstryxScope'
import RouterLink from '../ui/ax/RouterLink'
import { useSEO } from '../ui/seo'

// Side-label sections — title in a left rail; fields sit right.
// Stacks to a single column ≤760px (.vy-side-section CSS).
function Section({ title, children }) {
  return (
    <Card
      className="reveal vy-side-section"
      padding={0}
      style={{ overflow: 'hidden', marginBottom: 16 }}
    >
      <div className="vy-side-label" style={{ padding: '22px 20px', borderRight: '1px solid var(--border-subtle)' }}>
        <Text
          type="supporting"
          size="xsm"
          weight="bold"
          color="secondary"
          style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
        >
          {title}
        </Text>
      </div>
      <div style={{ padding: '20px 24px', minWidth: 0 }}>{children}</div>
    </Card>
  )
}

const MODELS = [
  { value: '', label: '—' },
  { value: 'soul_2', label: 'soul_2' },
  { value: 'gpt_image_2', label: 'gpt_image_2' },
  { value: 'nano_banana_2', label: 'nano_banana_2' },
  { value: 'nano_banana_flash', label: 'nano_banana_flash' },
  { value: 'seedance_2_0', label: 'seedance_2_0' },
]
const ASPECTS = [
  { value: '', label: '—' },
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
  { value: '3:2', label: '3:2' },
]
const RESOLUTIONS = [
  { value: '', label: '—' },
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
]

// Server-backed profile editor (PRD §9.2, §9.3). Persists to D1 via PATCH /api/me.
function AccountSection() {
  const { isLoaded, isSignedIn, user } = useUser()
  const clerk = useClerk()
  const [form, setForm] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | saving | saved | error
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alive = true
    setStatus('loading')
    api.me()
      .then((me) => {
        if (!alive) return
        setForm({
          display_name: me.display_name || '',
          handle: me.handle || '',
          bio: me.bio || '',
          default_model: me.defaults?.model || '',
          default_aspect: me.defaults?.aspect || '',
          default_resolution: me.defaults?.resolution || '',
        })
        setStatus('idle')
      })
      .catch(() => { if (alive) setStatus('error') })
    return () => { alive = false }
  }, [isLoaded, isSignedIn])

  if (!isLoaded) return null
  if (!isSignedIn) {
    return (
      <Section title="Account">
        <Text type="body" size="sm" color="secondary" display="block">
          Sign in (top-right) to manage your Vymotion profile, credits, and account.
        </Text>
      </Section>
    )
  }

  async function save() {
    setStatus('saving'); setError('')
    try {
      const saved = await api.updateMe(form)
      setForm((f) => ({ ...f, handle: saved.handle || '' }))
      setStatus('saved')
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000)
    } catch (e) {
      setError(
        e.code === 'handle_taken' ? 'That handle is already taken.'
          : e.code === 'invalid_handle' ? 'Handle must be 3–30 chars: a–z, 0–9, underscore.'
            : 'Could not save — please try again.',
      )
      setStatus('error')
    }
  }

  const email = user?.primaryEmailAddress?.emailAddress || ''

  return (
    <Section title="Account">
      <HStack justify="between" align="center" gap={3} style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        <HStack gap={2} align="center">
          <Avatar src={user?.imageUrl || undefined} name={email || 'You'} size={36} />
          <VStack gap={0}>
            <Text type="body" size="sm" weight="semibold">{email}</Text>
            <Text type="supporting" size="xsm" color="secondary">Signed in with Clerk</Text>
          </VStack>
        </HStack>
        <Button
          label="Manage sign-in & security"
          variant="secondary"
          size="sm"
          onClick={() => clerk.openUserProfile()}
        />
      </HStack>

      {!form ? (
        <Text type="body" size="sm" color="secondary">
          {status === 'error' ? 'Could not load your profile.' : 'Loading…'}
        </Text>
      ) : (
        <VStack gap={3}>
          <TextInput
            label="Display name"
            value={form.display_name}
            onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
            placeholder="Your name"
            width="100%"
          />
          <TextInput
            label="Handle"
            value={form.handle}
            onChange={(v) => setForm((f) => ({ ...f, handle: v }))}
            placeholder="yourhandle"
            width="100%"
            status={status === 'error' && error ? { type: 'error', message: error } : undefined}
          />
          <TextArea
            label="Bio"
            value={form.bio}
            onChange={(v) => setForm((f) => ({ ...f, bio: v }))}
            placeholder="A short bio"
            width="100%"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }} className="settings-defaults-grid">
            <Selector
              label="Default model"
              options={MODELS}
              value={form.default_model}
              onChange={(v) => setForm((f) => ({ ...f, default_model: v ?? '' }))}
              width="100%"
            />
            <Selector
              label="Aspect"
              options={ASPECTS}
              value={form.default_aspect}
              onChange={(v) => setForm((f) => ({ ...f, default_aspect: v ?? '' }))}
              width="100%"
            />
            <Selector
              label="Resolution"
              options={RESOLUTIONS}
              value={form.default_resolution}
              onChange={(v) => setForm((f) => ({ ...f, default_resolution: v ?? '' }))}
              width="100%"
            />
          </div>

          <HStack gap={3} align="center">
            <Button
              label={status === 'saving' ? 'Saving…' : 'Save profile'}
              variant="primary"
              size="md"
              isLoading={status === 'saving'}
              isDisabled={status === 'saving'}
              onClick={save}
            />
            {status === 'saved' && <Badge label="Saved ✓" variant="success" />}
            {status === 'error' && error && <Badge label={error} variant="error" />}
          </HStack>
        </VStack>
      )}
    </Section>
  )
}

// Billing surface (FR-B9): current plan + credit balance, Polar portal, pricing.
function BillingSection() {
  const { isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const { bal: balance, total: creditTotal } = useCredits()
  const [portalBusy, setPortalBusy] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alive = true
    api.billing.plan().then((p) => { if (alive) setPlan(p) }).catch(() => {})
    return () => { alive = false }
  }, [isLoaded, isSignedIn])

  if (!isLoaded || !isSignedIn) return null

  const planName = plan ? plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1) : '…'
  const sub = plan?.subscription
  const renews = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  async function openPortal() {
    setPortalBusy(true)
    try {
      const { url } = await api.billing.portal()
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      if (e.status === 404) alert('No purchases yet — your billing portal appears after your first checkout.')
      else alert('Billing portal isn’t available right now — please try again in a moment.')
    } finally {
      setPortalBusy(false)
    }
  }

  return (
    <Section title="Plan & billing">
      <VStack gap={3}>
        <VStack gap={0.5}>
          <HStack gap={2} align="center" style={{ flexWrap: 'wrap' }}>
            <Text type="body" weight="bold">{planName} plan</Text>
            {sub?.cancel_at_period_end ? (
              <Badge label={`ends ${renews || 'at period end'}`} variant="warning" />
            ) : renews ? (
              <Badge label={`renews ${renews}`} variant="neutral" />
            ) : null}
          </HStack>
          <Text type="supporting" size="sm" color="secondary">
            {creditTotal != null
              ? <>Balance <Text type="body" size="sm" weight="bold" display="inline" color="primary">{creditTotal}</Text> credits ({balance?.subscription_vc ?? 0} plan · {balance?.topup_vc ?? 0} top-up)</>
              : 'Loading balance…'}
          </Text>
        </VStack>
        <HStack gap={2} style={{ flexWrap: 'wrap' }}>
          <Button label="Plans & credit packs" variant="primary" size="sm" onClick={() => navigate('/pricing')} />
          <Button
            label={portalBusy ? 'Opening…' : 'Manage billing & invoices'}
            variant="secondary"
            size="sm"
            isLoading={portalBusy}
            isDisabled={portalBusy}
            onClick={openPortal}
          />
          <Button label="Usage history" variant="secondary" size="sm" onClick={() => navigate('/usage')} />
        </HStack>
      </VStack>
    </Section>
  )
}

// Connected social channels (PRD N13) — read-only; management lives on /publish.
function ChannelsSection() {
  const { isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', channels: [] })

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    api.social.channels()
      .then((r) => setState({ status: 'ok', channels: r.channels }))
      .catch((e) => setState({ status: e?.code || 'unavailable', channels: [] }))
  }, [isLoaded, isSignedIn])

  if (!isLoaded || !isSignedIn) return null

  return (
    <Section title="Social channels">
      {state.status === 'loading' && (
        <Text type="body" size="sm" color="secondary">Loading…</Text>
      )}
      {state.status === 'plan_required' && (
        <Text type="body" size="sm" color="secondary" display="block">
          Publishing to social channels is included on Starter and above.{' '}
          <Button label="See plans →" variant="ghost" size="sm" onClick={() => navigate('/pricing')} style={{ display: 'inline-flex', verticalAlign: 'baseline' }} />
        </Text>
      )}
      {state.status === 'publishing_not_configured' && (
        <Text type="body" size="sm" color="secondary">Publishing is being set up — check back soon.</Text>
      )}
      {state.status === 'ok' && (
        <VStack gap={2}>
          {!state.channels.length && (
            <Text type="body" size="sm" color="secondary">No channels connected yet.</Text>
          )}
          {state.channels.map((ch) => (
            <HStack key={ch.id} gap={2} align="center">
              {ch.picture && (
                <Avatar src={ch.picture} name={ch.name || ch.platform} size={28} />
              )}
              <Text type="body" size="sm" weight="bold">{ch.name || ch.platform}</Text>
              <Text type="supporting" size="xsm" color="secondary">{ch.platform}</Text>
            </HStack>
          ))}
          <Button
            label="Manage on the Publish page →"
            variant="secondary"
            size="sm"
            onClick={() => navigate('/publish')}
          />
        </VStack>
      )}
    </Section>
  )
}

export default function Settings() {
  useSEO({ path: '/settings' })

  const { theme, toggle } = useTheme()

  return (
    <AstryxScope>
      <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'transparent' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px 70px' }}>
          <Text type="display-3" weight="bold" display="block" className="reveal" style={{ marginBottom: 28 }}>
            Settings
          </Text>

          <AccountSection />
          <BillingSection />
          <ChannelsSection />

          <Section title="Appearance">
            <SegmentedControl
              label="Theme"
              value={theme}
              onChange={(val) => {
                if (val !== theme) {
                  // Approximate click center for the liquid theme transition
                  const x = window.innerWidth / 2
                  const y = window.innerHeight / 2
                  toggle(x, y)
                }
              }}
              layout="fill"
              size="lg"
            >
              <SegmentedControlItem
                value="light"
                label="Light"
                icon={<Sun size={15} strokeWidth={2} aria-hidden />}
              />
              <SegmentedControlItem
                value="dark"
                label="Dark"
                icon={<Moon size={14} strokeWidth={2} aria-hidden />}
              />
            </SegmentedControl>
          </Section>

          <Section title="Help">
            <VStack gap={3}>
              <Text type="body" size="sm" color="secondary" display="block">
                Full product guide: every step, studio control, and credit rule.
              </Text>
              <Button
                label="Open documentation"
                variant="primary"
                size="sm"
                href="/docs"
                as={RouterLink}
              />
              <Divider variant="subtle" />
              <Text type="body" size="sm" color="secondary" display="block">
                Replay the first-time walkthrough: Camila as an example, Create, and credits.
              </Text>
              <Button
                label="Restart product tour"
                variant="secondary"
                size="sm"
                onClick={() => {
                  try { localStorage.removeItem('vy_onboarding_tour_v1') } catch { /* ignore */ }
                  window.dispatchEvent(new CustomEvent('vymotion:start-tour'))
                }}
              />
            </VStack>
          </Section>
        </div>
      </div>
      <style>{`
        @media (max-width: 560px) {
          .settings-defaults-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AstryxScope>
  )
}
