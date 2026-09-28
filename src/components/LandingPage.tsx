import { ArrowRight, Flame, Lock, TrendingUp, Zap, Shield, BarChart3, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const CA = '0xFb3a730cdb68D6EC773b85bD4C44Fd5daAb9AeBB';

function CopyCA() {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(CA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-mono transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{ background: 'rgba(172,198,233,0.08)', border: '1px solid rgba(172,198,233,0.2)', color: 'var(--subtle)', cursor: 'pointer' }}
    >
      <span style={{ color: 'var(--accent)', fontFamily: 'sans-serif', fontWeight: 600 }}>$ARCS CA</span>
      {CA.slice(0, 10)}...{CA.slice(-6)}
      {copied
        ? <Check className="size-3 shrink-0" style={{ color: 'var(--success)' }} />
        : <Copy className="size-3 shrink-0" style={{ color: 'var(--accent)' }} />}
    </button>
  );
}

// Inline SVG logo — matches public/arcstable-logo.svg
function ArcStableLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="200" fill="#0d1b2f"/>
      <circle cx="200" cy="200" r="178" stroke="url(#rg)" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <path d="M 80 230 Q 200 160 320 230" stroke="url(#ag1)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M 100 200 Q 200 135 300 200" stroke="url(#ag2)" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      <path d="M 120 170 Q 200 110 280 170" stroke="url(#ag3)" strokeWidth="6" fill="none" strokeLinecap="round"/>
      <g transform="translate(200,200)">
        <polygon points="0,-34 24,0 0,34 -24,0" fill="url(#df)" opacity="0.18"/>
        <polygon points="0,-22 15,0 0,22 -15,0" fill="url(#df)" opacity="0.55"/>
        <circle cx="0" cy="0" r="6" fill="url(#cd)"/>
      </g>
      <g opacity="0.12">
        {[136,200,264].map(x => [136,200,264].map(y => (
          x === 200 && y === 200 ? null :
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#acc6e9"/>
        )))}
      </g>
      <g transform="translate(248,248)" opacity="0.8">
        <rect x="-11" y="-2" width="22" height="16" rx="4" fill="#acc6e9" opacity="0.2" stroke="#acc6e9" strokeWidth="1.2"/>
        <path d="M -6 -2 V -8 A 6 6 0 0 1 6 -8 V -2" stroke="#acc6e9" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <circle cx="0" cy="6" r="2.5" fill="#acc6e9" opacity="0.9"/>
      </g>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#acc6e9" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="#5b8fd4" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#acc6e9" stopOpacity="0.6"/>
        </linearGradient>
        <linearGradient id="ag1" x1="80" y1="230" x2="320" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#acc6e9" stopOpacity="0.3"/>
          <stop offset="50%" stopColor="#7ab0de" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#acc6e9" stopOpacity="0.3"/>
        </linearGradient>
        <linearGradient id="ag2" x1="100" y1="200" x2="300" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#acc6e9" stopOpacity="0.5"/>
          <stop offset="50%" stopColor="#5b8fd4" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#acc6e9" stopOpacity="0.5"/>
        </linearGradient>
        <linearGradient id="ag3" x1="120" y1="170" x2="280" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#cbdbf2" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="100%" stopColor="#cbdbf2" stopOpacity="0.7"/>
        </linearGradient>
        <linearGradient id="df" x1="-24" y1="-34" x2="24" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#cbdbf2"/>
          <stop offset="100%" stopColor="#5b8fd4"/>
        </linearGradient>
        <radialGradient id="cd" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#acc6e9"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'StableSwap AMM',
    desc: 'Curve-style amplified invariant gives near-zero slippage on USDC/EURC swaps. Amplification coefficient A=100 — tighter than any generic AMM.',
    color: '#acc6e9',
  },
  {
    icon: Lock,
    title: 'veARCS Governance',
    desc: 'Lock ARCS for up to 4 years to earn voting power. The longer you lock, the more emissions and protocol fees you direct.',
    color: '#8dd89f',
  },
  {
    icon: Flame,
    title: 'Deflationary Buyback',
    desc: 'Every swap generates a fee. 30% is used to buy ARCS on the open market and burn it permanently — reducing supply with every trade.',
    color: '#e8c46a',
  },
  {
    icon: Zap,
    title: 'Real USDC Yield',
    desc: 'veARCS holders earn real USDC every week — not more tokens. Protocol revenue is distributed pro-rata to locked stakers.',
    color: '#e86d7a',
  },
  {
    icon: BarChart3,
    title: 'Gauge Voting',
    desc: 'Cast your veARCS voting power to steer weekly ARCS emissions. Protocols bribe voters — creating an additional income stream for holders.',
    color: '#c4b5fd',
  },
  {
    icon: Shield,
    title: 'Built on Arc',
    desc: 'USDC is the native gas token. Zero friction for users — one asset covers swaps, fees, and gas. Sub-second finality. No ETH required.',
    color: '#7dd3fc',
  },
];

