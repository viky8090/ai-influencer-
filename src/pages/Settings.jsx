import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { startHiggsfieldOAuthPopup, disconnectHF, isHFConnected } from '../utils/higgsfieldAuth'
import { useTheme } from '../context/theme'
import { usePreferences } from '../store'
import {
  PageShell, SectionCard, Row, Button, Toggle, Segmented, Field, TextInput,
  Badge, ConfirmDialog, useToast,
} from '../components/ui'
import {
  IconPalette, IconPlug, IconSparkles, IconInfo, IconSun, IconMoon, IconKey,
  IconExternal, IconShield, IconCheck, IconImage,
} from '../components/icons'

const CLAUDE_KEY = 'claude_api_key'

const SECTIONS = [
  { id: 'appearance',  label: 'Appearance',  Icon: IconPalette },
  { id: 'connections', label: 'Connections', Icon: IconPlug },
  { id: 'generation',  label: 'Generation',  Icon: IconSparkles },
  { id: 'about',       label: 'About',       Icon: IconInfo },
]

// ── Sidebar ───────────────────────────────────────────────────────

function SettingsNav({ active, onJump }) {
  return (
    <nav className="account-sidebar" aria-label="Settings sections">
      {SECTIONS.map(({ id, label, Icon }) => {
        const on = id === active
        return (
          <button
            key={id}
            type="button"
            className="focus-ring"
            onClick={() => onJump(id)}
            aria-current={on ? 'true' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', marginBottom: 2, borderRadius: 10,
              fontSize: 14, fontWeight: on ? 650 : 500, fontFamily: 'inherit',
              textAlign: 'left',
              color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: on ? 'var(--surface-hover)' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <Icon size={17} style={{ opacity: on ? 0.9 : 0.6, flexShrink: 0 }} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

// A connection row shared by Higgsfield and Claude: status on the left,
// its one meaningful action on the right.
function ConnectionRow({ icon, name, description, connected, detail, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 20, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', flex: '1 1 260px', minWidth: 0 }}>
        <span style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
        }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 650 }}>{name}</span>
            <Badge tone={connected ? 'success' : 'neutral'} dot>
              {connected ? 'Connected' : 'Not connected'}
            </Badge>
            {connected && detail && (
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'ui-monospace, monospace' }}>
                {detail}
              </span>
            )}
          </div>
          <p style={{ marginTop: 5, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{children}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function Settings() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { theme, toggle } = useTheme()
  const { preferences, updatePreferences } = usePreferences()

  const [hfConnected, setHfConnected] = useState(isHFConnected)
  const [hfLoading, setHfLoading] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem(CLAUDE_KEY) || '')
  const [claudeInput, setClaudeInput] = useState('')
  const [editingClaude, setEditingClaude] = useState(false)

  const [active, setActive] = useState(SECTIONS[0].id)
  const sectionRefs = useRef({})

  // OAuth returns to /settings?connected=1 — reflect that immediately.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('connected') === '1') {
      setHfConnected(true)
    }
  }, [location.search])

  const jumpTo = useCallback(id => {
    const el = sectionRefs.current[id]
    if (!el) return
    setActive(id)
    el.scrollIntoView({ behavior: preferences.reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [preferences.reduceMotion])

  // Deep links from elsewhere in the app (the account menu uses
  // /settings#connections) should land on the right section.
  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (!id || !SECTIONS.some(s => s.id === id)) return
    // Wait a frame so the sections have laid out before scrolling.
    const raf = requestAnimationFrame(() => jumpTo(id))
    return () => cancelAnimationFrame(raf)
  }, [location.hash, jumpTo])

  // Highlight whichever section is currently nearest the top of the viewport.
  useEffect(() => {
    const nodes = SECTIONS.map(s => sectionRefs.current[s.id]).filter(Boolean)
    if (!nodes.length || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target?.id) setActive(visible[0].target.id)
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: 0 }
    )
    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [])

  async function connectHiggsfield() {
    setHfLoading(true)
    try {
      await startHiggsfieldOAuthPopup()
      setHfConnected(true)
      toast('Higgsfield connected')
    } catch (e) {
      if (e.message !== 'cancelled') toast(`Could not connect Higgsfield: ${e.message}`, 'danger')
    } finally {
      setHfLoading(false)
    }
  }

  function doDisconnect() {
    disconnectHF()
    setHfConnected(false)
    setConfirmDisconnect(false)
    toast('Higgsfield disconnected', 'neutral')
  }

  function saveClaudeKey() {
    const key = claudeInput.trim()
    if (!key) return
    try {
      localStorage.setItem(CLAUDE_KEY, key)
    } catch {
      toast('Browser storage is full — could not save the key.', 'danger')
      return
    }
    setClaudeKey(key)
    setClaudeInput('')
    setEditingClaude(false)
    toast('Claude API key saved')
  }

  function removeClaudeKey() {
    localStorage.removeItem(CLAUDE_KEY)
    setClaudeKey('')
    setClaudeInput('')
    setEditingClaude(false)
    toast('Claude API key removed', 'neutral')
  }

  // Anthropic keys all start with this prefix; flag a likely paste error
  // without blocking anyone whose key legitimately looks different.
  const claudeLooksWrong = claudeInput.trim().length > 0 && !claudeInput.trim().startsWith('sk-ant-')

  const registerSection = id => el => { sectionRefs.current[id] = el }

  const prefsSummary = useMemo(() => (
    `${preferences.defaultAspectRatio} · ${preferences.defaultResolution.toUpperCase()} · ${preferences.defaultOutputCount} per run`
  ), [preferences])

  return (
    <PageShell
      title="Settings"
      subtitle="How the studio looks, what it's connected to, and where new generations start. Everything here is saved in this browser."
      maxWidth={1060}
    >
      <div className="account-shell">
        <SettingsNav active={active} onJump={jumpTo} />

        <div style={{ minWidth: 0 }}>
          {/* ── Appearance ── */}
          <div ref={registerSection('appearance')} id="appearance" style={{ scrollMarginTop: 'calc(var(--nav-h) + 24px)' }}>
            <SectionCard
              title="Appearance"
              description="Applies to this browser only."
            >
              <Row
                title="Theme"
                description="Dark is the default. The switch in the top bar does the same thing."
                control={
                  <Segmented
                    ariaLabel="Colour theme"
                    value={theme}
                    onChange={value => { if (value !== theme) toggle() }}
                    options={[
                      { value: 'light', label: 'Light', icon: <IconSun size={15} /> },
                      { value: 'dark',  label: 'Dark',  icon: <IconMoon size={14} /> },
                    ]}
                  />
                }
              />

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '20px 0' }} />

              <Row
                title="Reduce motion"
                description="Turns off the ink-splash theme transition, hover lifts, and other animation across the app."
                control={
                  <Toggle
                    label="Reduce motion"
                    checked={preferences.reduceMotion}
                    onChange={value => {
                      updatePreferences({ reduceMotion: value })
                      toast(value ? 'Motion reduced' : 'Motion restored', 'neutral')
                    }}
                  />
                }
              />
            </SectionCard>
          </div>

          {/* ── Connections ── */}
          <div ref={registerSection('connections')} id="connections" style={{ scrollMarginTop: 'calc(var(--nav-h) + 24px)' }}>
            <SectionCard
              title="Connections"
              description="Generation runs on your own accounts, so nothing here is billed by this app."
              footer="Both connections are stored only in this browser. Backups never include them."
            >
              <ConnectionRow
                icon={<IconSparkles size={19} />}
                name="Higgsfield"
                description="Required for every image and video. Generations use your own Higgsfield credits."
                connected={hfConnected}
              >
                {hfConnected ? (
                  <Button variant="danger" size="sm" onClick={() => setConfirmDisconnect(true)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button variant="primary" onClick={connectHiggsfield} loading={hfLoading}>
                    {hfLoading ? 'Connecting…' : 'Connect Higgsfield'}
                  </Button>
                )}
              </ConnectionRow>

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '20px 0' }} />

              <ConnectionRow
                icon={<IconKey size={18} />}
                name="Claude"
                description="Optional. Lets Claude read your reference image before it writes a product character sheet."
                connected={!!claudeKey}
                detail={claudeKey ? `···${claudeKey.slice(-4)}` : null}
              >
                {claudeKey ? (
                  <Button variant="danger" size="sm" onClick={removeClaudeKey}>Remove</Button>
                ) : editingClaude ? (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingClaude(false); setClaudeInput('') }}>
                    Cancel
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setEditingClaude(true)}>Add API key</Button>
                )}
              </ConnectionRow>

              {!claudeKey && editingClaude && (
                <div style={{ marginTop: 16, paddingLeft: 51 }}>
                  <Field
                    label="Anthropic API key"
                    htmlFor="claude-key"
                    error={claudeLooksWrong ? "Anthropic keys usually start with “sk-ant-” — double-check the paste." : null}
                    hint={claudeLooksWrong ? null : 'Stored in this browser and sent only to Anthropic, through this app’s proxy.'}
                  >
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <TextInput
                        id="claude-key"
                        autoFocus
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        value={claudeInput}
                        onChange={e => setClaudeInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveClaudeKey() }}
                        placeholder="sk-ant-..."
                        style={{ flex: '1 1 240px', fontFamily: 'ui-monospace, monospace' }}
                      />
                      <Button variant="primary" onClick={saveClaudeKey} disabled={!claudeInput.trim()}>
                        Save
                      </Button>
                    </div>
                  </Field>
                  <div style={{ marginTop: 10 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      icon={<IconExternal size={14} />}
                    >
                      Get a key from the Anthropic Console
                    </Button>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Generation ── */}
          <div ref={registerSection('generation')} id="generation" style={{ scrollMarginTop: 'calc(var(--nav-h) + 24px)' }}>
            <SectionCard
              title="Generation defaults"
              description="Where Photo Studio starts for an influencer you haven't shot yet. Changing a setting inside Photo Studio still overrides this per influencer."
              footer={`New influencers start at ${prefsSummary}.`}
            >
              <Row
                title="Aspect ratio"
                description="Portrait suits Reels and Stories; square suits a grid post."
                control={
                  <Segmented
                    ariaLabel="Default aspect ratio"
                    value={preferences.defaultAspectRatio}
                    onChange={value => updatePreferences({ defaultAspectRatio: value })}
                    options={[
                      { value: '9:16', label: '9:16' },
                      { value: '1:1',  label: '1:1' },
                    ]}
                  />
                }
              />

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '20px 0' }} />

              <Row
                title="Resolution"
                description="4K is sharper and slower. 2K is usually enough for social."
                control={
                  <Segmented
                    ariaLabel="Default resolution"
                    value={preferences.defaultResolution}
                    onChange={value => updatePreferences({ defaultResolution: value })}
                    options={[
                      { value: '2k', label: '2K' },
                      { value: '4k', label: '4K' },
                    ]}
                  />
                }
              />

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '20px 0' }} />

              <Row
                align="flex-start"
                title="Images per run"
                description="More variations per run costs proportionally more Higgsfield credits."
                icon={<IconImage size={17} />}
                control={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={preferences.defaultOutputCount}
                      aria-label="Default images per run"
                      onChange={e => updatePreferences({ defaultOutputCount: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: '#8B5CF6', cursor: 'pointer' }}
                    />
                    <span style={{
                      minWidth: 26, textAlign: 'right',
                      fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {preferences.defaultOutputCount}
                    </span>
                  </div>
                }
              />
            </SectionCard>
          </div>

          {/* ── About ── */}
          <div ref={registerSection('about')} id="about" style={{ scrollMarginTop: 'calc(var(--nav-h) + 24px)' }}>
            <SectionCard
              title="About"
              description="Influencer Studio is local-first: there is no account server and no password. Everything you make lives in this browser."
            >
              <Row
                icon={<IconShield size={17} />}
                title="Manage your account data"
                description="Storage usage, backups, and deleting everything."
                control={<Button variant="secondary" size="sm" onClick={() => navigate('/account')}>Open</Button>}
              />

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '20px 0' }} />

              <Row
                icon={<IconCheck size={17} />}
                title="Your profile"
                description="The name, handle, and photo shown in the top bar."
                control={<Button variant="secondary" size="sm" onClick={() => navigate('/profile')}>Edit</Button>}
              />

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '20px 0' }} />

              <Row
                icon={<IconInfo size={17} />}
                title="Help and feedback"
                description="Report a bug, ask a question, or read the prompt guides."
                control={<Button variant="secondary" size="sm" onClick={() => navigate('/community')}>Open</Button>}
              />
            </SectionCard>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect Higgsfield?"
        description="Image and video generation will stop working until you reconnect. Nothing you have already made is deleted."
        confirmLabel="Disconnect"
        tone="danger"
        onConfirm={doDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </PageShell>
  )
}
