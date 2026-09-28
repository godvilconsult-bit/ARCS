import { useReadContract } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { TrendingUp, Droplets, Zap, Users } from 'lucide-react';
import { STABLE_POOL, GAUGE, USDC_ADDRESS, EURC_ADDRESS, ARC_CHAIN_ID } from '../contracts';

export function StatsBar() {
  const { data: r0 } = useReadContract({ ...STABLE_POOL, functionName: 'reserve0', chainId: ARC_CHAIN_ID });
  const { data: r1 } = useReadContract({ ...STABLE_POOL, functionName: 'reserve1', chainId: ARC_CHAIN_ID });
  const { data: totalLp } = useReadContract({ ...STABLE_POOL, functionName: 'totalLpSupply', chainId: ARC_CHAIN_ID });
  const { data: weeklyEm } = useReadContract({ ...GAUGE, functionName: 'weeklyEmission', chainId: ARC_CHAIN_ID });
  const { data: usdcSym } = useReadContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'symbol', chainId: ARC_CHAIN_ID });
  const { data: eurcSym } = useReadContract({ address: EURC_ADDRESS, abi: erc20Abi, functionName: 'symbol', chainId: ARC_CHAIN_ID });

  const totalTvl = r0 !== undefined && r1 !== undefined
    ? (parseFloat(formatUnits(r0 as bigint, 6)) + parseFloat(formatUnits(r1 as bigint, 6))).toLocaleString('en-US', { maximumFractionDigits: 2 })
    : null;
  const fmtLp = totalLp !== undefined ? parseFloat(formatUnits(totalLp as bigint, 18)).toLocaleString('en-US', { maximumFractionDigits: 2 }) : null;
  const fmtWeekly = weeklyEm !== undefined ? parseFloat(formatUnits(weeklyEm as bigint, 18)).toLocaleString() : null;

  const stats = [
    { label: 'Pool TVL', value: totalTvl !== null ? `$${totalTvl}` : '—', sub: `${usdcSym ?? 'USDC'} / ${eurcSym ?? 'EURC'}`, icon: Droplets, color: '#acc6e9' },
    { label: 'Total LP Shares', value: fmtLp !== null ? fmtLp : '—', sub: 'Outstanding', icon: TrendingUp, color: '#8dd89f' },
    { label: 'Weekly Emission', value: fmtWeekly !== null ? fmtWeekly : '—', sub: 'ARCS to LPs', icon: Zap, color: '#e8c46a' },
    { label: 'Swap Fee', value: '0.04%', sub: '4 bps · A = 100', icon: Users, color: '#e86d7a' },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="mb-2 flex items-center gap-1.5">
            <div className="flex size-6 items-center justify-center rounded-lg" style={{ background: `${color}22` }}>
              <Icon className="size-3.5" style={{ color }} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>{label}</span>
          </div>
          <div className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>{value}</div>
          <div className="mt-0.5 text-[11px]" style={{ color: 'var(--subtle)' }}>{sub}</div>
        </div>
      ))}
    </div>
  );
}
