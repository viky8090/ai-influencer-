// Terms of Service — /terms. Linked from the footer on every marketing page.
import LegalPage, { P, UL, Mail, L } from './LegalPage'

const UPDATED = 'July 16, 2026'

const SECTIONS = [
  {
    id: 'service',
    h: '1. The service',
    body: (
      <>
        <P>
          Vymotion (&ldquo;Vymotion&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a web studio for designing AI-generated virtual
          personas (&ldquo;AI influencers&rdquo;) and producing images, video, and text content featuring them. Generation runs on
          third-party AI model providers; publishing tools can post the content you create to social accounts you connect.
        </P>
        <P>
          These Terms are a binding agreement between you and Vymotion. By creating an account, purchasing credits or a plan, or
          otherwise using vymotion.org, you accept them. If you use Vymotion on behalf of a company or agency, you confirm you have
          authority to bind that entity.
        </P>
      </>
    ),
  },
  {
    id: 'eligibility',
    h: '2. Eligibility & accounts',
    body: (
      <>
        <UL items={[
          'You must be at least 18 years old to use Vymotion.',
          'You are responsible for your account credentials and for all activity under your account.',
          'One person or entity per account unless your plan explicitly allows team seats.',
          'You must provide accurate account information and keep it current.',
        ]} />
        <P>
          We may suspend or terminate accounts that violate these Terms, abuse the service, or create risk for us, other users, or
          third parties. Where practical we will notify you and give you a chance to remedy the issue first.
        </P>
      </>
    ),
  },
  {
    id: 'credits',
    h: '3. Credits, plans & billing',
    body: (
      <>
        <UL items={[
          'Generation is paid for with Vymotion credits. Credits are a prepaid usage allowance — they are not money, have no cash value, and are not redeemable or transferable.',
          'Subscription credits are granted each billing cycle and unused subscription credits do not roll over to the next cycle.',
          'Top-up (pack) credits remain usable for 12 months from purchase.',
          'Prices for each generation type are shown in the app before you confirm; credits are deducted when a generation is delivered and automatically refunded to your balance if it fails.',
          'Payments are processed by Polar (polar.sh) acting as Merchant of Record. Polar handles your payment details — Vymotion never sees or stores your card number.',
          'Subscriptions renew automatically until cancelled. You can cancel any time from Settings → Billing; access and subscription credits remain until the end of the paid period.',
          'Applicable taxes (VAT/GST/sales tax) are calculated and collected by Polar at checkout based on your location.',
        ]} />
        <P>
          <strong style={{ color: '#F4F4F5' }}>Refunds.</strong> Because credits fund immediate, non-recoverable compute, purchases
          are generally non-refundable once credits have been spent. If something went wrong — duplicate charge, failed delivery,
          accidental purchase with unspent credits — contact <Mail subject="Billing issue" /> and we will make it right. Nothing in
          this section limits statutory refund rights you hold as a consumer in your country (including under EU/UK consumer law).
        </P>
      </>
    ),
  },
  {
    id: 'likeness',
    h: '4. Responsible AI, likeness & acceptable use',
    body: (
      <>
        <P>
          Vymotion is built for <em>original, synthetic personas</em>. You must not use it to imitate real people or to deceive.
          Specifically, you agree not to create, upload, or publish:
        </P>
        <UL items={[
          'Content using the likeness, name, or voice of a real, identifiable person without their documented consent — including celebrities and private individuals ("deepfakes").',
          'Sexual content involving minors, or any persona presented as a minor in sexual or suggestive contexts. Zero tolerance; violations are reported to authorities.',
          'Non-consensual intimate imagery of any real person.',
          'Content designed to defraud, defame, harass, or impersonate — including fake endorsements, fake reviews, or scam promotions.',
          'Political disinformation or content that misrepresents synthetic media as authentic footage of real events.',
          'Content that infringes copyright, trademark, or other rights of third parties (see also the DMCA Policy).',
          'Uploads containing malware, or attempts to probe, overload, or bypass the security or billing of the service.',
        ]} />
        <P>
          Where you publish AI-generated content commercially or to social platforms, you are responsible for complying with the
          disclosure rules that apply to you (e.g. the EU AI Act&rsquo;s transparency obligations for synthetic media, FTC endorsement
          guides, and each platform&rsquo;s synthetic-media labeling policies). See also our <L to="/dmca">DMCA Policy</L>.
        </P>
      </>
    ),
  },
  {
    id: 'content',
    h: '5. Your content & ownership',
    body: (
      <>
        <UL items={[
          'You retain ownership of the personas you design, the prompts and reference material you upload, and — to the extent permitted by the underlying model providers’ terms and applicable law — the images and videos you generate.',
          'You grant us the limited licence needed to operate the service: storing, processing, and transmitting your content to the AI providers you invoke, and displaying it back to you.',
          'We do not use your generated content or uploads to train AI models, and we do not publish your content anywhere unless you use the publishing tools to do so yourself.',
          'You are solely responsible for the content you generate and publish, including verifying you have rights to any reference images you upload.',
        ]} />
        <P>
          AI output can be inaccurate, unintentionally similar to existing works, or unsuitable for your purpose. Review everything
          before you publish or sell it.
        </P>
      </>
    ),
  },
  {
    id: 'third-party',
    h: '6. Third-party services',
    body: (
      <>
        <P>
          Parts of Vymotion depend on services you connect or that we call on your behalf: authentication (Clerk), payments (Polar),
          AI generation (e.g. Higgsfield — via your own Higgsfield account and its terms — fal.ai model hosting, Anthropic), social
          publishing, and hosting/CDN (Vercel, Cloudflare). Your use of a connected third-party account is governed by that
          provider&rsquo;s own terms, and we are not responsible for their availability or decisions (e.g. a model provider rejecting
          a prompt, or a social platform removing a post).
        </P>
      </>
    ),
  },
  {
    id: 'earnings',
    h: '7. Earnings disclaimer',
    body: (
      <P>
        Any earnings figures, market sizes, or examples shown on this site are industry estimates for illustration only. They are
        not a promise or guarantee of income. Results depend on your niche, effort, audience, and market conditions, and many users
        may earn nothing.
      </P>
    ),
  },
  {
    id: 'disclaimer',
    h: '8. Disclaimers & limitation of liability',
    body: (
      <>
        <P>
          The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the maximum extent permitted by law, we
          disclaim all implied warranties (merchantability, fitness for a particular purpose, non-infringement) and do not warrant
          that generation will be uninterrupted, error-free, or produce any particular quality of output.
        </P>
        <P>
          To the maximum extent permitted by law, Vymotion&rsquo;s total liability for any claim arising out of the service is
          limited to the amount you paid us in the 12 months before the event giving rise to the claim. We are not liable for
          indirect, incidental, special, or consequential damages, or for lost profits, revenue, or data. Nothing in these Terms
          excludes liability that cannot be excluded by law (including liability for fraud, or consumer rights in your country of
          residence).
        </P>
      </>
    ),
  },
  {
    id: 'termination',
    h: '9. Termination',
    body: (
      <P>
        You can stop using Vymotion and delete your account at any time from Settings; deletion removes your server-side data as
        described in the <L to="/privacy">Privacy Policy</L>. We may suspend or terminate the service or your account for breach of
        these Terms. On termination for breach, unused credits from the breaching account may be forfeited; otherwise Section 3&rsquo;s
        billing rules apply.
      </P>
    ),
  },
  {
    id: 'changes',
    h: '10. Changes to these Terms',
    body: (
      <P>
        We may update these Terms as the product and the law evolve. For material changes we will give notice in the app or by email
        at least 14 days before they take effect. Continuing to use the service after that date means you accept the updated Terms.
      </P>
    ),
  },
  {
    id: 'law',
    h: '11. Governing law & contact',
    body: (
      <>
        <P>
          These Terms are governed by the laws of India, without regard to conflict-of-law rules, and disputes are subject to the
          exclusive jurisdiction of the courts there — except that if you are a consumer in the EU, UK, or another jurisdiction with
          mandatory local consumer protections, you keep the protections and forum rights of your country of residence.
        </P>
        <P>
          Questions about these Terms: <Mail subject="Terms of Service" /> or the <L to="/contact">contact page</L>.
        </P>
      </>
    ),
  },
]

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      description="The terms that govern your use of Vymotion — accounts, credits and billing, acceptable use for AI-generated personas, content ownership, and liability."
      path="/terms"
      intro={
        <P>
          These Terms of Service govern your use of Vymotion, the studio for creating and monetizing AI influencers. The short
          version: pay for what you generate with credits, keep ownership of what you create, never fake real people, and use the
          tools honestly. The full version follows.
        </P>
      }
      sections={SECTIONS}
    />
  )
}
