import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits } from 'viem';
import { Loader2, ExternalLink, Lock, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { VE_ARCS, ARCS_TOKEN, ARC_CHAIN_ID } from '../contracts';

// Module-level timestamp — avoids calling Date.now() inside a render
const MODULE_NOW = Date.now();

function parseOnchainError(e: unknown): string {
  const m = (e as { message?: string })?.message?.toLowerCase() ?? '';
  if (m.includes('user rejected')) return 'Transaction cancelled.';
  if (m.includes('insufficient') || m.includes('exceeds')) return 'Insufficient balance.';
  if (m.includes('reverted')) return 'Transaction failed. See contract for details.';
  return 'Something went wrong. Please try again.';
}

const LOCK_OPTIONS = [
  { label: '1 month', days: 30 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
  { label: '4 years (max)', days: 4 * 365 },
];

function getEstimatedVe(amount: string, days: number) {
  return (parseFloat(amount || '0') * days) / (4 * 365);
}

export function LockPanel() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [lockAmount, setLockAmount] = useState('');
  const [lockDays, setLockDays] = useState(365);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>();

  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID;
  const parsed = (() => { try { return lockAmount ? parseUnits(lockAmount, 18) : undefined; } catch { return undefined; } })();

  const { data: arcsBal } = useReadContract({ ...ARCS_TOKEN, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });
  const { data: veBal, refetch: refetchVe } = useReadContract({ ...VE_ARCS, functionName: 'getVotingPower', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });
  const { data: lockedInfo } = useReadContract({ ...VE_ARCS, functionName: 'locked', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });

  const fmtArcsBal = arcsBal !== undefined ? parseFloat(formatUnits(arcsBal as bigint, 18)).toFixed(2) : '—';
  const fmtVeBal = veBal !== undefined ? parseFloat(formatUnits(veBal as bigint, 18)).toFixed(4) : '—';

  const lockedArr = lockedInfo as [bigint, bigint] | undefined;
  const hasActiveLock = lockedArr && lockedArr[0] > 0n;
  const lockEndMs = lockedArr ? Number(lockedArr[1]) * 1000 : null;
  const lockEndDate = lockEndMs ? new Date(lockEndMs).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
  const isExpired = lockEndMs !== null && lockEndMs > 0 ? lockEndMs < MODULE_NOW : false;

  const { writeContract: doApprove, isPending: isApproving } = useWriteContract();
  const { writeContract: doLock, isPending: isLockPending } = useWriteContract();
  const { writeContract: doWithdraw, isPending: isWithdrawPending } = useWriteContract();
  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (isTxSuccess) void refetchVe();
  const isLoading = isApproving || isApproveConfirming || isLockPending || isWithdrawPending || isTxConfirming;
  const estimatedVe = getEstimatedVe(lockAmount, lockDays);

  function handleCreateLock() {
    if (!parsed) return;
    const unlockTime = BigInt(Math.floor(Date.now() / 1000) + lockDays * 86400);
    doApprove({ address: ARCS_TOKEN.address, abi: erc20Abi, functionName: 'approve', args: [VE_ARCS.address, parsed] }, {
      onSuccess: (h) => {
        setApproveHash(h);
        doLock({ ...VE_ARCS, functionName: 'createLock', args: [parsed, unlockTime] }, {
          onSuccess: (h2) => { setTxHash(h2); toast.success('ARCS locked!'); },
          onError: (err) => toast.error(parseOnchainError(err)),
        });
      },
      onError: (err) => toast.error(parseOnchainError(err)),
    });
  }

  function handleWithdraw() {
    doWithdraw({ ...VE_ARCS, functionName: 'withdraw' }, {
      onSuccess: (h) => { setTxHash(h); toast.success('ARCS withdrawn!'); },
      onError: (err) => toast.error(parseOnchainError(err)),
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* Current lock position */}
      <div className="rounded-3xl p-5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', backdropFilter: 'blur(40px)' }}>
        <h2 className="display mb-4 text-lg font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>Your veARCS Position</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            <div className="mb-1 flex items-center gap-1.5">
              <Lock className="size-3.5" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Voting Power</span>
            </div>
            <div className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtVeBal}</div>
            <div className="text-xs" style={{ color: 'var(--subtle)' }}>veARCS</div>
          </div>
          <div className="rounded-2xl p-3" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            <div className="mb-1 flex items-center gap-1.5">
              <Clock className="size-3.5" style={{ color: hasActiveLock && !isExpired ? 'var(--success)' : 'var(--subtle)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Lock Expires</span>
            </div>
            <div className="text-base font-bold" style={{ color: hasActiveLock && !isExpired ? 'var(--success)' : 'var(--subtle)' }}>
              {hasActiveLock ? (isExpired ? 'Expired' : lockEndDate) : 'No lock'}
            </div>
            {hasActiveLock && isExpired && (
              <button disabled={isLoading} onClick={handleWithdraw}
                className="mt-1 rounded-lg px-2 py-1 text-xs font-semibold"
                style={{ background: 'rgba(232,109,122,0.15)', color: 'var(--danger)' }}>
                {isWithdrawPending || isTxConfirming ? 'Withdrawing…' : 'Withdraw ARCS'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create lock */}
      <div className="rounded-3xl p-5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', backdropFilter: 'blur(40px)' }}>
        <h3 className="display mb-4 text-base font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>Lock ARCS for veARCS</h3>

        <div className="mb-3 rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>ARCS amount</span>
            <button onClick={() => arcsBal !== undefined && setLockAmount(formatUnits(arcsBal as bigint, 18))} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              Balance: {fmtArcsBal} · Max
            </button>
          </div>
          <input inputMode="decimal" value={lockAmount}
            onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setLockAmount(v); }}
            placeholder="0.00"
            className="display w-full bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-20"
            style={{ color: 'var(--ink)' }} />
        </div>

        <div className="mb-3">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Lock duration</span>
          <div className="grid grid-cols-2 gap-2">
            {LOCK_OPTIONS.map(opt => (
              <button key={opt.days} onClick={() => setLockDays(opt.days)}
                className="rounded-xl py-2.5 text-sm font-semibold transition-all"
                style={{ background: lockDays === opt.days ? 'rgba(172,198,233,0.15)' : 'var(--surface-muted)', color: lockDays === opt.days ? 'var(--accent)' : 'var(--subtle)', border: lockDays === opt.days ? '1px solid rgba(172,198,233,0.3)' : '1px solid var(--border)' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {lockAmount && parseFloat(lockAmount) > 0 && (
          <div className="mb-3 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(172,198,233,0.06)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--subtle)' }}>Estimated veARCS</span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{estimatedVe.toFixed(4)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span style={{ color: 'var(--subtle)' }}>Boost multiplier</span>
              <span className="font-bold" style={{ color: 'var(--ink)' }}>{((lockDays / (4 * 365)) * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}

        <button disabled={!isConnected || wrongChain || !parsed || isLoading}
          onClick={wrongChain ? () => switchChain({ chainId: ARC_CHAIN_ID }) : handleCreateLock}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
          {!isConnected ? 'Connect Wallet' : wrongChain ? (isSwitching ? 'Switching…' : 'Switch to Arc Testnet') : isLoading
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Confirming…</span>
            : `Lock ARCS for ${lockDays} days`}
        </button>

        {isTxSuccess && txHash && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(141,216,159,0.08)', border: '1px solid rgba(141,216,159,0.2)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Lock confirmed</div>
            <a href={`https://explorer.arc.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
              View on explorer <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
