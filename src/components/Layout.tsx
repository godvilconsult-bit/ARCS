import React from 'react';
import { ConnectKitButton } from 'connectkit';
import { Layers, ArrowLeftRight, Droplets, Lock, Trophy, Flame } from 'lucide-react';
import type { Tab } from '../App';

interface LayoutProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  children: React.ReactNode;
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'swap', label: 'Swap', icon: ArrowLeftRight },
  { id: 'liquidity', label: 'Liquidity', icon: Droplets },
  { id: 'lock', label: 'Lock', icon: Lock },
  { id: 'rewards', label: 'Rewards', icon: Trophy },
  { id: 'tokenomics', label: 'Tokenomics', icon: Flame },
];

export function Layout({ activeTab, setActiveTab, children }: LayoutProps) {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top nav */}
      <nav
        className="sticky top-0 z-40 w-full px-4 py-3"
        style={{
          background: 'rgba(13,27,47,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-8 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #acc6e9 0%, #5b8fd4 100%)' }}
            >
              <Layers className="size-4" style={{ color: '#0d1b2f' }} />
            </div>
            <div>
              <span className="display text-base font-bold tracking-tight" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                Arc<span style={{ color: 'var(--accent)' }}>Stable</span>
              </span>
              <span
                className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ background: 'rgba(172,198,233,0.15)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.25)' }}
              >
                Mainnet
              </span>
            </div>
          </div>

          {/* Connect wallet */}
          <ConnectKitButton />
        </div>
      </nav>

      {/* Tab bar */}
      <div className="sticky top-[57px] z-30 w-full" style={{ background: 'rgba(13,27,47,0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)' }}>
        <div className="mx-auto flex max-w-5xl gap-0">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-1.5 px-5 py-3 text-sm font-medium transition-all"
                style={{
                  color: active ? 'var(--accent)' : 'var(--subtle)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="mt-8 pb-6 text-center text-xs" style={{ color: 'var(--subtle)' }}>
        ArcStable — Curve-style stable AMM on Arc Mainnet · USDC/EURC pool · A=100
      </footer>
    </div>
  );
}
