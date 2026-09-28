import { useEffect, useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

// Full SVG source — self-contained, no external refs
const SVG_SOURCE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
  <circle cx="200" cy="200" r="200" fill="#0d1b2f"/>
  <circle cx="200" cy="200" r="178" stroke="url(#ringGlow)" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M 80 230 Q 200 160 320 230" stroke="url(#arcGrad1)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M 100 200 Q 200 135 300 200" stroke="url(#arcGrad2)" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M 120 170 Q 200 110 280 170" stroke="url(#arcGrad3)" stroke-width="6" fill="none" stroke-linecap="round"/>
  <g transform="translate(200,200)">
    <polygon points="0,-34 24,0 0,34 -24,0" fill="url(#diamondFill)" opacity="0.18"/>
    <polygon points="0,-22 15,0 0,22 -15,0" fill="url(#diamondFill)" opacity="0.55"/>
    <circle cx="0" cy="0" r="6" fill="url(#coreDot)"/>
  </g>
  <g opacity="0.12">
    <circle cx="136" cy="136" r="2.5" fill="#acc6e9"/>
    <circle cx="200" cy="118" r="2.5" fill="#acc6e9"/>
    <circle cx="264" cy="136" r="2.5" fill="#acc6e9"/>
    <circle cx="118" cy="200" r="2.5" fill="#acc6e9"/>
    <circle cx="282" cy="200" r="2.5" fill="#acc6e9"/>
    <circle cx="136" cy="264" r="2.5" fill="#acc6e9"/>
    <circle cx="200" cy="282" r="2.5" fill="#acc6e9"/>
    <circle cx="264" cy="264" r="2.5" fill="#acc6e9"/>
  </g>
  <g transform="translate(248,248)" opacity="0.8">
    <rect x="-11" y="-2" width="22" height="16" rx="4" fill="#acc6e9" opacity="0.2" stroke="#acc6e9" stroke-width="1.2"/>
    <path d="M -6 -2 V -8 A 6 6 0 0 1 6 -8 V -2" stroke="#acc6e9" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="0" cy="6" r="2.5" fill="#acc6e9" opacity="0.9"/>
  </g>
  <defs>
    <linearGradient id="ringGlow" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#acc6e9" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#5b8fd4" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#acc6e9" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="arcGrad1" x1="80" y1="230" x2="320" y2="230" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#acc6e9" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#7ab0de" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#acc6e9" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="arcGrad2" x1="100" y1="200" x2="300" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#acc6e9" stop-opacity="0.5"/>
      <stop offset="50%" stop-color="#5b8fd4" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#acc6e9" stop-opacity="0.5"/>
    </linearGradient>
    <linearGradient id="arcGrad3" x1="120" y1="170" x2="280" y2="170" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#cbdbf2" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#cbdbf2" stop-opacity="0.7"/>
    </linearGradient>
    <linearGradient id="diamondFill" x1="-24" y1="-34" x2="24" y2="34" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#cbdbf2"/>
      <stop offset="100%" stop-color="#5b8fd4"/>
    </linearGradient>
    <radialGradient id="coreDot" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#acc6e9"/>
    </radialGradient>
  </defs>
</svg>`;

// Build a data: URI for the SVG — works as a direct href, no programmatic click needed
const SVG_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG_SOURCE)}`;

// Inline JSX logo for display
function LogoMark({ size = 144 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="200" fill="#0d1b2f"/>
      <circle cx="200" cy="200" r="178" stroke="url(#rg2)" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <path d="M 80 230 Q 200 160 320 230" stroke="url(#ag1b)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M 100 200 Q 200 135 300 200" stroke="url(#ag2b)" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      <path d="M 120 170 Q 200 110 280 170" stroke="url(#ag3b)" strokeWidth="6" fill="none" strokeLinecap="round"/>
      <g transform="translate(200,200)">
        <polygon points="0,-34 24,0 0,34 -24,0" fill="url(#dfb)" opacity="0.18"/>
        <polygon points="0,-22 15,0 0,22 -15,0" fill="url(#dfb)" opacity="0.55"/>
        <circle cx="0" cy="0" r="6" fill="url(#cdb)"/>
      </g>
      <g opacity="0.12">
        <circle cx="136" cy="136" r="2.5" fill="#acc6e9"/>
        <circle cx="200" cy="118" r="2.5" fill="#acc6e9"/>
        <circle cx="264" cy="136" r="2.5" fill="#acc6e9"/>
        <circle cx="118" cy="200" r="2.5" fill="#acc6e9"/>
        <circle cx="282" cy="200" r="2.5" fill="#acc6e9"/>
        <circle cx="136" cy="264" r="2.5" fill="#acc6e9"/>
        <circle cx="200" cy="282" r="2.5" fill="#acc6e9"/>
        <circle cx="264" cy="264" r="2.5" fill="#acc6e9"/>
      </g>
      <g transform="translate(248,248)" opacity="0.8">
        <rect x="-11" y="-2" width="22" height="16" rx="4" fill="#acc6e9" opacity="0.2" stroke="#acc6e9" strokeWidth="1.2"/>
        <path d="M -6 -2 V -8 A 6 6 0 0 1 6 -8 V -2" stroke="#acc6e9" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <circle cx="0" cy="6" r="2.5" fill="#acc6e9" opacity="0.9"/>
      </g>
      <defs>
        <linearGradient id="rg2" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#acc6e9" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="#5b8fd4" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#acc6e9" stopOpacity="0.6"/>
        </linearGradient>
        <linearGradient id="ag1b" x1="80" y1="230" x2="320" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#acc6e9" stopOpacity="0.3"/>
          <stop offset="50%" stopColor="#7ab0de" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#acc6e9" stopOpacity="0.3"/>
        </linearGradient>
        <linearGradient id="ag2b" x1="100" y1="200" x2="300" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#acc6e9" stopOpacity="0.5"/>
          <stop offset="50%" stopColor="#5b8fd4" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#acc6e9" stopOpacity="0.5"/>
        </linearGradient>
        <linearGradient id="ag3b" x1="120" y1="170" x2="280" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#cbdbf2" stopOpacity="0.7"/>
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="100%" stopColor="#cbdbf2" stopOpacity="0.7"/>
        </linearGradient>
        <linearGradient id="dfb" x1="-24" y1="-34" x2="24" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#cbdbf2"/>
          <stop offset="100%" stopColor="#5b8fd4"/>
        </linearGradient>
        <radialGradient id="cdb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#acc6e9"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

interface LogoKitProps {
  onBack: () => void;
}

export function LogoKit({ onBack }: LogoKitProps) {
  const [copied, setCopied] = useState(false);
  // PNG data URLs — built once on mount from canvas
  const [png512, setPng512] = useState('');
  const [png256, setPng256] = useState('');
  const [png1024, setPng1024] = useState('');

  useEffect(() => {
    // Render SVG to canvas at each size and store as PNG data URLs
    const sizes: [number, (v: string) => void][] = [
      [256, setPng256],
      [512, setPng512],
      [1024, setPng1024],
    ];
    sizes.forEach(([size, setter]) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      const blob = new Blob([SVG_SOURCE], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        setter(canvas.toDataURL('image/png'));
      };
      img.src = url;
    });
  }, []);

  function handleCopySvg() {
    void navigator.clipboard.writeText(SVG_SOURCE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const downloads = [
    { label: 'SVG', sub: 'Vector · any size · best for Argus', href: SVG_DATA_URI, filename: 'arcstable-logo.svg' },
    { label: 'PNG 512px', sub: 'Social · profile · headers', href: png512, filename: 'arcstable-logo-512.png' },
    { label: 'PNG 256px', sub: 'App icon · favicon', href: png256, filename: 'arcstable-logo-256.png' },
    { label: 'PNG 1024px', sub: 'Press kit · print', href: png1024, filename: 'arcstable-logo-1024.png' },
  ];

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 w-full px-6 py-4"
        style={{ background: 'rgba(13,27,47,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="display text-base font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              Arc<span style={{ color: 'var(--accent)' }}>Stable</span>
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--subtle)' }}>Brand Kit</span>
            </span>
          </div>
          <button
            onClick={onBack}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
          >
            Back
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="display mb-3 text-4xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            ArcStable Brand Kit
          </h1>
          <p className="text-base" style={{ color: 'var(--subtle)' }}>
            Right-click any logo below and save, or use the download links. Use SVG for Argus.
          </p>
        </div>

        {/* Logo showcase — right-click to save directly */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-6 rounded-3xl p-10" style={{ background: '#0d1b2f', border: '1px solid var(--border)' }}>
            <LogoMark size={160} />
            <div className="text-center">
              <div className="display text-xl font-bold" style={{ color: '#f9faf3', letterSpacing: '-0.02em' }}>
                Arc<span style={{ color: '#acc6e9' }}>Stable</span>
              </div>
              <div className="mt-1 text-xs" style={{ color: '#94a3b8' }}>On dark — preferred · right-click to save</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 rounded-3xl p-10" style={{ background: '#f0f4f8', border: '1px solid rgba(18,45,69,0.12)' }}>
            <LogoMark size={160} />
            <div className="text-center">
              <div className="display text-xl font-bold" style={{ color: '#0d1b2f', letterSpacing: '-0.02em' }}>
                Arc<span style={{ color: '#1e5fa0' }}>Stable</span>
              </div>
              <div className="mt-1 text-xs" style={{ color: '#64748b' }}>On light · right-click to save</div>
            </div>
          </div>
        </div>

        {/* Download section */}
        <div className="mb-8 rounded-3xl p-6" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <h2 className="display mb-2 text-lg font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Download Files
          </h2>
          <p className="mb-5 text-sm" style={{ color: 'var(--subtle)' }}>
            Click a link below — your browser will open the file. Use Save As (Ctrl+S / Cmd+S) to save it, or right-click the link and choose "Save link as".
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {downloads.map(({ label, sub, href, filename }) => (
              <a
                key={label}
                href={href || '#'}
                download={filename}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                  opacity: href ? 1 : 0.4,
                  cursor: href ? 'pointer' : 'wait',
                }}
              >
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(172,198,233,0.15)' }}
                >
                  <ExternalLink className="size-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{label}</div>
                  <div className="text-xs" style={{ color: 'var(--subtle)' }}>{href ? sub : 'Generating…'}</div>
                </div>
              </a>
            ))}
          </div>

          {/* Copy SVG source */}
          <div
            className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
          >
            <span className="text-sm" style={{ color: 'var(--subtle)' }}>Copy raw SVG code (paste into Figma, Illustrator, etc.)</span>
            <button
              onClick={handleCopySvg}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: copied ? 'rgba(141,216,159,0.15)' : 'rgba(172,198,233,0.15)',
                color: copied ? 'var(--success)' : 'var(--accent)',
                border: `1px solid ${copied ? 'rgba(141,216,159,0.3)' : 'rgba(172,198,233,0.25)'}`,
              }}
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied!' : 'Copy SVG'}
            </button>
          </div>
        </div>

        {/* Brand guide */}
        <div className="rounded-3xl p-6" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <h2 className="display mb-5 text-lg font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>Brand Guide</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Primary color', value: '#0d1b2f — deep navy' },
              { label: 'Accent color', value: '#acc6e9 — Arc pale blue' },
              { label: 'Token ticker', value: 'ARCS' },
              { label: 'Protocol name', value: 'ArcStable' },
              { label: 'Tagline', value: 'The Liquidity Backbone of Arc' },
              { label: 'Argus category', value: 'DeFi · Stable AMM · veToken' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl px-4 py-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>{label}</div>
                <div className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
