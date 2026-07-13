import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Card,
  Text,
  Link,
  Heading,
  Outline,
  Banner,
} from '@astryxdesign/core'
import { useSEO } from '../ui/seo'
import AstryxScope from '../ui/ax/AstryxScope'
import RouterLink from '../ui/ax/RouterLink'

// Product documentation — factual walkthrough of every screen and control.
// No marketing copy; only what the app actually does.
// UI: Astryx Card / Text / Outline (pilot 5).

const TOC = [
  { id: 'start', label: 'Getting started' },
  { id: 'account', label: 'Account & credits' },
  { id: 'plans', label: 'Plans & pricing' },
  { id: 'dashboard', label: 'Home (Dashboard)' },
  { id: 'create', label: 'Create influencer' },
  { id: 'studio', label: 'Influencers studio' },
  { id: 'profile', label: 'Profile tab' },
  { id: 'photos', label: 'Photo Studio' },
  { id: 'videos', label: 'Video Studio' },
  { id: 'overview', label: 'Overview & identity' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'home-slots', label: 'Home slots' },
  { id: 'inf-brand', label: 'Brand deals (per influencer)' },
  { id: 'history', label: 'History' },
  { id: 'publish', label: 'Publish' },
  { id: 'brand-deals', label: 'Brand Deals page' },
  { id: 'inspiration', label: 'Inspiration' },
  { id: 'usage', label: 'Usage history' },
  { id: 'settings', label: 'Settings' },
  { id: 'ai-assist', label: 'AI Assist' },
  { id: 'tour', label: 'Product tour' },
  { id: 'nav', label: 'Navigation map' },
  { id: 'costs', label: 'Credit costs' },
  { id: 'rules', label: 'Rules & limits' },
]

const OUTLINE_ITEMS = TOC.map((t) => ({ id: t.id, label: t.label, level: 1 }))

function H2({ id, children }) {
  return (
    <Heading
      id={id}
      level={2}
      style={{ scrollMarginTop: 88, margin: '0 0 12px', letterSpacing: '-0.5px' }}
    >
      {children}
    </Heading>
  )
}

function H3({ children }) {
  return (
    <Heading level={3} style={{ margin: '20px 0 8px', letterSpacing: '-0.2px' }}>
      {children}
    </Heading>
  )
}

function P({ children }) {
  return (
    <Text type="body" size="sm" color="secondary" display="block" style={{ lineHeight: 1.7, margin: '0 0 12px' }}>
      {children}
    </Text>
  )
}

function Ul({ items }) {
  return (
    <ul style={{ margin: '0 0 14px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--color-text-secondary, var(--text-secondary))' }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

function Ol({ items }) {
  return (
    <ol style={{ margin: '0 0 14px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--color-text-secondary, var(--text-secondary))' }}>
          {item}
        </li>
      ))}
    </ol>
  )
}

