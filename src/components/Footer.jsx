import { useNavigate } from 'react-router-dom'
import {
  Text,
  Button,
  Link,
  Divider,
  Grid,
  VStack,
  HStack,
} from '@astryxdesign/core'
import { M } from '../ui/marketing'
import AstryxScope from '../ui/ax/AstryxScope'

// Rich marketing footer — shared across the always-dark marketing surface (Landing, How it
// works, Earnings). Internal links use the SPA router; anchors within a page use hashes.
//
// UI: Astryx Text / Button / Link / Grid (pilot 3). Forced dark mode via AstryxScope.

const COLUMNS = [
  {
    title: 'Product',
    links: [
      ['Create influencer', '/create'],
      ['Documentation', '/docs'],
      ['How it works', '/how-it-works'],
      ['Pricing', '/pricing'],
      ['Dashboard', '/dashboard'],
      ['Brand deals', '/brand-deals'],
    ],
  },
  {
    title: 'Use cases',
    links: [
      ['Earn with AI influencers', '/earnings'],
      ['For creators', '/earnings#creators'],
      ['For agencies', '/earnings#agencies'],
      ['For brands', '/earnings#brands'],
      ['Sell UGC services', '/earnings#services'],
    ],
  },
  {
    title: 'Markets',
    links: [
      ['United States', '/earnings#usa'],
      ['United Kingdom', '/earnings#europe'],
      ['Europe (EU)', '/earnings#europe'],
      ['Inspiration', '/inspiration'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About Vymotion', '/how-it-works'],
      ['Pricing & plans', '/pricing'],
      ['Contact', 'mailto:hello@vymotion.org'],
    ],
  },
]

const LEGAL = [
  ['Terms', '/how-it-works#terms'],
  ['Privacy', '/how-it-works#privacy'],
  ['Responsible AI & likeness', '/how-it-works#policy'],
]

function isExternal(href) {
  return href.startsWith('http') || href.startsWith('mailto:')
}

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" style={{ display: 'block' }} aria-hidden="true">
      <rect width="28" height="28" rx="9" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.16)" />
      <g stroke="#C7F24E" strokeWidth="3.05" strokeLinecap="round">
        <line x1="8.1" y1="7.4" x2="12.9" y2="20.4" />
        <line x1="12.9" y1="7.4" x2="17.7" y2="20.4" />
        <line x1="17.7" y1="7.4" x2="22.5" y2="20.4" />
      </g>
    </svg>
  )
}

export default function Footer() {
  const navigate = useNavigate()

  const go = (href) => (e) => {
    if (isExternal(href)) return
    e.preventDefault()
    if (href.includes('#')) {
      const [path, hash] = href.split('#')
      navigate(path)
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 60)
    } else {
      navigate(href)
      window.scrollTo({ top: 0 })
    }
  }

  return (
    <AstryxScope mode="dark">
      <footer style={{ background: M.bg, borderTop: `1px solid ${M.line}`, color: M.ink }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '64px 24px 40px' }}>

          {/* Top: brand + CTA */}
          <HStack
            justify="between"
            align="start"
            gap={8}
            style={{
              flexWrap: 'wrap',
              paddingBottom: 44,
              borderBottom: `1px solid ${M.lineSoft}`,
            }}
          >
            <VStack gap={3} style={{ maxWidth: 360 }}>
              <HStack gap={2} align="center">
                <LogoMark />
                <Text type="body" weight="bold" size="lg" color="primary">
                  vy<span style={{ color: M.brand }}>motion</span>
                </Text>
              </HStack>
              <Text type="body" size="sm" color="secondary" display="block">
                The studio to create, grow, and monetize AI influencers — photos, video, and brand deals in one place. Built for creators and agencies across the US and Europe.
              </Text>
            </VStack>

            <VStack gap={2} align="start">
              <Button
                label="Start creating free →"
                variant="primary"
                size="lg"
                onClick={go('/create')}
                style={{
                  borderRadius: 999,
                  background: M.brand,
                  color: M.brandInk,
                  border: '1px solid rgba(255,255,255,0.35)',
                  boxShadow: '0 0 26px rgba(199,242,78,0.28)',
                  fontWeight: 800,
                }}
              />
              <Text type="supporting" size="xsm" color="secondary">
                Free credits on sign-up · no card required
              </Text>
            </VStack>
          </HStack>

          {/* Link columns */}
          <div style={{ padding: '40px 0' }}>
            <Grid columns={{ minWidth: 140, max: 4 }} gap={7} className="footer-cols">
              {COLUMNS.map((col) => (
                <VStack key={col.title} gap={1}>
                  <Text
                    type="supporting"
                    size="xsm"
                    weight="bold"
                    color="primary"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}
                  >
                    {col.title}
                  </Text>
                  {col.links.map(([label, href]) => (
                    isExternal(href) ? (
                      <Link
                        key={label}
                        as="a"
                        href={href}
                        isExternalLink={href.startsWith('http')}
                        color="secondary"
                        size="sm"
                        style={{ padding: '5px 0', display: 'block' }}
                      >
                        {label}
                      </Link>
                    ) : (
                      <Link
                        key={label}
                        href={href}
                        onClick={go(href)}
                        color="secondary"
                        size="sm"
                        style={{ padding: '5px 0', display: 'block' }}
                      >
                        {label}
                      </Link>
                    )
                  ))}
                </VStack>
              ))}
            </Grid>
          </div>

          <Divider variant="subtle" />

          {/* Bottom bar */}
          <HStack
            justify="between"
            align="center"
            gap={4}
            style={{ flexWrap: 'wrap', paddingTop: 28 }}
          >
            <Text type="supporting" size="xsm" color="secondary">
              © {new Date().getFullYear()} Vymotion. All rights reserved.
            </Text>
            <HStack gap={5} style={{ flexWrap: 'wrap' }}>
              {LEGAL.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={go(href)}
                  color="secondary"
                  size="xsm"
                >
                  {label}
                </Link>
              ))}
            </HStack>
          </HStack>

          <Text
            type="supporting"
            size="xsm"
            color="secondary"
            display="block"
            style={{ marginTop: 22, maxWidth: 760, opacity: 0.7, lineHeight: 1.6 }}
          >
            Earnings and market figures shown across this site are industry estimates for the AI / virtual-influencer and creator economy and are for illustration only. They are not a guarantee of income — individual results depend on niche, effort, audience, and market conditions.
          </Text>
        </div>
      </footer>
    </AstryxScope>
  )
}
