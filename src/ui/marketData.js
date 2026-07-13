// Shared market/earnings data for the marketing pages. All figures are industry ESTIMATES
// for the AI / virtual-influencer and creator economy, kept in one place so Landing and
// Earnings stay consistent (and easy to update). Sources are public market reports; numbers
// are rounded and illustrative — the pages carry a "not a guarantee of income" disclaimer.

// Virtual-influencer market size, global, USD billions (est., ~40% CAGR).
export const MARKET_GROWTH = [
  { label: '2023', value: 4.6 },
  { label: '2024', value: 6.1 },
  { label: '2025', value: 8.4 },
  { label: '2026', value: 11.6 },
  { label: '2027', value: 16 },
  { label: '2028', value: 22.5 },
  { label: '2029', value: 32 },
  { label: '2030', value: 45.5 },
]

// Typical sponsored-post rate by follower tier (USD). `bar` is the upper bound, used only
// to size the bar; `value` is the human-readable range shown to the reader.
export const TIER_EARNINGS = [
  { label: 'Nano · 1K–10K followers', value: '$50 – $500', bar: 500, note: 'Highest engagement; great for niche brands' },
  { label: 'Micro · 10K–100K', value: '$500 – $5,000', bar: 5000, note: 'The sweet spot for repeatable brand deals' },
  { label: 'Mid · 100K–500K', value: '$5,000 – $10,000', bar: 10000, note: 'Multi-post campaigns and retainers' },
  { label: 'Macro · 500K–1M+', value: '$10,000 – $25,000+', bar: 25000, note: 'Flagship campaigns and licensing' },
]

// Creator-economy spend momentum (~$480B/yr by 2027 ÷ seconds/yr ≈ per-second flow).
export const CREATOR_SPEND_PER_SEC = 7900

// Region market snapshots for the Earnings page.
export const REGIONS = [
  {
    id: 'usa', flag: '🇺🇸', name: 'United States',
    market: '$24B', marketLabel: 'US influencer-marketing spend (2024, est.)',
    stats: [
      ['$0.02–$0.10', 'typical brand pay per follower, per post'],
      ['#1', 'largest creator-economy market worldwide'],
      ['Net-30', 'common brand payment terms'],
    ],
    note: 'The US leads on brand budgets and sponsored-content rates. Bill clients in USD; Vymotion (via Polar) remits US sales tax automatically.',
  },
  {
    id: 'europe', flag: '🇪🇺', name: 'United Kingdom & Europe',
    market: '€18B+', marketLabel: 'EU + UK influencer-marketing spend (2024, est.)',
    stats: [
      ['GDPR-ready', 'clear AI-disclosure & data rules'],
      ['£/€', 'bill in pounds or euros'],
      ['VAT', 'handled by Vymotion’s merchant of record'],
    ],
    note: 'The UK, Germany, and France are the biggest European markets. Transparent AI-disclosure rules actually help — audiences reward creators who are upfront about virtual talent.',
  },
]

export const FAQ = [
  {
    q: 'What is an AI influencer?',
    a: 'An AI (or “virtual”) influencer is a computer-generated persona with a consistent face, style, and personality that posts on social media like a human creator. Brands sponsor them, audiences follow them, and — unlike a human — they can post around the clock and never need a photoshoot.',
  },
  {
    q: 'How do I actually make money with one?',
    a: 'The same ways human creators do: sponsored posts and brand deals, affiliate links, selling UGC (user-generated content) to businesses, shoutouts, subscriptions, and licensing your character. Vymotion helps you produce the content and pitch brands with campaign-ready shots.',
  },
  {
    q: 'Do I need any design or AI skills?',
    a: 'No. You describe the look and niche, and Vymotion generates everything — photos, outfits, poses, and video. Built-in AI even writes your captions and prompts. If you can use Instagram, you can use Vymotion.',
  },
  {
    q: 'Will the face stay the same across posts?',
    a: 'Yes — identity consistency is the core of Vymotion. Your influencer keeps the same face and body across thousands of images and videos, which is exactly what makes an audience trust and follow them.',
  },
  {
    q: 'Can I sell this as a service to clients in the US or Europe?',
    a: 'Absolutely. Many users run Vymotion as an agency — building AI influencers and monthly content packages for brands. You can bill clients in USD, GBP, or EUR, and Vymotion handles worldwide sales tax and VAT through its merchant-of-record billing.',
  },
  {
    q: 'How much does it cost to start?',
    a: 'Start for free — no card required to explore the studio. Generation and social publish unlock on Starter at $5/month (200 credits). You’re only charged credits for delivered generations; failed or filtered results are refunded.',
  },
  {
    q: 'Is this allowed — is it ethical?',
    a: 'Yes, when done responsibly. Vymotion is for original characters, not impersonating real people without consent. We recommend disclosing that your influencer is AI-generated, which is increasingly required (and rewarded) in the US and EU.',
  },
]
