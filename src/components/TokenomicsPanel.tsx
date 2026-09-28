import { useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi';
import { erc20Abi } from 'viem';
import { Flame, TrendingDown, DollarSign, Loader2, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  BUYBACK_BURNER,
  REVENUE_DISTRIBUTOR,
  ARCS_TOKEN,
  USDC_ADDRESS,
  ARC_CHAIN_ID,
  VE_ARCS,
} from '../contracts';
import { buildTxExplorerUrl } from '@/onchain-facts';
import { formatUnits } from 'viem';

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? '';
  if (msg.includes('user rejected')) return 'Transaction cancelled.';
  if (msg.includes('insufficient') || msg.includes('exceeds')) return 'Insufficient balance.';
  if (msg.includes('reverted')) return 'Transaction failed. See contract for details.';
  if (msg.includes('arcs pool not set')) return 'ARCS/USDC pool not yet configured. Buyback pending pool setup.';
  return 'Something went wrong. Please try again.';
}

const glass = {
  card: {
    background: 'var(--surface)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid var(--border)',
    borderRadius: '1.5rem',
  } as React.CSSProperties,
  inner: {
    background: 'var(--surface-muted)',
    border: '1px solid var(--border)',
    borderRadius: '1rem',
  } as React.CSSProperties,
};

