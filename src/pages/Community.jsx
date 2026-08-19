import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PageShell, SectionCard, Card, Button, Badge,
  ACCENT, GRADIENT, SUCCESS,
} from '../components/ui'
import {
  IconAlert, IconMessage, IconBook, IconSparkles, IconExternal,
  IconCheck, IconInfo, IconUsers,
} from '../components/icons'
import { useInfluencers } from '../store'
import { computeStats } from '../utils/accountStats'
import { isHFConnected } from '../utils/higgsfieldAuth'

/*
 * "Join community" — an honest one.
 *
 * There is no Discord, no Slack, no forum and no member directory behind
 * this project, so this page invents none of those. Everything linked here
 * is a place that genuinely exists: the GitHub repo, the feedback form, the
 * setup guide, the prompt docs in /docs, and Higgsfield itself. The
 * checklist at the bottom reads real local state rather than pretending.
 */

const REPO = 'https://github.com/DaanKieft/ai-influencer'
const ISSUES = `${REPO}/issues`
const DISCUSSIONS = `${REPO}/discussions`
const FEEDBACK = 'https://forms.gle/p5cBXw4sYaHPdcANA'
const HIGGSFIELD = 'https://higgsfield.ai'
const repoFile = name => `${REPO}/blob/main/${name}`

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const DESTINATIONS = [
  {
    href: ISSUES,
    icon: <IconAlert size={19} />,
    title: 'Report a bug or request a feature',
    description:
      'The one place where a problem gets tracked instead of forgotten. Open an issue, describe what you did and what happened, and it stays visible until it is closed.',
    cta: 'Open an issue',
  },
  {
    href: FEEDBACK,
    icon: <IconMessage size={19} />,
    title: 'Send feedback',
    description:
      'The quick option. No GitHub account, no login, about thirty seconds. Best for "this felt confusing" or "I wish it did X" — anything that is a reaction rather than a bug report.',
    cta: 'Open the form',
  },
  {
    href: REPO,
    icon: <IconBook size={19} />,
    title: 'Browse the source',
    description:
      'Every prompt template, every model parameter and every default in this app is readable code. If you want to know why a generation came out the way it did, the answer is in here.',
    cta: 'View the repository',
  },
  {
    href: HIGGSFIELD,
    icon: <IconSparkles size={19} />,
    title: 'Higgsfield',
    description:
      'Where the actual generation happens. Your account, your credits, your outputs — this app only sends the prompt. Check your balance or plan there, not here.',
    cta: 'Go to Higgsfield',
  },
  {
    href: DISCUSSIONS,
    icon: <IconUsers size={19} />,
    title: 'Discussions',
    description:
      'GitHub Discussions may or may not be turned on for this repo — it is a per-repo setting. If the link lands on a 404, use Issues instead; that one is always there.',
    cta: 'Try Discussions',
    tone: 'secondary',
  },
]

const SETUP_STEPS = [
  'Download the project from GitHub — the green Code button, then Download ZIP — and unzip it somewhere easy to find, like your Desktop.',
  'Install Antigravity from antigravity.dev. It is the only thing you install; everything else lives inside it.',
  'In Antigravity, choose File → Open Folder and pick the folder you just unzipped.',
  'Install the Claude Code extension from the Extensions panel, then sign in with your Anthropic account.',
  'Open a new terminal, type claude, and ask it to install everything and start the app.',
  'Open the local address it prints — usually localhost:5173 — then connect Higgsfield in Settings so generation runs on your own credits.',
]

const DOCS = [
  {
    file: 'gpt-image-2-engine.md',
    title: 'GPT Image 2 realism engine',
    blurb:
      'Turns a short brief — character, scene, optional pose — into a full sectioned GPT Image 2 prompt, with the granular skin-realism block, the anti-beauty-filter framing and the no-people-in-the-background rule already built in.',
  },
  {
    file: 'photo-studio-influencer-guide.md',
    title: 'Photo Studio prompt guide',
    blurb:
      'Photo Studio is an edit, not a generation: the references already carry the face and usually the outfit, so the prompt stays short and directive — placement, action and mood only, never a re-description of what the refs show.',
  },
  {
    file: 'seedance-influencer-guide.md',
    title: 'Seedance 2.0 video guide',
    blurb:
      'The long one. Shot families, the master template, dialogue and performance notation, duration and word-count budgets, lighting and camera language, plus a bug inventory written from generations that actually broke.',
  },
]

// ── Pieces ───────────────────────────────────────────────────────

