// DMCA / copyright policy — /dmca. Notice + counter-notice procedure and the
// likeness-abuse reporting channel (deepfake/impersonation reports go here too).
import LegalPage, { P, UL, Mail, L, LEGAL_EMAIL } from './LegalPage'

const UPDATED = 'July 16, 2026'

const SECTIONS = [
  {
    id: 'overview',
    h: '1. Overview',
    body: (
      <P>
        Vymotion respects intellectual-property rights and expects users to do the same. This page explains how to report content
        hosted on Vymotion that you believe infringes your copyright (a DMCA notice), how users can respond (counter-notice), and
        how to report misuse of a real person&rsquo;s likeness. Uploading or generating infringing content violates our{' '}
        <L to="/terms#likeness">Terms of Service</L> and can lead to content removal and account termination.
      </P>
    ),
  },
  {
    id: 'notice',
    h: '2. Filing a DMCA takedown notice',
    body: (
      <>
        <P>
          If you are a copyright owner (or authorized agent) and believe content on vymotion.org infringes your work, send a notice
          containing the elements required by 17 U.S.C. § 512(c)(3):
        </P>
        <UL items={[
          'Identification of the copyrighted work you claim is infringed (or a representative list).',
          'Identification of the infringing material and its location — the exact URL(s) on vymotion.org.',
          'Your name, mailing address, telephone number, and email address.',
          'A statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent, or the law.',
          'A statement that the information in the notice is accurate and, under penalty of perjury, that you are authorized to act for the copyright owner.',
          'Your physical or electronic signature.',
        ]} />
        <P>
          Send notices to our designated copyright agent: <Mail subject="DMCA takedown notice" /> (subject line
          &ldquo;DMCA takedown notice&rdquo;). We act on complete, valid notices expeditiously — typically within 2 business days —
          by removing or disabling access to the material and notifying the user who posted it.
        </P>
        <P>
          Misrepresenting that content is infringing can make you liable for damages under 17 U.S.C. § 512(f). If you are unsure,
          consult a lawyer before filing.
        </P>
      </>
    ),
  },
  {
    id: 'counter',
    h: '3. Counter-notice',
    body: (
      <>
        <P>
          If your content was removed and you believe this was a mistake or misidentification, you may send a counter-notice
          containing:
        </P>
        <UL items={[
          'Identification of the removed material and where it appeared before removal.',
          'A statement under penalty of perjury that you have a good-faith belief the material was removed as a result of mistake or misidentification.',
          'Your name, address, and phone number, and consent to the jurisdiction of your local federal district court (or, if outside the United States, any judicial district in which Vymotion may be found), and that you will accept service of process from the original complainant.',
          'Your physical or electronic signature.',
        ]} />
        <P>
          Send counter-notices to <Mail subject="DMCA counter-notice" />. Unless the original complainant informs us within 10–14
          business days that they have filed a court action, we may restore the removed material.
        </P>
      </>
    ),
  },
  {
    id: 'repeat',
    h: '4. Repeat infringers',
    body: (
      <P>
        We maintain a repeat-infringer policy: accounts that are the subject of multiple valid takedown notices are terminated. We
        may also terminate accounts for a single egregious violation.
      </P>
    ),
  },
  {
    id: 'likeness',
    h: '5. Likeness & impersonation reports',
    body: (
      <>
        <P>
          Copyright is not the only protected right. If AI-generated content on Vymotion uses your face, name, or voice without your
          consent — or impersonates you or your brand — report it to <Mail subject="Likeness / impersonation report" /> with the
          URL(s) and enough information for us to verify your identity. Our <L to="/terms#likeness">Terms</L> prohibit real-person
          likeness use without documented consent, and we remove verified violations promptly regardless of whether a copyright
          claim applies.
        </P>
        <P>
          Email for all reports on this page: <span style={{ color: '#F4F4F5', fontWeight: 600 }}>{LEGAL_EMAIL}</span>.
        </P>
      </>
    ),
  },
]

export default function Dmca() {
  return (
    <LegalPage
      title="DMCA & Copyright Policy"
      updated={UPDATED}
      description="How to file a DMCA takedown notice or counter-notice for content on Vymotion, our repeat-infringer policy, and how to report unauthorized use of your likeness."
      path="/dmca"
      intro={
        <P>
          How to get infringing or abusive content removed from Vymotion — and how to respond if your own content was removed by
          mistake.
        </P>
      }
      sections={SECTIONS}
    />
  )
}
