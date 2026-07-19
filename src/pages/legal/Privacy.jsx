// Privacy Policy — /privacy. Accurate to the actual stack: local-first localStorage data,
// Clerk auth, Cloudflare Worker + D1/R2 backend, Polar as Merchant of Record, per-user
// Higgsfield OAuth, fal.ai/Anthropic processing, cookieless Vercel analytics.
import LegalPage, { P, UL, Mail, L } from './LegalPage'

const UPDATED = 'July 16, 2026'

const SECTIONS = [
  {
    id: 'summary',
    h: '1. Summary',
    body: (
      <UL items={[
        'Vymotion is local-first: your influencer designs, drafts, and studio history live primarily in your own browser (localStorage) and, for signed-in users, in your private account space on our servers.',
        'We collect the minimum needed to run the service: account details (email, name), billing state, credit balance, and the generations you request.',
        'Card and payment details go directly to Polar, our Merchant of Record — we never see them.',
        'We do not sell your data and we do not use your content to train AI models.',
        'We use no advertising trackers. Analytics are anonymous and cookieless.',
      ]} />
    ),
  },
  {
    id: 'data-we-collect',
    h: '2. What we collect',
    body: (
      <>
        <P><strong style={{ color: '#F4F4F5' }}>Account data</strong> — when you sign up (via Clerk, our authentication provider): email address, name, optional avatar, and authentication identifiers. </P>
        <P><strong style={{ color: '#F4F4F5' }}>Usage & billing data</strong> — your plan, credit balance and ledger (grants, holds, spends), and purchase history references from Polar (order and subscription ids — never card numbers).</P>
        <P><strong style={{ color: '#F4F4F5' }}>Content data</strong> — the influencer profiles you design, prompts, reference images you upload, and the images/videos you generate. Generated media is stored privately in your account; reference images are served from unguessable URLs so AI providers can fetch them during generation.</P>
        <P><strong style={{ color: '#F4F4F5' }}>Connected services</strong> — if you connect your own Higgsfield account, the OAuth tokens are stored in your browser, not on our servers. If you connect social accounts for publishing, we store the connection reference needed to post on your behalf.</P>
        <P><strong style={{ color: '#F4F4F5' }}>Technical data</strong> — standard server logs (IP address, user agent, timestamps) kept short-term for security and abuse prevention, and anonymous, cookieless page analytics (Vercel Web Analytics).</P>
      </>
    ),
  },
  {
    id: 'how-we-use',
    h: '3. How we use it',
    body: (
      <UL items={[
        'To provide the service: authenticate you, run the generations you request, maintain your credit balance, store and deliver your media. (Legal basis: performance of contract.)',
        'To process payments and prevent fraud, via Polar as Merchant of Record. (Contract / legal obligation.)',
        'To secure the service: rate limiting, abuse detection, debugging with server logs. (Legitimate interest.)',
        'To send transactional messages — receipts, billing changes, important service notices. We do not send marketing email without your consent.',
        'To understand aggregate usage via anonymous analytics. (Legitimate interest; no profiles are built.)',
      ]} />
    ),
  },
  {
    id: 'processors',
    h: '4. Who processes your data',
    body: (
      <>
        <P>We share data only with the processors needed to run Vymotion, each bound by their own privacy terms:</P>
        <UL items={[
          'Clerk — authentication and session management.',
          'Polar (polar.sh) — payments, tax, and invoicing as Merchant of Record.',
          'Cloudflare — API hosting, database, and media storage (Workers, D1, R2).',
          'Vercel — web hosting and anonymous analytics.',
          'AI model providers — the prompt and reference images for a generation are sent to the provider that renders it (e.g. fal.ai-hosted models, Anthropic for text assist, or your own connected Higgsfield account).',
          'Postiz-based publishing infrastructure — only when you connect social accounts and schedule posts.',
        ]} />
        <P>We never sell personal data, and we do not share it with advertisers or data brokers.</P>
      </>
    ),
  },
  {
    id: 'retention',
    h: '5. Retention & deletion',
    body: (
      <UL items={[
        'Local data (localStorage) stays on your device until you clear it or delete it in the app.',
        'Server-side account data, media, and generation history are kept while your account is active.',
        'If you delete your account, we delete or anonymize your personal data and stored media within 30 days, except records we must keep longer (e.g. billing/tax records, retained per statutory periods).',
        'Short-term security logs rotate automatically.',
      ]} />
    ),
  },
  {
    id: 'rights',
    h: '6. Your rights',
    body: (
      <>
        <P>
          Depending on where you live (GDPR in the EU/UK, CCPA/CPRA in California, and similar laws elsewhere), you have the right
          to access, correct, export, restrict, object to processing of, and delete your personal data — and the right to complain
          to your local data-protection authority.
        </P>
        <P>
          To exercise any of these rights, email <Mail subject="Privacy request" />. We respond within 30 days. We will never
          discriminate against you for exercising a privacy right.
        </P>
      </>
    ),
  },
  {
    id: 'transfers',
    h: '7. International transfers',
    body: (
      <P>
        Our infrastructure providers (Cloudflare, Vercel, Clerk, Polar) operate global networks, so your data may be processed
        outside your country, including in the United States. Where required, transfers are protected by recognized safeguards such
        as Standard Contractual Clauses or equivalent frameworks operated by our processors.
      </P>
    ),
  },
  {
    id: 'children',
    h: '8. Children',
    body: (
      <P>
        Vymotion is for adults. We do not knowingly collect data from anyone under 18. If you believe a minor has created an
        account, contact <Mail subject="Underage account" /> and we will remove it.
      </P>
    ),
  },
  {
    id: 'changes',
    h: '9. Changes & contact',
    body: (
      <>
        <P>
          We will post any changes to this policy here and update the date above; material changes are announced in the app or by
          email. See also the <L to="/cookies">Cookie Policy</L> and <L to="/terms">Terms of Service</L>.
        </P>
        <P>
          Data controller: Vymotion. Contact: <Mail subject="Privacy" /> or via the <L to="/contact">contact page</L>.
        </P>
      </>
    ),
  },
]

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      description="How Vymotion handles your data: local-first storage, minimal account data, payments handled by Polar as Merchant of Record, no data sales, no ad trackers, no training on your content."
      path="/privacy"
      intro={
        <P>
          This policy explains what data Vymotion collects, why, who processes it, and the rights you have over it. Vymotion is
          deliberately local-first and minimal-data: most of your creative work lives in your own browser, payments are handled
          end-to-end by our Merchant of Record, and we run no advertising trackers.
        </P>
      }
      sections={SECTIONS}
    />
  )
}
