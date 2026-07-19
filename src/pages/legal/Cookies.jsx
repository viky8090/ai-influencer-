// Cookie Policy — /cookies. Honest to the stack: only strictly-necessary cookies
// (Clerk session), localStorage for app data, cookieless Vercel analytics. No ad or
// cross-site tracking cookies, which is why there is no consent banner.
import LegalPage, { P, UL, Mail, L } from './LegalPage'
import { M } from '../../ui/marketing'

const UPDATED = 'July 16, 2026'

function CookieTable() {
  const rows = [
    ['__session (Clerk)', 'Keeps you signed in — authenticates every request to your account.', 'Strictly necessary', 'Session / up to 7 days'],
    ['__client_uat (Clerk)', 'Tracks when your session was last verified so sign-in state stays fresh across tabs.', 'Strictly necessary', 'Up to 1 year'],
    ['__cf_bm / cf_clearance (Cloudflare)', 'Bot protection on our API and media CDN.', 'Strictly necessary (security)', 'Under 1 day'],
  ]
  const cell = { padding: '10px 14px', fontSize: 13.5, lineHeight: 1.5, color: M.sub, borderTop: `1px solid ${M.lineSoft}`, verticalAlign: 'top', textAlign: 'left' }
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${M.line}`, borderRadius: 12, margin: '4px 0 14px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>
            {['Cookie', 'Purpose', 'Category', 'Lifetime'].map((h) => (
              <th key={h} style={{ ...cell, borderTop: 'none', color: '#F4F4F5', fontWeight: 700, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.6px', background: M.card }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((v, i) => <td key={i} style={{ ...cell, ...(i === 0 ? { color: '#F4F4F5', fontWeight: 600, whiteSpace: 'nowrap' } : {}) }}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SECTIONS = [
  {
    id: 'what',
    h: '1. The short version',
    body: (
      <UL items={[
        'Vymotion uses only strictly-necessary cookies — the ones required to keep you signed in and to protect the service from bots.',
        'We set no advertising, marketing, or cross-site tracking cookies.',
        'Our analytics (Vercel Web Analytics) are cookieless and anonymous — no identifier is stored on your device.',
        'Because we only use strictly-necessary cookies, no cookie consent banner is required — there is nothing optional to consent to.',
      ]} />
    ),
  },
  {
    id: 'cookies',
    h: '2. Cookies we set',
    body: (
      <>
        <CookieTable />
        <P>
          Strictly-necessary cookies cannot be switched off inside the app because the service does not function without them —
          blocking them in your browser simply signs you out.
        </P>
      </>
    ),
  },
  {
    id: 'storage',
    h: '3. localStorage (not cookies)',
    body: (
      <P>
        Vymotion is local-first: your influencer designs, drafts, studio history, theme preference, and (if you connect one) your
        own Higgsfield session tokens are kept in your browser&rsquo;s <code style={{ color: '#F4F4F5' }}>localStorage</code>. This
        data never leaves your device except to perform actions you request, is not readable by other websites, and is removed if
        you clear site data or use the in-app delete options. Details in the <L to="/privacy">Privacy Policy</L>.
      </P>
    ),
  },
  {
    id: 'third-party',
    h: '4. Third-party pages',
    body: (
      <P>
        Checkout happens on Polar&rsquo;s hosted pages and sign-in UI is provided by Clerk; those providers set their own cookies on
        their own domains under their own policies. Social platforms you connect for publishing likewise govern their own cookies.
      </P>
    ),
  },
  {
    id: 'control',
    h: '5. Managing cookies',
    body: (
      <P>
        You can view, block, or delete cookies in your browser settings at any time (look for &ldquo;Site settings&rdquo; →
        &ldquo;Cookies and site data&rdquo;). Questions about this policy: <Mail subject="Cookie policy" />. If we ever introduce
        optional (analytics or marketing) cookies, we will update this page and add a consent prompt before any such cookie is set.
      </P>
    ),
  },
]

export default function Cookies() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated={UPDATED}
      description="Vymotion uses only strictly-necessary cookies for sign-in and security — no advertising or tracking cookies, and cookieless anonymous analytics."
      path="/cookies"
      intro={
        <P>
          What&rsquo;s stored on your device when you use Vymotion, why, and how you control it.
        </P>
      }
      sections={SECTIONS}
    />
  )
}