function LinkCard({ icon, title, description, cta, href, tone }) {
  const [hover, setHover] = useState(false)
  const secondary = tone === 'secondary'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        height: '100%', minWidth: 0,
        padding: 20, borderRadius: 16, textDecoration: 'none',
        color: 'var(--text-primary)',
        background: secondary ? 'var(--bg-tertiary)' : 'var(--surface)',
        border: secondary ? '1px dashed var(--border)' : '1px solid var(--border-subtle)',
        boxShadow: secondary ? 'none' : hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s, border-color 0.18s',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: secondary ? 'var(--surface)' : 'rgba(139,92,246,0.11)',
          color: secondary ? 'var(--text-tertiary)' : ACCENT,
          border: '1px solid var(--border-subtle)',
        }}
      >
        {icon}
      </span>

      <h3 style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.2px', lineHeight: 1.35 }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        {description}
      </p>

      {/* Styled text, never a nested <a> — the whole card is the link. */}
      <span
        style={{
          marginTop: 'auto', paddingTop: 8,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 650,
          color: secondary ? 'var(--text-secondary)' : 'var(--text-primary)',
          textDecoration: hover ? 'underline' : 'none',
          textUnderlineOffset: 3,
        }}
      >
        {cta}
        <IconExternal size={13} stroke={2} />
      </span>
    </a>
  )
}

function SectionHeading({ id, title, description }) {
  return (
    <div id={id} style={{ marginBottom: 14, scrollMarginTop: 'calc(var(--nav-h) + 24px)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 650, letterSpacing: '-0.3px' }}>{title}</h2>
      {description && (
        <p style={{
          marginTop: 6, fontSize: 13.5, lineHeight: 1.6,
          color: 'var(--text-secondary)', maxWidth: 640,
        }}>
          {description}
        </p>
      )}
    </div>
  )
}

function NoteBar({ children }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      marginTop: 14, padding: '12px 14px', borderRadius: 12,
      background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
      fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)',
    }}>
      <span aria-hidden="true" style={{ color: 'var(--text-tertiary)', display: 'flex', marginTop: 1, flexShrink: 0 }}>
        <IconInfo size={15} />
      </span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  )
}

function StepRow({ n, children }) {
  return (
    <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span
        aria-hidden="true"
        style={{
          width: 24, height: 24, borderRadius: 8, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
          fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
          marginTop: 1,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-secondary)', minWidth: 0 }}>
        {children}
      </span>
    </li>
  )
}

function DocRow({ file, title, blurb }) {
  const [hover, setHover] = useState(false)
  return (
    <a
      href={repoFile(`docs/${file}`)}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', padding: '14px 16px', borderRadius: 12,
        textDecoration: 'none', color: 'var(--text-primary)', minWidth: 0,
        background: hover ? 'var(--surface-hover)' : 'transparent',
        border: '1px solid var(--border-subtle)',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 14, fontWeight: 650, letterSpacing: '-0.1px' }}>{title}</h3>
        <IconExternal size={12} stroke={2} aria-hidden="true" />
      </div>
      <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        {blurb}
      </p>
      <code style={{
        display: 'inline-block', marginTop: 9, fontFamily: MONO, fontSize: 11.5,
        color: 'var(--text-tertiary)', wordBreak: 'break-word',
      }}>
        docs/{file}
      </code>
    </a>
  )
}

function ChecklistItem({ done, title, description, actionLabel, onAction }) {
  return (
    <li style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: '1 1 240px', minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: done ? 'rgba(52,199,89,0.12)' : 'transparent',
            border: done ? '1px solid rgba(52,199,89,0.30)' : '2px solid var(--border)',
            color: SUCCESS,
          }}
        >
          {done && <IconCheck size={14} stroke={2.6} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
            {done && <Badge tone="success">Done</Badge>}
          </div>
          <p style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        <Button variant="secondary" size="sm" onClick={onAction}>{actionLabel}</Button>
      </div>
    </li>
  )
}

// ── Page ─────────────────────────────────────────────────────────

