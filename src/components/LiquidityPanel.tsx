import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits } from 'viem';
import { Loader2, ExternalLink, Droplets, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { STABLE_POOL, USDC_ADDRESS, EURC_ADDRESS, ARC_CHAIN_ID } from '../contracts';

type Step = 'idle' | 'approve0' | 'approve1' | 'addliq' | 'done';

function parseOnchainError(e: unknown): string {
  const m = (e as { message?: string })?.message?.toLowerCase() ?? '';
  if (m.includes('user rejected') || m.includes('denied')) return 'Transaction cancelled.';
  if (m.includes('insufficient') || m.includes('exceeds')) return 'Insufficient balance.';
  if (m.includes('reverted')) return 'Transaction failed — check amounts or slippage.';
  return 'Something went wrong. Please try again.';
}

function parseSafe6(v: string) { try { return v ? parseUnits(v, 6) : undefined; } catch { return undefined; } }
function parseSafe18(v: string) { try { return v ? parseUnits(v, 18) : undefined; } catch { return undefined; } }

export function LiquidityPanel() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [lpToRemove, setLpToRemove] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [approve0Hash, setApprove0Hash] = useState<`0x${string}` | undefined>();
  const [approve1Hash, setApprove1Hash] = useState<`0x${string}` | undefined>();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const pendingArgs = useRef<{ p0: bigint; p1: bigint } | null>(null);
  const stepRef = useRef<Step>('idle');

  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID;
  const parsed0 = parseSafe6(amount0);
  const parsed1 = parseSafe6(amount1);
  const parsedLp = parseSafe18(lpToRemove);

  const { data: bal0 } = useReadContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });
  const { data: bal1 } = useReadContract({ address: EURC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });
  const { data: lpBal, refetch: refetchLp } = useReadContract({ ...STABLE_POOL, functionName: 'lpBalance', args: address ? [address] : undefined, chainId: ARC_CHAIN_ID, query: { enabled: !!address } });
  const { data: reserves } = useReadContract({ ...STABLE_POOL, functionName: 'getReserves', chainId: ARC_CHAIN_ID });

  const fmtBal0 = bal0 !== undefined ? parseFloat(formatUnits(bal0, 6)).toFixed(2) : '—';
  const fmtBal1 = bal1 !== undefined ? parseFloat(formatUnits(bal1, 6)).toFixed(2) : '—';
  const fmtLpBal = lpBal !== undefined ? parseFloat(formatUnits(lpBal as bigint, 18)).toFixed(6) : '—';
  const res = reserves as [bigint, bigint] | undefined;
  const hasLiquidity = res && (res[0] > 0n || res[1] > 0n);

  const { writeContract: doApprove0 } = useWriteContract();
  const { writeContract: doApprove1 } = useWriteContract();
  const { writeContract: doAddLiq } = useWriteContract();
  const { writeContract: doRemoveLiq, isPending: isRemovePending } = useWriteContract();

  const { isSuccess: isApprove0Done } = useWaitForTransactionReceipt({ hash: approve0Hash });
  const { isSuccess: isApprove1Done } = useWaitForTransactionReceipt({ hash: approve1Hash });
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Step machine: approve0 confirmed → submit approve1
  useEffect(() => {
    if (!isApprove0Done || stepRef.current !== 'approve0') return;
    const args = pendingArgs.current;
    if (!args) return;
    stepRef.current = 'approve1';
    setStep('approve1');
    doApprove1({ address: EURC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [STABLE_POOL.address, args.p1] }, {
      onSuccess: (h) => setApprove1Hash(h),
      onError: (err) => { toast.error(parseOnchainError(err)); stepRef.current = 'idle'; setStep('idle'); },
    });
  }, [isApprove0Done, doApprove1]);

  // Step machine: approve1 confirmed → submit addLiquidity
  useEffect(() => {
    if (!isApprove1Done || stepRef.current !== 'approve1') return;
    const args = pendingArgs.current;
    if (!args) return;
    stepRef.current = 'addliq';
    setStep('addliq');
    doAddLiq({ ...STABLE_POOL, functionName: 'addLiquidity', args: [args.p0, args.p1, 0n] }, {
      onSuccess: (h) => { setTxHash(h); stepRef.current = 'done'; setStep('done'); },
      onError: (err) => { toast.error(parseOnchainError(err)); stepRef.current = 'idle'; setStep('idle'); },
    });
  }, [isApprove1Done, doAddLiq]);

  useEffect(() => {
    if (isTxSuccess) {
      toast.success('Liquidity added successfully!');
      void refetchLp();
      setAmount0(''); setAmount1('');
    }
  }, [isTxSuccess, refetchLp]);

  function handleAddLiquidity() {
    if (!parsed0 || !parsed1) return;
    pendingArgs.current = { p0: parsed0, p1: parsed1 };
    stepRef.current = 'approve0';
    setStep('approve0');
    setApprove0Hash(undefined); setApprove1Hash(undefined); setTxHash(undefined);
    doApprove0({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [STABLE_POOL.address, parsed0] }, {
      onSuccess: (h) => setApprove0Hash(h),
      onError: (err) => { toast.error(parseOnchainError(err)); stepRef.current = 'idle'; setStep('idle'); },
    });
  }

  function handleRemoveLiquidity() {
    if (!parsedLp) return;
    doRemoveLiq({ ...STABLE_POOL, functionName: 'removeLiquidity', args: [parsedLp, 0n, 0n] }, {
      onSuccess: (h) => { setTxHash(h); toast.success('Liquidity removed!'); void refetchLp(); },
      onError: (err) => toast.error(parseOnchainError(err)),
    });
  }

  const isLoading = step !== 'idle' && step !== 'done' || isTxConfirming || isRemovePending;

  const stepLabel = step === 'approve0' ? '(1/3) Approving USDC…'
    : step === 'approve1' ? '(2/3) Approving EURC…'
    : step === 'addliq' ? '(3/3) Adding liquidity…'
    : isTxConfirming ? 'Confirming…'
    : 'Add Liquidity';

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl p-5" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', backdropFilter: 'blur(40px)' }}>
        <h2 className="display mb-1 text-lg font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>Liquidity</h2>

        {/* Pool reserves */}
        <div className="mb-4 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(172,198,233,0.06)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between mb-0.5">
            <span style={{ color: 'var(--subtle)' }}>Pool USDC</span>
            <span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{res ? parseFloat(formatUnits(res[0], 6)).toFixed(2) : '—'}</span>
          </div>
          <div className="flex justify-between mb-0.5">
            <span style={{ color: 'var(--subtle)' }}>Pool EURC</span>
            <span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{res ? parseFloat(formatUnits(res[1], 6)).toFixed(2) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--subtle)' }}>Your LP</span>
            <span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtLpBal}</span>
          </div>
        </div>

        {!hasLiquidity && mode === 'add' && (
          <div className="mb-3 rounded-xl px-3 py-2 text-xs font-medium" style={{ background: 'rgba(172,198,233,0.08)', border: '1px solid rgba(172,198,233,0.2)', color: 'var(--accent)' }}>
            Pool is empty — you will be the first liquidity provider and set the initial price.
          </div>
        )}

        {/* Mode toggle */}
        <div className="mb-4 flex rounded-2xl p-1" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          {(['add', 'remove'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setTxHash(undefined); setStep('idle'); stepRef.current = 'idle'; }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold capitalize transition-all"
              style={{ background: mode === m ? 'rgba(172,198,233,0.15)' : 'transparent', color: mode === m ? 'var(--accent)' : 'var(--subtle)', border: mode === m ? '1px solid rgba(172,198,233,0.25)' : '1px solid transparent' }}>
              {m === 'add' ? <><Droplets className="size-3.5" />Add</> : <><Minus className="size-3.5" />Remove</>}
            </button>
          ))}
        </div>

        {mode === 'add' ? (
          <>
            <LpInput label="USDC" balance={fmtBal0} value={amount0} onChange={setAmount0} onMax={() => bal0 !== undefined && setAmount0(formatUnits(bal0, 6))} />
            <div className="py-1.5 text-center text-xs" style={{ color: 'var(--subtle)' }}>+</div>
            <LpInput label="EURC" balance={fmtBal1} value={amount1} onChange={setAmount1} onMax={() => bal1 !== undefined && setAmount1(formatUnits(bal1, 6))} />

            {/* Step progress */}
            {step !== 'idle' && step !== 'done' && (
              <div className="mt-3 flex justify-center gap-2">
                {(['approve0', 'approve1', 'addliq'] as const).map((s, i) => (
                  <div key={s} className="flex items-center gap-1 text-xs" style={{ color: step === s ? 'var(--accent)' : 'var(--subtle)', opacity: step === s ? 1 : 0.4 }}>
                    <div className="size-5 flex items-center justify-center rounded-full text-xs font-bold" style={{ background: step === s ? 'rgba(172,198,233,0.2)' : 'transparent', border: '1px solid currentColor' }}>{i + 1}</div>
                    {s === 'approve0' ? 'USDC' : s === 'approve1' ? 'EURC' : 'Deposit'}
                  </div>
                ))}
              </div>
            )}

            {wrongChain ? (
              <button onClick={() => switchChain({ chainId: ARC_CHAIN_ID })} disabled={isSwitching}
                className="mt-4 w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                {isSwitching ? 'Switching…' : 'Switch to Arc'}
              </button>
            ) : (
              <button disabled={!isConnected || !parsed0 || !parsed1 || isLoading}
                onClick={handleAddLiquidity}
                className="mt-4 w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                {!isConnected ? 'Connect Wallet' : isLoading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />{stepLabel}</span>
                  : 'Add Liquidity'}
              </button>
            )}
          </>
        ) : (
          <>
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>LP tokens to burn</span>
                <button onClick={() => lpBal !== undefined && setLpToRemove(formatUnits(lpBal as bigint, 18))} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Max</button>
              </div>
              <input inputMode="decimal" value={lpToRemove}
                onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setLpToRemove(v); }}
                placeholder="0.000000"
                className="display w-full bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-20"
                style={{ color: 'var(--ink)' }} />
            </div>
            <button disabled={!isConnected || wrongChain || !parsedLp || isRemovePending || isTxConfirming}
              onClick={wrongChain ? () => switchChain({ chainId: ARC_CHAIN_ID }) : handleRemoveLiquidity}
              className="mt-4 w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
              {!isConnected ? 'Connect Wallet' : wrongChain ? 'Switch to Arc' : isRemovePending || isTxConfirming
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Removing…</span>
                : 'Remove Liquidity'}
            </button>
          </>
        )}

        {(isTxSuccess || step === 'done') && txHash && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(141,216,159,0.08)', border: '1px solid rgba(141,216,159,0.2)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Confirmed — liquidity added</div>
            <a href={`https://explorer.arc.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
              View on explorer <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function LpInput({ label, balance, value, onChange, onMax }: { label: string; balance: string; value: string; onChange: (v: string) => void; onMax: () => void }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>{label}</span>
        <button onClick={onMax} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Balance: {balance} · Max</button>
      </div>
      <input inputMode="decimal" value={value}
        onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v); }}
        placeholder="0.00"
        className="display w-full bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-20"
        style={{ color: 'var(--ink)' }} />
    </div>
  );
}