export function TokenomicsPanel() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID;

  // ── BuybackBurner reads ──
  const { data: totalArcsBurned } = useReadContract({
    ...BUYBACK_BURNER,
    functionName: 'totalArcsBurned',
    chainId: ARC_CHAIN_ID,
  });

  const { data: totalUsdcUsed } = useReadContract({
    ...BUYBACK_BURNER,
    functionName: 'totalUsdcUsedForBuyback',
    chainId: ARC_CHAIN_ID,
  });

  const { data: totalUsdcFees } = useReadContract({
    ...BUYBACK_BURNER,
    functionName: 'totalUsdcFeesAccumulated',
    chainId: ARC_CHAIN_ID,
  });

  const { data: buybackCount } = useReadContract({
    ...BUYBACK_BURNER,
    functionName: 'buybackCount',
    chainId: ARC_CHAIN_ID,
  });

  const { data: usdcBalance } = useReadContract({
    ...BUYBACK_BURNER,
    functionName: 'usdcBalance',
    chainId: ARC_CHAIN_ID,
  });

  const { data: arcsSupply } = useReadContract({
    ...ARCS_TOKEN,
    functionName: 'totalSupply',
    chainId: ARC_CHAIN_ID,
  });

  // ── RevenueDistributor reads ──
  const { data: currentEpoch } = useReadContract({
    ...REVENUE_DISTRIBUTOR,
    functionName: 'currentEpoch',
    chainId: ARC_CHAIN_ID,
  });

  const { data: totalDistributed } = useReadContract({
    ...REVENUE_DISTRIBUTOR,
    functionName: 'totalDistributed',
    chainId: ARC_CHAIN_ID,
  });

  const { data: totalClaimed } = useReadContract({
    ...REVENUE_DISTRIBUTOR,
    functionName: 'totalClaimed',
    chainId: ARC_CHAIN_ID,
  });

  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    ...REVENUE_DISTRIBUTOR,
    functionName: 'claimable',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address },
  });

  const { data: userVePower } = useReadContract({
    ...VE_ARCS,
    functionName: 'getVotingPower',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address },
  });

  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, REVENUE_DISTRIBUTOR.address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address },
  });

  // ── RevenueDistributor: Checkpoint user ──
  const { writeContract: doCheckpoint, isPending: isCheckpointing, data: checkpointHash } = useWriteContract();
  const { isLoading: isCheckpointConfirming, isSuccess: isCheckpointSuccess } = useWaitForTransactionReceipt({ hash: checkpointHash });

  // ── RevenueDistributor: Deposit Revenue ──
  const [depositAmount, setDepositAmount] = useState('');
  const parsedDeposit = (() => {
    try { return depositAmount ? BigInt(Math.floor(parseFloat(depositAmount) * 1e6)) : undefined; } catch { return undefined; }
  })();
  const needsApproval = usdcAllowance !== undefined && parsedDeposit !== undefined && (usdcAllowance) < parsedDeposit;

  const { writeContract: doApprove, isPending: isApproving, data: approveHash } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { writeContract: doDeposit, isPending: isDepositing, data: depositHash } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

  if (isApproveSuccess) { void refetchAllowance(); }
  if (isDepositSuccess) { void refetchClaimable(); setDepositAmount(''); }
  if (isCheckpointSuccess) { void refetchClaimable(); }

  // ── RevenueDistributor: Claim ──
  const { writeContract: doClaim, isPending: isClaimPending, data: claimHash, error: claimError, isError: isClaimError } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });
  if (isClaimSuccess) { void refetchClaimable(); toast.success('USDC yield claimed!'); }

  function handleCheckpoint() {
    if (!address) return;
    doCheckpoint({ ...REVENUE_DISTRIBUTOR, functionName: 'checkpointUser', args: [address] });
  }

  function handleApprove() {
    if (!parsedDeposit) return;
    doApprove({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [REVENUE_DISTRIBUTOR.address, parsedDeposit] });
  }

  function handleDeposit() {
    if (!parsedDeposit) return;
    doDeposit({ ...REVENUE_DISTRIBUTOR, functionName: 'depositRevenue', args: [parsedDeposit] });
  }

  function handleClaim() {
    if (!address) return;
    doClaim({ ...REVENUE_DISTRIBUTOR, functionName: 'claim', args: [address] });
  }

  // ── Formatting helpers ──
  const fmtArcs = (v: unknown) => v !== undefined ? parseFloat(formatUnits(v as bigint, 18)).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';
  const fmtUsdc = (v: unknown) => v !== undefined ? parseFloat(formatUnits(v as bigint, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const burnPct = arcsSupply && totalArcsBurned
    ? ((Number(formatUnits(totalArcsBurned as bigint, 18)) / Number(formatUnits(arcsSupply as bigint, 18))) * 100).toFixed(4)
    : '0.0000';
  const claimableAmt = claimable ? parseFloat(formatUnits(claimable as bigint, 6)) : 0;
  const hasVePower = userVePower !== undefined && (userVePower as bigint) > 0n;

  const isDepositLoading = isApproving || isApproveConfirming || isDepositing || isDepositConfirming;
  const isClaimLoading = isClaimPending || isClaimConfirming;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          Deflationary Engine
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Every swap burns ARCS. Every fee earns you real USDC.
        </p>
      </div>

      {/* ── Burn Stats ── */}
      <section style={glass.card} className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg" style={{ background: 'rgba(232,109,122,0.15)' }}>
            <Flame className="size-3.5" style={{ color: 'var(--danger)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Buyback &amp; Burn</span>
          <span className="ml-auto mono text-xs" style={{ color: 'var(--subtle)' }}>
            {buybackCount !== undefined ? `${Number(buybackCount)} buyback${Number(buybackCount) !== 1 ? 's' : ''} executed` : '—'}
          </span>
        </div>

        {/* Big burn number */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--danger)' }}>
              {fmtArcs(totalArcsBurned)}
            </span>
            <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>ARCS burned</span>
          </div>
          <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
            {burnPct}% of supply permanently destroyed
          </p>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'USDC in fees', value: `$${fmtUsdc(totalUsdcFees)}` },
            { label: 'USDC spent', value: `$${fmtUsdc(totalUsdcUsed)}` },
            { label: 'Pending USDC', value: `$${fmtUsdc(usdcBalance)}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={glass.inner}>
              <div className="display text-lg font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--subtle)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Supply context */}
        <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(232,109,122,0.05)', border: '1px solid rgba(232,109,122,0.15)' }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <TrendingDown className="size-3.5" style={{ color: 'var(--danger)' }} />
            <span>Current circulating supply:</span>
            <span className="tabular-nums font-semibold" style={{ color: 'var(--ink-2)' }}>
              {fmtArcs(arcsSupply)} ARCS
            </span>
          </div>
        </div>
      </section>

      {/* ── Real Yield: Deposit ── */}
      <section style={glass.card} className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg" style={{ background: 'rgba(141,216,159,0.15)' }}>
            <DollarSign className="size-3.5" style={{ color: 'var(--success)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Real Yield — USDC for veARCS</span>
          <span className="ml-auto mono text-xs" style={{ color: 'var(--subtle)' }}>
            Epoch {currentEpoch !== undefined ? Number(currentEpoch) : '—'}
          </span>
        </div>

        {/* Epoch stats */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Total distributed', value: `$${fmtUsdc(totalDistributed)}` },
            { label: 'Total claimed', value: `$${fmtUsdc(totalClaimed)}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3" style={glass.inner}>
              <div className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--subtle)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Deposit revenue form — anyone can add USDC yield */}
        <div className="rounded-2xl p-4" style={glass.inner}>
          <div className="mb-2 flex items-center gap-1.5">
            <Info className="size-3.5" style={{ color: 'var(--subtle)' }} />
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>
              Deposit USDC into the current epoch to distribute as yield to veARCS holders
            </span>
          </div>
          <div className="flex gap-2">
            <input
              inputMode="decimal"
              value={depositAmount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '');
                if (v === '' || /^\d*\.?\d*$/.test(v)) setDepositAmount(v);
              }}
              placeholder="0.00"
              className="display flex-1 rounded-xl bg-transparent px-3 py-2.5 text-xl font-bold tabular-nums outline-none placeholder:opacity-30"
              style={{ color: 'var(--ink)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)' }}
            />
            <span className="flex items-center px-2 text-sm font-semibold" style={{ color: 'var(--accent)' }}>USDC</span>
          </div>

          {wrongChain ? (
            <button
              onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
              disabled={isSwitching}
              className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#0d1b2f' }}
            >
              {isSwitching ? 'Switching...' : 'Switch to Arc Testnet'}
            </button>
          ) : needsApproval ? (
            <button
              disabled={!parsedDeposit || isDepositLoading}
              onClick={handleApprove}
              className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#0d1b2f' }}
            >
              {isApproving || isApproveConfirming
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Approving...</span>
                : 'Approve USDC'}
            </button>
          ) : (
            <button
              disabled={!isConnected || !parsedDeposit || isDepositLoading}
              onClick={handleDeposit}
              className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#0d1b2f' }}
            >
              {!isConnected ? 'Connect Wallet' :
               isDepositing || isDepositConfirming
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Depositing...</span>
                : 'Deposit Revenue'}
            </button>
          )}
          {isDepositSuccess && depositHash && (
            <div className="mt-2 text-xs" style={{ color: 'var(--success)' }}>
              Deposited.{' '}
              <a href={buildTxExplorerUrl(ARC_CHAIN_ID, depositHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                View <ExternalLink className="size-3" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── Real Yield: Claim ── */}
      <section style={glass.card} className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg" style={{ background: 'rgba(172,198,233,0.15)' }}>
            <DollarSign className="size-3.5" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Your USDC Yield</span>
        </div>

        {/* Claimable amount */}
        <div className="mb-4 flex items-baseline gap-2">
          <span className="display text-4xl font-bold tabular-nums" style={{ color: claimableAmt > 0 ? 'var(--success)' : 'var(--ink)' }}>
            {isConnected ? `$${claimableAmt.toFixed(2)}` : '—'}
          </span>
          <span className="text-base font-medium" style={{ color: 'var(--subtle)' }}>USDC claimable</span>
        </div>

        {/* veARCS power */}
        {isConnected && (
          <div className="mb-4 rounded-xl px-3 py-2.5" style={glass.inner}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--subtle)' }}>Your veARCS power</span>
              <span className="tabular-nums font-semibold" style={{ color: hasVePower ? 'var(--accent)' : 'var(--muted)' }}>
                {userVePower !== undefined ? parseFloat(formatUnits(userVePower as bigint, 18)).toFixed(4) : '—'}
              </span>
            </div>
            {!hasVePower && (
              <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
                Lock ARCS on the Lock tab to earn veARCS power and qualify for real yield.
              </p>
            )}
          </div>
        )}

        {/* Checkpoint reminder */}
        <div className="mb-4 rounded-xl px-3 py-2.5" style={{ background: 'rgba(172,198,233,0.06)', border: '1px solid rgba(172,198,233,0.15)' }}>
          <div className="flex items-start gap-2">
            <RefreshCw className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              Checkpoint your veARCS once per week to be eligible for that epoch's yield. Do this before depositing revenue ends for the epoch.
            </p>
          </div>
          <button
            disabled={!isConnected || wrongChain || isCheckpointing || isCheckpointConfirming}
            onClick={handleCheckpoint}
            className="mt-2.5 w-full rounded-xl py-2 text-xs font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'rgba(172,198,233,0.12)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.25)' }}
          >
            {isCheckpointing || isCheckpointConfirming
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Checkpointing...</span>
              : 'Checkpoint My veARCS'}
          </button>
          {isCheckpointSuccess && checkpointHash && (
            <div className="mt-1.5 text-xs" style={{ color: 'var(--success)' }}>
              Checkpointed.{' '}
              <a href={buildTxExplorerUrl(ARC_CHAIN_ID, checkpointHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                View <ExternalLink className="size-3" />
              </a>
            </div>
          )}
        </div>

        {/* Claim CTA */}
        {wrongChain ? (
          <button
            onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
            disabled={isSwitching}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            {isSwitching ? 'Switching...' : 'Switch to Arc Testnet'}
          </button>
        ) : (
          <button
            disabled={!isConnected || isClaimLoading || claimableAmt <= 0}
            onClick={handleClaim}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: claimableAmt > 0 ? 'var(--success)' : 'var(--accent)', color: '#0d1b2f' }}
          >
            {!isConnected ? 'Connect Wallet' :
             isClaimLoading
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Claiming...</span>
              : claimableAmt > 0 ? `Claim $${claimableAmt.toFixed(2)} USDC` : 'No Yield to Claim'}
          </button>
        )}

        {isClaimSuccess && claimHash && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(141,216,159,0.08)', border: '1px solid rgba(141,216,159,0.2)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--success)' }}>USDC yield received</div>
            <a
              href={buildTxExplorerUrl(ARC_CHAIN_ID, claimHash)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs"
              style={{ color: 'var(--accent)' }}
            >
              View on explorer <ExternalLink className="size-3" />
            </a>
          </div>
        )}

        {isClaimError && (
          <div className="mt-3 rounded-2xl p-3 text-xs" style={{ background: 'rgba(232,109,122,0.08)', border: '1px solid rgba(232,109,122,0.2)', color: 'var(--danger)' }}>
            {parseOnchainError(claimError)}
          </div>
        )}
      </section>
    </div>
  );
}