function Table({ rows, headers }) {
  return (
    <Card padding={0} style={{ overflow: 'hidden', margin: '0 0 16px' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} style={{
                  textAlign: 'left', padding: '10px 14px', fontWeight: 700,
                  color: 'var(--color-text-secondary, var(--text-secondary))',
                  background: 'var(--color-background-muted, var(--bg-secondary))',
                  borderBottom: '1px solid var(--color-border, var(--border))',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{
                    padding: '10px 14px',
                    color: 'var(--color-text-primary, var(--text-primary))',
                    borderBottom: i < rows.length - 1 ? '1px solid var(--color-border, var(--border-subtle))' : 'none',
                    verticalAlign: 'top', lineHeight: 1.5,
                  }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Callout({ children }) {
  return (
    <div style={{ margin: '0 0 16px' }}>
      <Banner status="info" title={children} container="card" />
    </div>
  )
}

function LinkBtn({ to, children }) {
  return (
    <Link
      href={to}
      as={RouterLink}
      color="accent"
      weight="bold"
      type="inherit"
      hasUnderline
      style={{ fontSize: 'inherit' }}
    >
      {children}
    </Link>
  )
}

function Section({ id, title, children }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <Card padding={6}>
        <H2 id={id}>{title}</H2>
        {children}
      </Card>
    </section>
  )
}

export default function Docs() {
  const location = useLocation()
  const [active, setActive] = useState('start')

  useSEO({
    title: 'Documentation — Vymotion User Guide',
    description: 'Step-by-step guide to every Vymotion feature: create influencers, Photo Studio, Video Studio, publish, credits, and settings.',
    path: '/docs',
  })

  // Highlight TOC from scroll position
  useEffect(() => {
    const ids = TOC.map((t) => t.id)
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean)
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target?.id) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Deep-link hash on load / change
  useEffect(() => {
    const hash = location.hash?.replace('#', '')
    if (!hash) return
    const t = setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActive(hash)
    }, 80)
    return () => clearTimeout(t)
  }, [location.hash])

  function goSection(id) {
    setActive(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      history.replaceState(null, '', `#${id}`)
    }
  }

  return (
    <AstryxScope>
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'transparent' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 70px' }}>

        {/* Header */}
        <div className="reveal" style={{ marginBottom: 28 }}>
          <Text
            type="supporting"
            size="xsm"
            weight="bold"
            color="secondary"
            display="block"
            style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}
          >
            User guide
          </Text>
          <Text type="display-2" weight="bold" display="block" style={{ letterSpacing: '-1px', lineHeight: 1.1 }}>
            Vymotion documentation
          </Text>
          <P>
            Every screen, control, and step in the product. Use the sidebar to jump to a section.
          </P>
        </div>

        <div className="docs-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>

          {/* TOC */}
          <aside className="docs-toc" style={{
            position: 'sticky', top: 'calc(var(--nav-h) + 16px)',
            maxHeight: 'calc(100vh - var(--nav-h) - 32px)', overflowY: 'auto',
          }}>
            <Card padding={3}>
              <Text
                type="supporting"
                size="xsm"
                weight="bold"
                color="secondary"
                display="block"
                style={{ textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 4px 10px' }}
              >
                Contents
              </Text>
              <Outline
                items={OUTLINE_ITEMS}
                activeId={active}
                onActiveIdChange={goSection}
                label="Documentation contents"
                density="compact"
              />
            </Card>
          </aside>

          {/* Body */}
          <div>

            <Section id="start" title="Getting started">
              <Ol items={[
                <>Sign up free to explore (no generation credits). Start Starter ($5) or higher to generate and publish.</>,
                <>Open <LinkBtn to="/dashboard">Home</LinkBtn> — your plan, balance, recent generations, and influencer list.</>,
                <>Explore the sample influencer <strong style={{ color: 'var(--text-primary)' }}>Camila</strong> under <LinkBtn to="/influencers">Influencers</LinkBtn> (Profile, Photos, Videos).</>,
                <>Create your own: <LinkBtn to="/create">+ Create</LinkBtn> in the nav → 5-step wizard → pick a look → you land on that influencer’s studio.</>,
                <>Generate photos (Photos tab) and video (Videos tab). Use credits shown in the top bar.</>,
                <>On a paid plan, schedule posts from <LinkBtn to="/publish">Publish</LinkBtn>.</>,
              ]} />
              <Callout>
                Failed, timed-out, canceled, or filtered generations return credits. You are not charged for those.
              </Callout>
            </Section>

            <Section id="account" title="Account & credits">
              <H3>Sign-in</H3>
              <Ul items={[
                'Authentication is via Clerk (email / social as configured).',
                'Manage password, email, and security from Settings → Manage sign-in & security, or Profile menu → Manage account.',
                'Some routes require sign-in: Influencers, Publish. Create can be browsed; generation requires an account.',
              ]} />
              <H3>Credits</H3>
              <Ul items={[
                'Credits power prompts, images, character sheets, pose previews, and video.',
                'Balance appears in the top bar (CreditChip) and Profile menu. Tap to open top-up / plan options.',
                'Balance splits into plan credits and top-up credits. Top-up packs last 12 months.',
                'See every debit and credit on Usage.',
              ]} />
              <H3>Profile menu (avatar)</H3>
              <Ul items={[
                'Credits bar → top-up / paywall',
                'Go Premium (free plan only) → Pricing',
                'View profile → Dashboard',
                'Settings',
                'Manage account (Clerk)',
                'Join community (Discord, if configured)',
                'Sign out',
              ]} />
            </Section>

            <Section id="plans" title="Plans & pricing">
              <P>Open <LinkBtn to="/pricing">Pricing</LinkBtn>. Toggle Monthly / Annual (~2 months free on annual).</P>
              <Table
                headers={['Plan', 'Price', 'Credits / mo', 'Highlights']}
                rows={[
                  ['Free', '$0', '0', 'Explore only · no generation · no publish'],
                  ['Starter', '$5/mo or $50/yr', '200', '1 influencer · full Photo/Video (no Seedance 2/Veo) · Publish · personal use · no watermark'],
                  ['Creator', '$29/mo or $290/yr', '600', '5 influencers · all models incl. premium video · commercial license'],
                  ['Pro', '$69/mo or $690/yr', '1,800', '25 influencers · 4K · high priority · 1-month rollover'],
                  ['Studio', '$179/mo or $1,790/yr', '5,500', 'Unlimited influencers · highest priority · 2-month rollover'],
                ]}
              />
              <H3>Credit packs (one-off)</H3>
              <Table
                headers={['Pack', 'Credits', 'Price']}
                rows={[
                  ['Small', '500', '$20'],
                  ['Medium', '1,500', '$55'],
                  ['Large', '5,000', '$160'],
                  ['Mega', '15,000', '$450'],
                ]}
              />
              <P>Checkout goes through Polar. After purchase, manage invoices and payment methods from Settings → Manage billing & invoices.</P>
              <P><strong style={{ color: 'var(--text-primary)' }}>Social publish</strong> (Postiz-backed) is included on Starter and above. Free accounts cannot connect channels or schedule posts.</P>
            </Section>

            <Section id="dashboard" title="Home (Dashboard)">
              <P>Signed-in only. Path: <LinkBtn to="/dashboard">/dashboard</LinkBtn>.</P>
              <Ul items={[
                'Welcome header with plan name.',
                'First-time / Camila-only checklist: open Camila, try Photo Studio, create your influencer.',
                'Low-balance banner when under 20 credits.',
                'Stats: credit balance (→ Usage), plan (→ Pricing / billing), library count (→ Influencers).',
                'Quick actions: New influencer, Photo Studio, Video Studio, Brand Deal (with approx. credit costs).',
                'Recent generations grid — images and videos; postable server URLs can open Publish with media attached.',
                'Your influencers strip → open studio.',
              ]} />
            </Section>

            <Section id="create" title="Create influencer">
              <P>Path: <LinkBtn to="/create">/create</LinkBtn>. Five steps. Age must be 18+.</P>

              <H3>Step 1 — Basics</H3>
              <Ul items={[
                'Name (required)',
                'Gender: Female or Male (required)',
                'Age (optional; blocks continue if under 18)',
                'Niche: multi-select — Fashion, Beauty, Lifestyle, Fitness, Travel, Food & Dining, Tech, Gaming, Finance, Entertainment, Wellness, Sports, Other (+ custom text)',
              ]} />

              <H3>Step 2 — References (optional)</H3>
              <Ul items={[
                'Face reference: upload or drag a face photo. Optional “What to copy” note (jawline, eye shape, etc.).',
                'Style reference: outfit / aesthetic inspo. Optional note for what to take from it.',
                'References improve likeness; some models cannot use them (see Generate).',
              ]} />

              <H3>Step 3 — Story</H3>
              <Ul items={[
                'Backstory text. Optional ✨ AI Assist (purpose: backstory) — review then Accept / Try again.',
                'Personality slider: Introvert ↔ Extrovert (labels: Thoughtful, Balanced, Bold).',
              ]} />

              <H3>Step 4 — Look</H3>
              <Ul items={[
                'Physical appearance: ethnicity, skin tone, hair color / length / texture, eye color, build, optional custom features (freckles, tattoos…). Randomize available.',
                'Hair lengths and builds differ for male vs female.',
                'Aesthetic vibe chips (gender-filtered): Minimalist, Old Money, Clean Girl, Editorial, Streetwear, Bohemian, Glam, Preppy, Sporty, Dark & Moody, Y2K, Cottagecore, Tech Bro, Coastal.',
              ]} />

              <H3>Step 5 — Generate</H3>
              <Ul items={[
                'Requires sign-in.',
                'Pick generation engine, then Generate 3 looks. Choose one to save as the influencer.',
              ]} />
              <Table
                headers={['Model', 'Notes']}
                rows={[
                  ['Higgsfield Soul', 'Influencer-native; max 1 ref; blocked if incompatible with your refs'],
                  ['GPT Image 2', 'Default “Best” — max quality, up to 2 refs'],
                  ['Nano Banana Pro', 'Sharp detail, up to 2 refs'],
                  ['Nano Banana 2', 'Faster, up to 2 refs'],
                  ['Seedream 4', 'Cinematic, up to 2 refs'],
                  ['FLUX Krea', 'Aesthetic realism; no reference images'],
                ]}
              />
              <Ul items={[
                'Aspect: Portrait 9:16 or Landscape 16:9.',
                'Progress UI while generating; partial results appear as they finish.',
                'Hover to expand, download individual looks, pick favourite → Finish → opens Influencers with that profile selected.',
              ]} />
            </Section>

            <Section id="studio" title="Influencers studio">
              <P>Path: <LinkBtn to="/influencers">/influencers</LinkBtn>. Signed-in only.</P>
              <H3>Sidebar</H3>
              <Ul items={[
                'List of influencers. Click to select. Last selection is remembered.',
                'Drag to reorder. Collapse / resize sidebar (width saved).',
                'Right-click (context menu): Rename, Duplicate, Delete.',
                'Quick create modal: name + gender only (no full wizard).',
                'Mobile: list / detail views with back button.',
              ]} />
              <H3>Main tabs (per influencer)</H3>
              <Ul items={[
                'Profile — identity images, prompt, detail sub-tabs',
                'Photos — Photo Studio',
                'Videos — Video / Content Studio',
              ]} />
              <P>Switching influencers resets to Profile → Overview.</P>
            </Section>

            <Section id="profile" title="Profile tab">
              <H3>Empty state</H3>
              <P>If there is no main image, a CTA sends you to Create with this influencer prefilled for generation.</P>
              <H3>Hero</H3>
              <Ul items={[
                'Name (editable), completeness ring, delete, accent color from brand palette.',
              ]} />
              <H3>Image slots</H3>
              <Table
                headers={['Slot', 'What it is', 'Actions']}
                rows={[
                  ['Image (main)', 'Primary face / hero photo', 'Upload, replace, regenerate, download, lightbox'],
                  ['Character Sheet', 'Full identity reference sheet', 'Generate / regenerate (aspect 16:9, 4:3, 3:2), upload, download'],
                  ['Close up 1', 'Face close-up', 'Generate / upload / download'],
                  ['Feature sheet', 'Eye / brow / lip / skin / hair / hands panel sheet (2:3)', 'Generate with feature prompt / upload'],
                ]}
              />
              <H3>Prompt field</H3>
              <P>Free-text prompt stored on the influencer for reuse in scripts and workflows.</P>
              <H3>Detail sub-tabs</H3>
              <P>Overview · Scripts · Wardrobe · Home · Brand Deals · History — documented below.</P>
            </Section>

            <Section id="photos" title="Photo Studio">
              <P>Influencers → select influencer → <strong style={{ color: 'var(--text-primary)' }}>Photos</strong>.</P>
              <P>Left: identity reference (main / sheet / override upload). Right: location or pose preview. Settings persist per session.</P>

              <H3>Step 1 — Location</H3>
              <Ul items={[
                'Presets: Coffee Shop, City Street, Beach, Rooftop, Bedroom, Mirror Selfie, Mall, Gym, Park, Restaurant, Hotel Room, Studio.',
                'Or type any custom location.',
              ]} />

              <H3>Step 2 — Time of day</H3>
              <Ul items={['Morning, Afternoon, Golden Hour, Night.']} />

              <H3>Step 3 — Pose</H3>
              <Ul items={[
                'Gender-aware pose chips (female: Front-Facing, Handheld, Candid, Hair Touch, Hip Pop, Over Shoulder, Facing Away, Walking, Mid Turn, Step Out, Wall Lean; male: Confident Front, Hands In Pockets, Crossed Arms, Environment Lean, etc.).',
                'Standing / Sitting toggle (some poses hidden when sitting).',
                'Custom pose text field.',
                'Generate Previews: optional pose preview thumbnails for the influencer.',
              ]} />

              <H3>Step 4 — Expression</H3>
              <Ul items={[
                'Natural, Smiling, Mid-Laugh, Serious — or custom expression text.',
                'Gaze: Looking at Camera / Looking Away.',
                'Disabled when pose is Facing Away.',
              ]} />

              <H3>Step 5 — Outfit</H3>
              <Ul items={[
                'Wardrobe: use Current (character sheet), pick saved wardrobe slots, or + Add (opens wardrobe drawer).',
                'Preset Style (gender-aware): Casual, Streetwear, Chic/Smart Casual, Athleisure, Minimal, Glam/Business, Party, Cozy.',
                'Custom outfit description text.',
                'Lock hairstyle + optional hairstyle description (overrides refs).',
              ]} />

              <H3>Step 6 — Props (optional)</H3>
              <Ul items={[
                'Upload product images to hold/wear; location-aware prop text suggestions.',
                'Generate Product Sheet for a prop image.',
              ]} />

              <H3>Output controls</H3>
              <Ul items={[
                'Aspect: 9:16 or 1:1 (Photo Studio).',
                'Resolution options (e.g. 1K–4K depending on plan / model).',
                'Output count (batch).',
                'Randomize parameters.',
                'Generate Photo — progress overlay; results appear in the studio history strip.',
              ]} />

              <H3>After generate</H3>
              <Ul items={[
                'Download, expand lightbox, select / delete history items.',
                'Use as start frame → jumps to Videos with that image as the video start frame.',
                'Go to Wardrobe shortcut from studio when managing outfits.',
              ]} />
            </Section>

            <Section id="videos" title="Video Studio">
              <P>Influencers → <strong style={{ color: 'var(--text-primary)' }}>Videos</strong> (Content Studio).</P>

              <H3>Templates (optional starters)</H3>
              <Ul items={[
                'Talking Head — bedroom, handheld, natural, ~8s',
                'Product Review — studio, tutorial vibe, ~12s',
                'GRWM — bathroom, playful, ~10s',
                'Brand Collab — street, confident, ~12s',
              ]} />

              <H3>Dialogue</H3>
              <Ul items={[
                'Script the influencer speaks. Starter lines available.',
                '✨ AI Assist (purpose: script) can draft from context.',
              ]} />

              <H3>Environment</H3>
              <Ul items={[
                'Presets: Bedroom, Bathroom, Kitchen, Coffee Shop, Mall / Store, Street, Gym, Studio — or custom text.',
                'Ambient sound is inferred from environment for the prompt.',
              ]} />

              <H3>Camera & vibe</H3>
              <Ul items={[
                'Camera: Handheld, Tripod, Talking Head (and related modes in meta).',
                'Vibe: Natural, Energetic, Luxury, Playful, Tutorial, Dramatic, Cozy, Confident.',
              ]} />

              <H3>Voice</H3>
              <Ul items={[
                'Female presets: American (21 / 28 / 35), British polished / playful, Japanese soft.',
                'Male presets: American (22 / 30 / 38), British sharp / storyteller.',
                'Or custom voice description.',
              ]} />

              <H3>Products (optional)</H3>
              <Ul items={[
                'Up to 3 product reference images (upload / drag).',
                'Toggle worn vs held mode.',
              ]} />

              <H3>Wardrobe & home for video</H3>
              <Ul items={[
                'Pick a wardrobe slot or character sheet for outfit identity.',
                'Optional home slot as environment reference.',
              ]} />

              <H3>Start frame</H3>
              <Ul items={[
                'Optional image-to-video start frame (from Photo Studio “Use as start frame” or manual).',
                'Used as primary identity/outfit reference in generation.',
              ]} />

              <H3>Format</H3>
              <Ul items={[
                'Duration (model-dependent; UI defaults around 8–15s).',
                'Aspect (e.g. 9:16).',
                'Shot mode: oner (single continuous take) or multi-shot.',
                'Outputs count, resolution (e.g. 1080p).',
                'Additional direction notes.',
              ]} />

              <H3>Video models</H3>
              <Table
                headers={['Model', 'Hint', 'Approx. credits / clip']}
                rows={[
                  ['Seedance Lite', 'Fast & affordable · all paid plans', '25'],
                  ['Seedance Pro', 'Sharper motion · all paid plans', '80'],
                  ['Kling 2.5 Pro', 'Cinematic · all paid plans', '50'],
                  ['Sora 2', 'OpenAI · all paid plans', '100'],
                  ['Veo 3 Fast', 'Creator+ only', '160'],
                  ['Seedance 2', 'Creator+ only', '200'],
                ]}
              />
              <Callout>
                Displayed costs are hints. The server price book is the source of truth for charges.
              </Callout>

              <H3>Generate & after</H3>
              <Ul items={[
                'Generate builds a structured video prompt (subject, wardrobe, environment, dialogue, delivery rules) and runs the selected model.',
                'Progress, cancel, resume pending jobs supported.',
                'Results: play, mute (global mute preference), download, delete, save to Scripts with a title.',
                'Recent video settings history (last few) can restore dialogue/env/camera/etc.',
              ]} />
            </Section>

            <Section id="overview" title="Overview & identity">
              <P>Profile → Overview sub-tab. Edits save on the influencer record.</P>
              <Ul items={[
                'Identity: gender, age, niche (list depends on gender), location',
                'Backstory',
                'Personality slider (introvert–extrovert)',
                'Target audience',
                'Physical description (if set at creation)',
                'Hobbies & interests',
                'Aesthetic / style vibe',
                'Dream brands',
                'Content pillars (comma-separated)',
                'Brand colors (palette swatches)',
                'Voice / TTS note (free text, e.g. provider preference)',
              ]} />
            </Section>

            <Section id="scripts" title="Scripts">
              <P>Profile → Scripts. Tracks video scripts saved from Video Studio (or added manually).</P>
              <Ul items={[
                'Add script: title, status (e.g. Unposted), prompt, script text, video URLs, posted URL.',
                'Expand card for full details, meta (camera, vibe, duration, format, wardrobe name, voice).',
                'Copy fields, download videos, remove video URLs, delete script.',
                'Reorder scripts by drag.',
                'Saving from Video Studio can auto-jump here and highlight the new script.',
              ]} />
            </Section>

            <Section id="wardrobe" title="Wardrobe">
              <P>Profile → Wardrobe.</P>
              <H3>Generate Look</H3>
              <Ul items={[
                'Requires a character sheet (generate in Profile first).',
                'Pick a style preset (female: Old Money, Clean Girl, Streetwear, Glam, Cottagecore, Y2K, Editorial, Bohemian, Sporty, Dark & Moody, Coastal, Preppy; male: Old Money, Streetwear, Tech Bro, Preppy, Sporty, Business, Coastal, Editorial, Dark & Moody, Bohemian, Y2K, Party Night) or custom outfit/hair text.',
                'Generate Look → preview → Save to Wardrobe or discard.',
                'Jobs can resume if interrupted (pending state).',
              ]} />
              <H3>Slots</H3>
              <Ul items={[
                'Named image slots (default Wardrobe 1–3). Upload, rename, download, delete, + Add Wardrobe.',
                'Used in Photo Studio and Video Studio as outfit references.',
              ]} />
            </Section>

            <Section id="home-slots" title="Home slots">
              <P>Profile → Home. Named room/location image slots for environment reference (especially video).</P>
              <Ul items={['Add room, rename, upload image, delete, lightbox.']} />
            </Section>

            <Section id="inf-brand" title="Brand deals (per influencer)">
              <P>Profile → Brand Deals. Deals attached to this influencer (separate from the global Brand Deals page, with import from global).</P>
              <Ul items={[
                'Add brand: name, category, product images.',
                'Import from global Brand Deals page (skip already-added brands).',
                'Generate Sheet / Regenerate Sheet for product character sheets.',
                'Rename, change image, download sheet, delete.',
              ]} />
            </Section>

            <Section id="history" title="History">
              <P>Profile → History.</P>
              <Ul items={[
                'Photos segment: Photo Studio history for this influencer (local).',
                'Videos segment: video entries from generation history.',
                'Select multiple → download or delete.',
                'Lightbox: play video, mute, download, delete, reuse settings (restores Photo or Video Studio controls and switches tab).',
              ]} />
            </Section>

            <Section id="publish" title="Publish">
              <P>Path: <LinkBtn to="/publish">/publish</LinkBtn>. Signed-in. Paid plans only (Starter / Creator / Pro / Studio). Free plan sees upgrade gate. Publishing uses Postiz behind the scenes.</P>
              <H3>Channels</H3>
              <Ul items={[
                'Connect social accounts via popup OAuth. Password is never entered in Vymotion.',
                'Supported platforms depend on server config. UI includes: X, LinkedIn, LinkedIn Page, Pinterest, Facebook, Instagram, Threads, YouTube, TikTok, Reddit, Bluesky, Mastodon.',
                'Instagram, TikTok, YouTube may show as “coming soon” until platform approvals complete.',
                'Disconnect removes the channel; scheduled posts to that channel are removed too.',
              ]} />
              <H3>Calendar</H3>
              <Ul items={[
                'Month grid (Mon–Sun). Navigate months; Today button.',
                'Posts show by day with state: Scheduled, Published, Draft, Error.',
                'Up next list of upcoming scheduled posts.',
              ]} />
              <H3>Composer (+ New post)</H3>
              <Ul items={[
                'Select connected channels.',
                'Caption text + ✨ AI Assist (caption).',
                'Attach media from library (server-hosted /public/ assets only — not raw local blobs).',
                'Can open with ?media=… from Dashboard recent items.',
                'Schedule datetime, or post now, or save draft.',
              ]} />
              <H3>Post detail</H3>
              <P>Open a calendar item to view status, edit/cancel as supported by the API.</P>
            </Section>

            <Section id="brand-deals" title="Brand Deals page">
              <P>Path: <LinkBtn to="/brand-deals">/brand-deals</LinkBtn>. Global deal library (not tied to one influencer until imported).</P>
              <Ol items={[
                'New Brand Deal → brand name, category, brand/product image (upload or drag).',
                'Generate → Claude builds a sheet prompt from the image (fallback template if Claude unavailable) → image model produces a character sheet.',
                'Toggle Original / Sheet on the card. Download, regenerate, rename, delete.',
              ]} />
              <P>Approx. 6 credits per sheet (see Pricing cost strip).</P>
            </Section>

            <Section id="inspiration" title="Inspiration">
              <P>Path: <LinkBtn to="/inspiration">/inspiration</LinkBtn>.</P>
              <Ul items={[
                'Boards of reference images (moodboards).',
                'Create board, rename, delete (confirms if board has images).',
                'Open board → multi-upload, lightbox, remove image, Download All.',
                'Data is local to your browser storage for this feature.',
              ]} />
            </Section>

            <Section id="usage" title="Usage history">
              <P>Path: <LinkBtn to="/usage">/usage</LinkBtn>. Signed-in.</P>
              <Ul items={[
                'Live balance breakdown (plan vs top-up).',
                'Ledger of grants, spends, holds, refunds, expirations — human-readable labels (model names, pack names).',
                'Filters: All, Spent, Added, Refunds.',
                'Pagination and CSV export.',
                'Explainer of how credits work.',
              ]} />
            </Section>

            <Section id="settings" title="Settings">
              <P>Path: <LinkBtn to="/settings">/settings</LinkBtn>.</P>
              <H3>Account</H3>
              <Ul items={[
                'Display name, handle (3–30 chars: a–z, 0–9, underscore), bio.',
                'Default model, aspect, resolution preferences for generation.',
                'Save profile. Manage sign-in & security via Clerk.',
              ]} />
              <H3>Plan & billing</H3>
              <Ul items={[
                'Current plan, renewal / cancel date, credit balance split.',
                'Plans & credit packs → Pricing.',
                'Manage billing & invoices → Polar portal (after first purchase).',
                'Usage history link.',
              ]} />
              <H3>Social channels</H3>
              <P>Read-only summary; manage connect/disconnect on Publish. Plan gate if free.</P>
              <H3>Appearance</H3>
              <P>Light / Dark theme toggle.</P>
              <H3>Help</H3>
              <P>Restart product tour (resets onboarding and reopens the walkthrough).</P>
            </Section>

            <Section id="ai-assist" title="AI Assist">
              <P>✨ AI button next to certain text fields. Uses credits (prompt cost). Requires sign-in.</P>
              <Table
                headers={['Purpose', 'Where', 'Behavior']}
                rows={[
                  ['backstory', 'Create → Story', 'Draft or improve backstory from wizard context'],
                  ['script', 'Video Studio dialogue', 'Draft spoken script'],
                  ['caption', 'Publish composer', 'Caption for selected platforms; optional image vision'],
                ]}
              />
              <Ul items={[
                'Opens a review popover. Does not overwrite your draft until you click Use it.',
                'Try again regenerates. Cancel closes without applying.',
                'Errors: sign-in required, out of credits, or generic failure.',
              ]} />
            </Section>

            <Section id="tour" title="Product tour">
              <P>First sign-in shows a 5-step tour once per browser (localStorage key).</P>
              <Ol items={[
                'Welcome',
                'Meet Camila — open Influencers',
                'Create your own — open Create',
                'Credits explanation',
                'Done — start creating',
              ]} />
              <P>Skip anytime. Restart from Settings → Help → Restart product tour.</P>
            </Section>

            <Section id="nav" title="Navigation map">
              <Table
                headers={['Nav item', 'Path', 'Notes']}
                rows={[
                  ['Logo', '/', 'Landing'],
                  ['Home', '/dashboard', 'Signed-in hub'],
                  ['Influencers', '/influencers', 'Signed-in'],
                  ['Publish', '/publish', 'Signed-in, paid'],
                  ['How it works', '/how-it-works', 'Marketing overview'],
                  ['Docs', '/docs', 'This guide'],
                  ['Earn', '/earnings', 'Monetization marketing'],
                  ['Pricing', '/pricing', 'Plans & packs'],
                  ['+ Create', '/create', 'Always visible'],
                  ['Settings', '/settings', 'Menu / mobile menu'],
                ]}
              />
              <P>Other routes: Brand Deals <code style={{ fontSize: 13 }}>/brand-deals</code>, Inspiration <code style={{ fontSize: 13 }}>/inspiration</code>, Usage <code style={{ fontSize: 13 }}>/usage</code>, OAuth callback <code style={{ fontSize: 13 }}>/auth/callback</code>.</P>
            </Section>

            <Section id="costs" title="Credit costs">
              <P>From the Pricing page cost strip (approximate):</P>
              <Table
                headers={['Action', 'Credits']}
                rows={[
                  ['AI prompt (text / vision)', '2 / 5'],
                  ['Image — Flash or Soul', '6'],
                  ['Image — GPT medium / high', '12 / 22'],
                  ['Image — Nano Banana Pro (1K / 4K)', '20 / 40'],
                  ['Pose preview', '6'],
                  ['Brand / character sheet', '28'],
                  ['Video — Seedance Lite 5s', '25'],
                  ['Video — Seedance 2 5s (720p)', '200'],
                  ['New influencer (3 GPT looks)', '≈ 36 (12 × 3)'],
                ]}
              />
              <P>Exact spend is recorded on Usage after each job settles.</P>
            </Section>

            <Section id="rules" title="Rules & limits">
              <Ul items={[
                'Influencers must be 18+ (enforced on Create).',
                'Original characters only — do not recreate a real, identifiable person without consent. No deceptive deepfakes or public-figure impersonation.',
                'Label AI-generated content where required by law or platform policy.',
                'Commercial license starts on Creator (Starter is personal-use only).',
                'Free: explore only, no generation, no Publish. Starter: full loop + Publish, no Seedance 2/Veo.',
                'Influencer caps: Starter 1 · Creator 5 · Pro 25 · Studio unlimited.',
                'Generation history is capped (e.g. ~300 entries per influencer; photo history browser limit).',
                'Publish media must be server-hosted public URLs.',
              ]} />
              <P>
                Policy anchors also on <LinkBtn to="/how-it-works#policy">How it works</LinkBtn>
                {' · '}
                <LinkBtn to="/how-it-works#privacy">Privacy</LinkBtn>
                {' · '}
                <LinkBtn to="/how-it-works#terms">Terms</LinkBtn>.
                Contact: hello@vymotion.org
              </P>
            </Section>

          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .docs-layout { grid-template-columns: 1fr !important; }
          .docs-toc {
            position: relative !important;
            top: auto !important;
            max-height: none !important;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            padding: 12px !important;
          }
          .docs-toc > div:first-child { width: 100%; }
          .docs-toc button {
            width: auto !important;
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
    </AstryxScope>
  )
}
