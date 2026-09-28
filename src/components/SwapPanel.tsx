import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits } from 'viem';
import { ArrowUpDown, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { STABLE_POOL, USDC_ADDRESS, EURC_ADDRESS, ARC_CHAIN_ID } from '../contracts';

const D = 6;

function parseOnchainError(e: unknown): string {
  const m = (e as { message?: string })?.message?.toLowerCase() ?? '';
  if (m.includes('user rejected') || m.includes('denied')) return 'Transaction cancelled.';
  if (m.includes('insufficient') || m.includes('exceeds')) return 'Insufficient balance.';
  if (m.includes('reverted')) return 'Transaction reverted — pool may have insufficient liquidity or slippage too low.';
  return 'Something went wrong. Please try again.';
}

function parseSafe(v: string) {
  try { return v ? parseUnits(v, D) : undefined; } catch { return undefined; }
}

export function SwapPanel() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [tokenIn, setTokenIn] = useState<'usdc' | 'eurc'>('usdc');
  const [amountIn, setAmountIn] = useState('');
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>();
  const [swapHash, setSwapHash] = useState<`0x${string}` | undefined>();
  const [step, setStep] = useState<'idle' | 'approving' | 'swapping'>('idle');
  const swapFiredRef = useRef(false);

  const tokenInAddr = tokenIn === 'usdc' ? USDC_ADDRESS : EURC_ADDRESS;
  const tokenInLabel = tokenIn === 'usdc' ? 'USDC' : 'EURC';
  const tokenOutLabel = tokenIn === 'usdc' ? 'EURC' : 'USDC';
  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID;
  const parsedIn = parseSafe(amountIn);

  const { data: quoteOut } = useReadContract({
    ...STABLE_POOL, functionName: 'getSwapOutput',
    args: parsedIn ? [tokenInAddr as `0x${string}`, parsedIn] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!parsedIn && parsedIn > 0n },
  });

  const { data: reserves } = useReadContract({
    ...STABLE_POOL, functionName: 'getReserves',
    chainId: ARC_CHAIN_ID,
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: tokenInAddr, abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address },
  });

  const { writeContract: doApprove, isPending: isApproving } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { writeContract: doSwap, isPending: isSwapPending, isError: isSwapError, error: swapError } = useWriteContract();
  const { isLoading: isSwapConfirming, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({ hash: swapHash });

  const fmtBal = balance !== undefined ? parseFloat(formatUnits(balance, D)).toFixed(2) : '—';
  const quoteFormatted = quoteOut !== undefined ? parseFloat(formatUnits(quoteOut as bigint, D)).toFixed(4) : '—';
  const isLoading = isApproving || isApproveConfirming || isSwapPending || isSwapConfirming;

  const res = reserves as [bigint, bigint] | undefined;
  const noLiquidity = res !== undefined && res[0] === 0n && res[1] === 0n;

  // Fire swap exactly once after approval confirms
  useEffect(() => {
    if (isApproveSuccess && step === 'approving' && parsedIn && !swapFiredRef.current) {
      swapFiredRef.current = true;
      setStep('swapping');
      const minOut = (quoteOut as bigint ?? 0n) * 98n / 100n;
      doSwap(
        { ...STABLE_POOL, functionName: 'swap', args: [tokenInAddr as `0x${string}`, parsedIn, minOut] },
        {
          onSuccess: (h) => setSwapHash(h),
          onError: (err) => { toast.error(parseOnchainError(err)); setStep('idle'); swapFiredRef.current = false; },
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproveSuccess, step]);

  useEffect(() => {
    if (isSwapSuccess) { void refetchBalance(); }
  }, [isSwapSuccess, refetchBalance]);

  function handleSwap() {
    if (!parsedIn) return;
    swapFiredRef.current = false;
    setStep('approving');
    setApproveHash(undefined);
    setSwapHash(undefined);
    doApprove(
      { address: tokenInAddr, abi: erc20Abi, functionName: 'approve', args: [STABLE_POOL.address, parsedIn] },
      {
        onSuccess: (h) => setApproveHash(h),
        onError: (err) => { toast.error(parseOnchainError(err)); setStep('idle'); },
      }
    );
  }

  function handleFlip() {
    setTokenIn(p => p === 'usdc' ? 'eurc' : 'usdc');
    setAmountIn(''); setSwapHash(undefined); setApproveHash(undefined);
    setStep('idle'); swapFiredRef.current = false;
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl p-5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', backdropFilter: 'blur(40px)' }}>
        <h2 className="display mb-4 text-lg font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>Swap</h2>

        {/* No liquidity warning */}
        {noLiquidity && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl p-3 text-xs" style={{ background: 'rgba(250,196,60,0.08)', border: '1px solid rgba(250,196,60,0.25)', color: '#fac43c' }}>
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>The pool has no liquidity yet. Add USDC + EURC in the Liquidity tab first to enable swaps.</span>
          </div>
        )}

        {/* Token In */}
        <div className="rounded-2xl p-4 mb-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>You pay</span>
            <button onClick={() => balance !== undefined && setAmountIn(formatUnits(balance, D))} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              Balance: {fmtBal} · Max
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              inputMode="decimal" value={amountIn}
              onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setAmountIn(v); }}
              placeholder="0.00"
              className="display flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-20"
              style={{ color: 'var(--ink)' }}
            />
            <div className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: 'rgba(172,198,233,0.15)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.25)' }}>
              {tokenInLabel}
            </div>
          </div>
        </div>

        {/* Flip button */}
        <div className="flex justify-center py-1">
          <button onClick={handleFlip} className="flex size-9 items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
            <ArrowUpDown className="size-4" />
          </button>
        </div>

        {/* Token Out */}
        <div className="rounded-2xl p-4 mt-2" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>You receive (est.)</span>
          <div className="mt-1 flex items-center gap-3">
            <span className="display flex-1 text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)', opacity: quoteFormatted === '—' ? 0.3 : 1 }}>
              {quoteFormatted}
            </span>
            <div className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: 'rgba(172,198,233,0.15)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.25)' }}>
              {tokenOutLabel}
            </div>
          </div>
        </div>

        {/* Info row */}
        {quoteOut !== undefined && parsedIn !== undefined && parsedIn > 0n && (
          <div className="mt-3 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--subtle)' }}>
            <div className="flex justify-between"><span>Slippage tolerance</span><span className="font-medium" style={{ color: 'var(--ink-2)' }}>2%</span></div>
            <div className="mt-1 flex justify-between"><span>Fee</span><span className="font-medium" style={{ color: 'var(--ink-2)' }}>0.04%</span></div>
          </div>
        )}

        {/* Steps indicator */}
        {step !== 'idle' && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--subtle)' }}>
            <div className={`flex size-5 items-center justify-center rounded-full text-xs font-bold ${step === 'approving' ? 'text-white' : 'text-white'}`}
              style={{ background: step === 'approving' ? 'var(--accent)' : 'rgba(141,216,159,0.6)' }}>1</div>
            <span style={{ color: step === 'approving' ? 'var(--ink)' : 'var(--subtle)' }}>Approve</span>
            <div className="h-px w-4" style={{ background: 'var(--border)' }} />
            <div className={`flex size-5 items-center justify-center rounded-full text-xs font-bold`}
              style={{ background: step === 'swapping' ? 'var(--accent)' : 'rgba(255,255,255,0.08)', color: step === 'swapping' ? '#0d1b2f' : 'var(--subtle)' }}>2</div>
            <span style={{ color: step === 'swapping' ? 'var(--ink)' : 'var(--subtle)' }}>Swap</span>
          </div>
        )}

        {/* CTA */}
        {wrongChain ? (
          <button onClick={() => switchChain({ chainId: ARC_CHAIN_ID })} disabled={isSwitching}
            className="mt-4 w-full rounded-2xl py-3.5 text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
            {isSwitching ? 'Switching…' : 'Switch to Arc Mainnet'}
          </button>
        ) : (
          <button disabled={!isConnected || !parsedIn || isLoading || noLiquidity}
            onClick={handleSwap}
            className="mt-4 w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
            {!isConnected ? 'Connect Wallet'
              : noLiquidity ? 'No liquidity — add in Liquidity tab'
              : isApproving || isApproveConfirming
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Approving…</span>
              : isSwapPending || isSwapConfirming
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Swapping…</span>
              : `Swap ${tokenInLabel} → ${tokenOutLabel}`}
          </button>
        )}

        {isSwapSuccess && swapHash && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(141,216,159,0.08)', border: '1px solid rgba(141,216,159,0.2)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Swap confirmed</div>
            <a href={`https://explorer.arc.io/tx/${swapHash}`} target="_blank" rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
              View on explorer <ExternalLink className="size-3" />
            </a>
          </div>
        )}
        {isSwapError && (
          <div className="mt-3 rounded-2xl p-3 text-xs" style={{ background: 'rgba(232,109,122,0.08)', border: '1px solid rgba(232,109,122,0.2)', color: 'var(--danger)' }}>
            {parseOnchainError(swapError)}
          </div>
        )}
      </div>
    </div>
  );
}
