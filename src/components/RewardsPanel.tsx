import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Loader2, ExternalLink, Zap, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { GAUGE, VE_ARCS, ARCS_TOKEN, ARC_CHAIN_ID } from '../contracts';

function parseOnchainError(e: unknown): string {
  const m = (e as { message?: string })?.message?.toLowerCase() ?? '';
  if (m.includes('user rejected')) return 'Transaction cancelled.';
  if (m.includes('reverted')) return 'Transaction failed. See contract for details.';
  return 'Something went wrong. Please try again.';
}

export function RewardsPanel() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [voteWeight, setVoteWeight] = useState('');
  const [claimHash, setClaimHash] = useState<`0x${string}` | undefined>();
  const [voteHash, setVoteHash] = useState<`0x${string}` | undefined>();

  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID;

  const { data: pendingReward, refetch: refetchPending } = useReadContract({ ...GAUGE, functionName: 'pendingReward', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });
  const { data: veBal } = useReadContract({ ...VE_ARCS, functionName: 'getVotingPower', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });
  const { data: arcsBal, refetch: refetchArcs } = useReadContract({ ...ARCS_TOKEN, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });
  const { data: userVoteWeight } = useReadContract({ ...GAUGE, functionName: 'userVoteWeight', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });
  const { data: totalVoted } = useReadContract({ ...GAUGE, functionName: 'totalVoted', chainId: ARC_CHAIN_ID });
  const { data: weeklyEm } = useReadContract({ ...GAUGE, functionName: 'weeklyEmission', chainId: ARC_CHAIN_ID });

  const fmtPending = pendingReward !== undefined ? parseFloat(formatUnits(pendingReward as bigint, 18)).toFixed(4) : '—';
  const fmtVeBal = veBal !== undefined ? parseFloat(formatUnits(veBal as bigint, 18)).toFixed(2) : '—';
  const fmtArcs = arcsBal !== undefined ? parseFloat(formatUnits(arcsBal as bigint, 18)).toFixed(2) : '—';
  const fmtUserVote = userVoteWeight !== undefined ? parseFloat(formatUnits(userVoteWeight as bigint, 18)).toFixed(2) : '0';
  const fmtTotalVoted = totalVoted !== undefined ? parseFloat(formatUnits(totalVoted as bigint, 18)).toFixed(2) : '0';
  const fmtWeekly = weeklyEm !== undefined ? parseFloat(formatUnits(weeklyEm as bigint, 18)).toLocaleString() : '—';
  const voteShare = totalVoted !== undefined && userVoteWeight !== undefined && (totalVoted as bigint) > 0n
    ? ((Number(userVoteWeight) / Number(totalVoted)) * 100).toFixed(2) : '0.00';

  const { writeContract: doClaim, isPending: isClaimPending } = useWriteContract();
  const { writeContract: doVote, isPending: isVotePending } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });
  const { isLoading: isVoteConfirming, isSuccess: isVoteSuccess } = useWaitForTransactionReceipt({ hash: voteHash });

  if (isClaimSuccess) { void refetchPending(); void refetchArcs(); }
  if (isVoteSuccess) void refetchPending();

  const parsedVote = (() => { try { return voteWeight ? parseUnits(voteWeight, 18) : undefined; } catch { return undefined; } })();
  const isClaimLoading = isClaimPending || isClaimConfirming;
  const isVoteLoading = isVotePending || isVoteConfirming;

  function handleClaim() {
    if (!address) return;
    doClaim({ ...GAUGE, functionName: 'claimRewards', args: [address] }, {
      onSuccess: (h) => { setClaimHash(h); toast.success('Rewards claimed!'); },
      onError: (err) => toast.error(parseOnchainError(err)),
    });
  }

  function handleVote() {
    if (!parsedVote) return;
    doVote({ ...GAUGE, functionName: 'vote', args: [parsedVote] }, {
      onSuccess: (h) => { setVoteHash(h); toast.success('Vote cast!'); },
      onError: (err) => toast.error(parseOnchainError(err)),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Your veARCS', value: fmtVeBal, sub: 'Voting power' },
          { label: 'Your vote share', value: `${voteShare}%`, sub: `of ${parseFloat(fmtTotalVoted).toLocaleString()} total` },
          { label: 'Weekly ARCS pool', value: fmtWeekly, sub: 'to LPs' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>{label}</div>
            <div className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>{value}</div>
            <div className="mt-0.5 text-[11px]" style={{ color: 'var(--subtle)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Claim */}
      <div className="rounded-3xl p-5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', backdropFilter: 'blur(40px)' }}>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="size-4" style={{ color: '#e8c46a' }} />
          <h3 className="display text-base font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>Claimable ARCS Rewards</h3>
        </div>
        <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <div className="flex items-baseline gap-2">
            <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>{fmtPending}</span>
            <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>ARCS</span>
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>Wallet balance: {fmtArcs} ARCS</div>
        </div>
        <button disabled={!isConnected || wrongChain || isClaimLoading || (pendingReward as bigint | undefined) === 0n}
          onClick={wrongChain ? () => switchChain({ chainId: ARC_CHAIN_ID }) : handleClaim}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
          {!isConnected ? 'Connect Wallet' : wrongChain ? (isSwitching ? 'Switching…' : 'Switch to Arc Testnet') : isClaimLoading
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Claiming…</span>
            : 'Claim ARCS Rewards'}
        </button>
        {isClaimSuccess && claimHash && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(141,216,159,0.08)', border: '1px solid rgba(141,216,159,0.2)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Rewards claimed</div>
            <a href={`https://explorer.arc.io/tx/${claimHash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>View on explorer <ExternalLink className="size-3" /></a>
          </div>
        )}
      </div>

      {/* Vote */}
      <div className="rounded-3xl p-5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', backdropFilter: 'blur(40px)' }}>
        <div className="mb-4 flex items-center gap-2">
          <Vote className="size-4" style={{ color: 'var(--accent)' }} />
          <h3 className="display text-base font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>Vote for USDC/EURC Pool</h3>
        </div>
        <div className="mb-3 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(172,198,233,0.06)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between"><span style={{ color: 'var(--subtle)' }}>Your current vote</span><span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtUserVote} veARCS</span></div>
          <div className="mt-1 flex justify-between"><span style={{ color: 'var(--subtle)' }}>Total votes cast</span><span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{parseFloat(fmtTotalVoted).toLocaleString()} veARCS</span></div>
          <div className="mt-1 text-[10px]" style={{ color: 'var(--subtle)' }}>Your gauge vote steers what fraction of weekly ARCS emissions flow to LP providers.</div>
        </div>
        <div className="mb-3 rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Vote weight (veARCS)</span>
            <button onClick={() => veBal !== undefined && setVoteWeight(formatUnits(veBal as bigint, 18))} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Max: {fmtVeBal}</button>
          </div>
          <input inputMode="decimal" value={voteWeight}
            onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setVoteWeight(v); }}
            placeholder="0.00"
            className="display w-full bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-20"
            style={{ color: 'var(--ink)' }} />
        </div>
        <button disabled={!isConnected || wrongChain || !parsedVote || isVoteLoading}
          onClick={wrongChain ? () => switchChain({ chainId: ARC_CHAIN_ID }) : handleVote}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'rgba(172,198,233,0.15)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.25)' }}>
          {!isConnected ? 'Connect Wallet' : wrongChain ? 'Switch to Arc Testnet' : isVoteLoading
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Voting…</span>
            : 'Cast Vote'}
        </button>
        {isVoteSuccess && voteHash && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(141,216,159,0.08)', border: '1px solid rgba(141,216,159,0.2)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Vote confirmed</div>
            <a href={`https://explorer.arc.io/tx/${voteHash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>View on explorer <ExternalLink className="size-3" /></a>
          </div>
        )}
      </div>
    </div>
  );
}