const STATS = [
  { label: 'Swap Fee', value: '0.04%', sub: '4 basis points' },
  { label: 'AMM Type', value: 'Stable', sub: 'A = 100 amplification' },
  { label: 'Max Lock', value: '4 years', sub: 'veARCS governance' },
  { label: 'Chain', value: 'Arc', sub: 'USDC-native gas' },
];

const TOKENOMICS = [
  { label: 'Total Supply', value: '100,000,000', unit: 'ARCS' },
  { label: 'LP Emissions', value: '1,000,000', unit: 'ARCS / week' },
  { label: 'Halving', value: 'Every 52 weeks', unit: '−50% emission' },
  { label: 'Buyback Rate', value: '30%', unit: 'of swap fees burned' },
];

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps) {
  return (
    <div
      className="min-h-dvh"
      style={{
        background: 'var(--bg-gradient)',
        fontFamily: "'DM Sans', sans-serif",
        color: 'var(--ink)',
      }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(13,27,47,0.8)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <ArcStableLogo size={36} />
            <span
              className="display text-xl font-bold"
              style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
            >
              Arc<span style={{ color: 'var(--accent)' }}>Stable</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="hidden rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest sm:block"
              style={{
                background: 'rgba(172,198,233,0.12)',
                color: 'var(--accent)',
                border: '1px solid rgba(172,198,233,0.2)',
              }}
            >
              Mainnet
            </span>
            <button
              onClick={onEnterApp}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: 'var(--accent)', color: '#0d1b2f' }}
            >
              Launch App <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-6 pb-24 pt-20 text-center">
        {/* Glow rings */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(91,143,212,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative flex flex-col items-center">
          {/* Logo mark */}
          <div className="mb-8">
            <ArcStableLogo size={120} />
          </div>

          {/* Headline */}
          <h1
            className="display mb-5 max-w-3xl text-5xl font-bold leading-tight text-balance sm:text-6xl"
            style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}
          >
            The Liquidity
            <br />
            <span style={{ color: 'var(--accent)' }}>Backbone of Arc</span>
          </h1>

          <p
            className="mb-8 max-w-xl text-lg leading-relaxed text-pretty"
            style={{ color: 'var(--muted)' }}
          >
            ArcStable is a Curve-style stable AMM built for Arc Mainnet. Provide
            liquidity, earn real USDC yield, lock governance tokens, and watch ARCS
            deflate with every swap.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onEnterApp}
              className="flex items-center gap-2 rounded-2xl px-7 py-4 text-base font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: 'var(--accent)', color: '#0d1b2f' }}
            >
              Launch App <ArrowRight className="size-4" />
            </button>
            <a
              href="https://x.com/arcstable2026"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--ink-2)',
                border: '1px solid var(--border)',
              }}
            >
              {/* X (Twitter) icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              @arcstable2026
            </a>
          </div>

          {/* CA pill */}
          <div className="mt-5 flex justify-center">
            <CopyCA />
          </div>

          {/* Stat pills */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {STATS.map(({ label, value, sub }) => (
              <div
                key={label}
                className="rounded-2xl px-5 py-3 text-center"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  className="display text-2xl font-bold tabular-nums"
                  style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
                >
                  {value}
                </div>
                <div className="mt-0.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>
                  {label}
                </div>
                <div className="text-xs" style={{ color: 'var(--subtle)', opacity: 0.7 }}>
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="py-20"
        style={{ background: 'rgba(255,255,255,0.025)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <span
              className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--accent)', letterSpacing: '0.1em' }}
            >
              The Protocol
            </span>
            <h2
              className="display text-4xl font-bold text-balance"
              style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
            >
              Built differently
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-pretty" style={{ color: 'var(--muted)' }}>
              Every component reinforces the others. Swaps generate fees. Fees burn ARCS.
              Burn pressure lifts ARCS price. Higher price rewards veARCS holders — who
              then vote more liquidity back in.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="rounded-3xl p-6 transition-all hover:scale-[1.015]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div
                  className="mb-4 flex size-11 items-center justify-center rounded-2xl"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                >
                  <Icon className="size-5" style={{ color }} />
                </div>
                <h3
                  className="display mb-2 text-base font-bold"
                  style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-pretty" style={{ color: 'var(--muted)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tokenomics */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <span
              className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--accent)', letterSpacing: '0.1em' }}
            >
              ARCS Token
            </span>
            <h2
              className="display text-4xl font-bold text-balance"
              style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
            >
              Designed to deflate
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-pretty" style={{ color: 'var(--muted)' }}>
              Halvings reduce emissions every year. Buybacks remove supply permanently.
              Real USDC yield creates demand. Three forces — one direction.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            {/* Tokenomics grid */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {TOKENOMICS.map(({ label, value, unit }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(172,198,233,0.06)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="display text-xl font-bold tabular-nums"
                    style={{ color: 'var(--accent)', letterSpacing: '-0.02em' }}
                  >
                    {value}
                  </div>
                  <div className="mt-1 text-xs font-semibold" style={{ color: 'var(--subtle)' }}>{label}</div>
                  <div className="text-[11px]" style={{ color: 'var(--subtle)', opacity: 0.7 }}>{unit}</div>
                </div>
              ))}
            </div>

            {/* Fee split bar */}
            <div
              className="rounded-3xl p-6"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
            >
              <div className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
                Swap Fee Distribution
              </div>
              {/* Visual bar */}
              <div className="mb-4 flex h-3 overflow-hidden rounded-full">
                <div style={{ width: '50%', background: '#8dd89f' }} />
                <div style={{ width: '30%', background: '#e86d7a' }} />
                <div style={{ width: '20%', background: '#acc6e9' }} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { color: '#8dd89f', pct: '50%', label: 'LP Providers' },
                  { color: '#e86d7a', pct: '30%', label: 'Buyback & Burn' },
                  { color: '#acc6e9', pct: '20%', label: 'veARCS Real Yield' },
                ].map(({ color, pct, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <div>
                      <div className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{pct}</div>
                      <div className="text-xs" style={{ color: 'var(--subtle)' }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section
        className="py-20"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="mx-auto max-w-2xl px-6 text-center">
          <ArcStableLogo size={72} />
          <h2
            className="display mt-6 text-4xl font-bold text-balance"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
          >
            Ready to provide liquidity?
          </h2>
          <p className="mt-3 text-base text-pretty" style={{ color: 'var(--muted)' }}>
            Connect your wallet, deposit USDC and EURC, and start earning
            real USDC yield from every swap on Arc.
          </p>
          <button
            onClick={onEnterApp}
            className="mt-8 flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold transition-all hover:scale-[1.03] active:scale-[0.97] mx-auto"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            Enter ArcStable <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-10 text-center text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--subtle)' }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <ArcStableLogo size={20} />
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>ArcStable</span>
        </div>
        <p className="mb-3">Stable AMM · veToken Governance · Deflationary ARCS · Built on Arc Mainnet</p>
        {/* Social links */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <a
            href="https://x.com/arcstable2026"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-80"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            @arcstable2026
          </a>
          <a
            href={`https://explorer.arc.io/address/0xFb3a730cdb68D6EC773b85bD4C44Fd5daAb9AeBB`}
            target="_blank"
            rel="noreferrer"
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--subtle)', textDecoration: 'none' }}
          >
            View $ARCS on Explorer
          </a>
        </div>
        {/* CA copy */}
        <div className="flex justify-center mb-4">
          <CopyCA />
        </div>
        {/* Copyright */}
        <p className="text-xs" style={{ color: 'var(--subtle)', opacity: 0.5 }}>
          &copy; 2026 ArcStable Incorporated, Germany. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