export default function Community() {
  const navigate = useNavigate()
  const [influencers] = useInfluencers()
  const [connected, setConnected] = useState(() => isHFConnected())

  // The token can change in another tab (or in the Settings page behind this
  // one), so re-read it whenever this tab comes back into focus.
  useEffect(() => {
    const sync = () => setConnected(isHFConnected())
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  const stats = useMemo(() => computeStats(influencers || []), [influencers])

  const checklist = [
    {
      done: connected,
      title: 'Connect Higgsfield',
      description: 'Image and video generation runs through your own Higgsfield account and credits.',
      actionLabel: connected ? 'Manage' : 'Connect',
      onAction: () => navigate('/settings#connections'),
    },
    {
      done: stats.createdCount > 0,
      title: 'Create an influencer',
      description: stats.createdCount > 0
        ? `You have ${stats.createdCount} of your own${stats.templateCount ? `, alongside ${stats.templateCount} built-in template${stats.templateCount === 1 ? '' : 's'}` : ''}.`
        : 'The built-in templates are there to poke at, but the wizard builds a character that is yours.',
      actionLabel: stats.createdCount > 0 ? 'Create another' : 'Start',
      onAction: () => navigate('/create'),
    },
    {
      done: stats.photoCount > 0,
      title: 'Generate a photo',
      description: stats.photoCount > 0
        ? `${stats.photoCount} image${stats.photoCount === 1 ? '' : 's'} generated so far.`
        : 'Open a character and use Content Studio — the first render is where the prompt docs start making sense.',
      actionLabel: 'Open studio',
      onAction: () => navigate('/influencers'),
    },
  ]

  const doneCount = checklist.filter(item => item.done).length
  const allDone = doneCount === checklist.length

  return (
    <PageShell
      title="Help, feedback, and the good notes"
      subtitle="This is a small, open project — one person, one repository, and no support desk. What it does have is somewhere to report what broke, a form that takes thirty seconds, and a pile of hard-won notes on what actually works. All of it is below."
      actions={
        <Button
          variant="primary"
          href={FEEDBACK}
          target="_blank"
          rel="noopener noreferrer"
          icon={<IconMessage size={16} />}
        >
          Send feedback
        </Button>
      }
    >
      <div
        aria-hidden="true"
        style={{ width: 56, height: 3, borderRadius: 3, background: GRADIENT, marginBottom: 28 }}
      />

      {/* ── Ways to connect ── */}
      <section style={{ marginBottom: 32 }}>
        <SectionHeading
          id="connect"
          title="Where to reach someone"
          description="Real places, not a chat room. Pick by how much of a hurry you are in — the form is the fastest, an issue is the one that gets tracked."
        />
        <div className="card-grid-3">
          {DESTINATIONS.map(d => <LinkCard key={d.href} {...d} />)}
        </div>
        <NoteBar>
          There is no Discord, no Slack and no forum for this project, so nothing above pretends to be
          one. No member list either — your data never leaves your browser, which also means there is
          no roster of people to show you.
        </NoteBar>
      </section>

      {/* ── Learn: setup ── */}
      <SectionCard
        id="setup"
        title="Setting it up from scratch"
        description="The short version of the setup guide, for when you are helping someone else get started."
        footer={
          <>
            The full walkthrough lives in{' '}
            <a
              href={repoFile('SETUP.txt')}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring"
              style={{ color: 'var(--text-primary)', fontWeight: 600, textUnderlineOffset: 3 }}
            >
              SETUP.txt
            </a>{' '}
            in the repository, with every click spelled out.
          </>
        }
      >
        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SETUP_STEPS.map((step, i) => <StepRow key={step} n={i + 1}>{step}</StepRow>)}
        </ol>
      </SectionCard>

      {/* ── Learn: docs ── */}
      <SectionCard
        id="prompt-docs"
        title="Prompt notes"
        description="Three reference documents on getting usable output out of each model. They are markdown files in the repository, not pages in this app — they open on GitHub."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DOCS.map(doc => <DocRow key={doc.file} {...doc} />)}
        </div>
      </SectionCard>

      {/* ── Getting started checklist ── */}
      <SectionCard
        id="checklist"
        title="Getting started"
        description="Read live from this browser, so it is accurate for you and nobody else."
        action={<Badge tone={allDone ? 'success' : 'accent'}>{doneCount} of {checklist.length}</Badge>}
        footer={
          allDone
            ? 'All three done — the prompt notes above are the next useful thing.'
            : 'Nothing here is sent anywhere; it is just your own local data, counted.'
        }
      >
        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {checklist.map(item => <ChecklistItem key={item.title} {...item} />)}
        </ol>
      </SectionCard>

      {/* ── Closing note ── */}
      <Card padding={24} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span
          aria-hidden="true"
          style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(139,92,246,0.11)', color: ACCENT,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <IconMessage size={19} />
        </span>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-0.2px' }}>
            Made by one person
          </h2>
          <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            This app is local-first and built by Dan Kieft. Your influencers, boards and deals live in
            your browser and nowhere else, which is lovely for privacy and useless for telemetry — it
            means nobody can see that a screen confused you unless you say so. If something breaks,
            feels clumsy, or is simply missing, telling someone is genuinely the most useful thing you
            can do here.
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              href={FEEDBACK}
              target="_blank"
              rel="noopener noreferrer"
              icon={<IconMessage size={16} />}
            >
              Send feedback
            </Button>
            <Button
              variant="secondary"
              href={ISSUES}
              target="_blank"
              rel="noopener noreferrer"
              icon={<IconAlert size={16} />}
            >
              Open an issue
            </Button>
          </div>
        </div>
      </Card>
    </PageShell>
  )
}
