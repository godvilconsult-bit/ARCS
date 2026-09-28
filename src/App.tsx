import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { Layout } from './components/Layout';
import { StatsBar } from './components/StatsBar';
import { SwapPanel } from './components/SwapPanel';
import { LiquidityPanel } from './components/LiquidityPanel';
import { LockPanel } from './components/LockPanel';
import { RewardsPanel } from './components/RewardsPanel';
import { TokenomicsPanel } from './components/TokenomicsPanel';

export type Tab = 'swap' | 'liquidity' | 'lock' | 'rewards' | 'tokenomics';

export default function App() {
  const [page, setPage] = useState<'landing' | 'app'>('landing');
  const [tab, setTab] = useState<Tab>('swap');

  if (page === 'landing') {
    return <LandingPage onEnterApp={() => setPage('app')} />;
  }

  return (
    <Layout activeTab={tab} setActiveTab={setTab}>
      <StatsBar />
      {tab === 'swap' && <SwapPanel />}
      {tab === 'liquidity' && <LiquidityPanel />}
      {tab === 'lock' && <LockPanel />}
      {tab === 'rewards' && <RewardsPanel />}
      {tab === 'tokenomics' && <TokenomicsPanel />}
    </Layout>
  );
}
