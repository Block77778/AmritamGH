'use client'

import { useState } from 'react'
import { createWalletClient, createPublicClient, custom, type Address } from 'viem'
import { mainnet } from 'viem/chains'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowRight, Loader, ShieldAlert } from 'lucide-react'
import { scanDexOpportunities, type DexScanResult } from '@/app/actions/dex-prices'
import { getUniswapV3Quote, getSushiswapQuote, erc20Abi, swapRouter02Abi, sushiRouterAbi, type DexArbitrageResult, type DexId } from '@/lib/trading/dex-adapter'
import { MAINNET_TOKENS, MAINNET_CHAIN_ID, UNISWAP_V3_SWAP_ROUTER_02, UNISWAP_V3_FEE_TIER, SUSHISWAP_V2_ROUTER } from '@/lib/trading/dex-tokens'

type Step = 'idle' | 'scanning' | 'leg1-approve' | 'leg1-swap' | 'leg2-confirm' | 'leg2-approve' | 'leg2-swap' | 'done' | 'error'

const routerFor = (dex: DexId) => dex === 'Uniswap V3' ? UNISWAP_V3_SWAP_ROUTER_02 : SUSHISWAP_V2_ROUTER

const TOKEN_ICON_SLUG: Record<string, string> = { WETH: 'eth', WBTC: 'btc' }

function TokenIcon({ symbol, size = 44 }: { symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const slug = TOKEN_ICON_SLUG[symbol] ?? symbol.toLowerCase()
  const iconUrl = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.x/128/color/${slug}.png`

  if (failed) {
    return (
      <div
        className="rounded-full flex items-center justify-center font-bold text-black bg-primary flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 1)}
      </div>
    )
  }
  return (
    <img src={iconUrl} alt={symbol} width={size} height={size} className="rounded-full flex-shrink-0 bg-[#0a0a0a]" onError={() => setFailed(true)} />
  )
}

export default function DexArbitrage() {
  const [opportunities, setOpportunities] = useState<DexArbitrageResult[]>([])
  const [snapshots, setSnapshots] = useState<DexScanResult['snapshots']>([])
  const [selected, setSelected] = useState<DexArbitrageResult | null>(null)
  const [address, setAddress] = useState<Address | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState('')
  const [refreshedLeg2, setRefreshedLeg2] = useState<{ quoteReceived: bigint; drift: number } | null>(null)

  const pushLog = (line: string) => setLog((l) => [...l, line])

  const connectWallet = async () => {
    setError('')
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask (or another injected wallet) not detected.')
      return
    }
    try {
      const accounts: Address[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const chainIdHex: string = await window.ethereum.request({ method: 'eth_chainId' })
      if (parseInt(chainIdHex, 16) !== MAINNET_CHAIN_ID) {
        setError('Switch your wallet to Ethereum Mainnet to use DEX arbitrage.')
        return
      }
      setAddress(accounts[0])
    } catch (err) {
      setError(`Wallet connection failed: ${(err as any)?.message ?? 'Unknown error'}`)
    }
  }

  const scan = async () => {
    setStep('scanning')
    setError('')
    try {
      const result = await scanDexOpportunities(1000)
      setOpportunities(result.opportunities)
      setSnapshots(result.snapshots)
      if (result.snapshots.every((s) => s.uniswapPrice === null && s.sushiswapPrice === null)) {
        setError('All quotes came back empty — the RPC endpoint is likely unreachable or rate-limited. Check server logs for "[dex]" errors, or set NEXT_PUBLIC_MAINNET_RPC_URL to a dedicated RPC (Alchemy/Infura free tier works well).')
      }
    } catch (err) {
      setError('Scan failed — RPC may be rate-limited, try again shortly.')
    } finally {
      setStep('idle')
    }
  }

  const clients = () => {
    const publicClient = createPublicClient({ chain: mainnet, transport: custom(window.ethereum) })
    const walletClient = createWalletClient({ chain: mainnet, transport: custom(window.ethereum) })
    return { publicClient, walletClient }
  }

  const ensureAllowance = async (token: Address, owner: Address, spender: Address, amount: bigint) => {
    const { publicClient, walletClient } = clients()
    const allowance = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] })
    if (allowance >= amount) return
    pushLog(`Requesting approval for ${spender}...`)
    const hash = await walletClient.writeContract({ account: owner, address: token, abi: erc20Abi, functionName: 'approve', args: [spender, amount] })
    await publicClient.waitForTransactionReceipt({ hash })
    pushLog(`Approval confirmed (${hash.slice(0, 10)}...)`)
  }

  const swapOn = async (dex: DexId, tokenIn: Address, tokenOut: Address, amountIn: bigint, amountOutMinimum: bigint, owner: Address): Promise<bigint> => {
    const { publicClient, walletClient } = clients()
    let hash: `0x${string}`
    if (dex === 'Uniswap V3') {
      hash = await walletClient.writeContract({
        account: owner, address: UNISWAP_V3_SWAP_ROUTER_02, abi: swapRouter02Abi, functionName: 'exactInputSingle',
        args: [{ tokenIn, tokenOut, fee: UNISWAP_V3_FEE_TIER, recipient: owner, amountIn, amountOutMinimum, sqrtPriceLimitX96: 0n }],
      })
    } else {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
      hash = await walletClient.writeContract({
        account: owner, address: SUSHISWAP_V2_ROUTER, abi: sushiRouterAbi, functionName: 'swapExactTokensForTokens',
        args: [amountIn, amountOutMinimum, [tokenIn, tokenOut], owner, deadline],
      })
    }
    pushLog(`${dex} swap submitted (${hash.slice(0, 10)}...), waiting for confirmation...`)
    await publicClient.waitForTransactionReceipt({ hash })
    pushLog(`${dex} swap confirmed`)
    return hash as unknown as bigint
  }

  const startExecution = async (opp: DexArbitrageResult) => {
    if (!address) { setError('Connect your wallet first.'); return }
    setSelected(opp)
    setError('')
    setLog([])
    const quoteToken = MAINNET_TOKENS[opp.quoteSymbol].address as Address
    const baseToken = MAINNET_TOKENS[opp.baseSymbol].address as Address

    try {
      setStep('leg1-approve')
      await ensureAllowance(quoteToken, address, routerFor(opp.buyDex) as Address, opp.quoteAmountIn)

      setStep('leg1-swap')
      const minBaseOut = (opp.baseAcquired * 99n) / 100n
      await swapOn(opp.buyDex, quoteToken, baseToken, opp.quoteAmountIn, minBaseOut, address)

      const { publicClient } = clients()
      const baseBalance = await publicClient.readContract({ address: baseToken, abi: erc20Abi, functionName: 'balanceOf', args: [address] })

      setStep('leg2-confirm')
      const freshQuote = opp.sellDex === 'Uniswap V3'
        ? await getUniswapV3Quote(baseToken, quoteToken, baseBalance)
        : await getSushiswapQuote(baseToken, quoteToken, baseBalance)
      if (!freshQuote) throw new Error('Could not re-quote sell leg — aborting before leg 2.')
      const drift = ((Number(freshQuote.amountOut) - Number(opp.quoteReceived)) / Number(opp.quoteReceived)) * 100
      setRefreshedLeg2({ quoteReceived: freshQuote.amountOut, drift })
    } catch (err) {
      setError(`Leg 1 failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setStep('error')
    }
  }

  const confirmLeg2 = async () => {
    if (!selected || !address || !refreshedLeg2) return
    const quoteToken = MAINNET_TOKENS[selected.quoteSymbol].address as Address
    const baseToken = MAINNET_TOKENS[selected.baseSymbol].address as Address
    try {
      const { publicClient } = clients()
      const baseBalance = await publicClient.readContract({ address: baseToken, abi: erc20Abi, functionName: 'balanceOf', args: [address] })

      setStep('leg2-approve')
      await ensureAllowance(baseToken, address, routerFor(selected.sellDex) as Address, baseBalance)

      setStep('leg2-swap')
      const minQuoteOut = (refreshedLeg2.quoteReceived * 99n) / 100n
      await swapOn(selected.sellDex, baseToken, quoteToken, baseBalance, minQuoteOut, address)

      setStep('done')
      pushLog('Both legs complete. Check your wallet for final balances.')
    } catch (err) {
      setError(`Leg 2 failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setStep('error')
    }
  }

  const cancelAfterLeg1 = () => {
    setStep('idle')
    setSelected(null)
    setRefreshedLeg2(null)
    pushLog('Stopped after leg 1 — you are currently holding the base token, not the original quote token.')
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
        <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="text-red-300 font-semibold mb-1">DEX mode has no atomicity</p>
          <p>
            Each leg is a separate on-chain transaction you sign individually, seconds apart. The price can move
            against you between legs, and each swap plus each approval costs real gas regardless of outcome.
            This mode does not use a smart contract to guarantee both legs succeed together — it's manual,
            step-by-step, with a mandatory re-check before the second leg.
          </p>
        </div>
      </div>

      {!address ? (
        <Button onClick={connectWallet} className="w-full">Connect Wallet for DEX Trading</Button>
      ) : (
        <div className="text-xs text-muted-foreground">Connected: {address.slice(0, 6)}...{address.slice(-4)}</div>
      )}

      <Button onClick={scan} disabled={step === 'scanning'} variant="outline" className="w-full">
        {step === 'scanning' ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
        Scan Uniswap V3 vs SushiSwap V2
      </Button>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300 flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {snapshots.length === 0 && step === 'idle' && (
        <p className="text-sm text-muted-foreground text-center">No scan run yet — click "Scan Uniswap V3 vs SushiSwap V2" above.</p>
      )}

      {/* Unified price cards — every scanned pair, CEX-style */}
      <div className="space-y-3">
        {snapshots.map((s, i) => {
          const opp = opportunities.find((o) => o.baseSymbol === s.base && o.quoteSymbol === s.quote)
          const bothPricesAvailable = s.uniswapPrice !== null && s.sushiswapPrice !== null

          let buyDex: DexId | null = null, sellDex: DexId | null = null, spreadPercent = 0
          if (bothPricesAvailable) {
            const uniLower = s.uniswapPrice! <= s.sushiswapPrice!
            buyDex = uniLower ? 'Uniswap V3' : 'SushiSwap V2'
            sellDex = uniLower ? 'SushiSwap V2' : 'Uniswap V3'
            const lower = Math.min(s.uniswapPrice!, s.sushiswapPrice!)
            const higher = Math.max(s.uniswapPrice!, s.sushiswapPrice!)
            spreadPercent = ((higher - lower) / lower) * 100
          }

          return (
            <div key={i} className="rounded-xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-background overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                  <TokenIcon symbol={s.base} />
                  <div>
                    <div className="font-bold text-foreground">{s.base}</div>
                    <div className="text-xs text-muted-foreground">{s.base}/{s.quote}</div>
                  </div>
                </div>
                {bothPricesAvailable ? (
                  <div className={`text-sm font-bold ${spreadPercent >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    {spreadPercent.toFixed(2)}%
                  </div>
                ) : (
                  <div className="text-xs text-red-400 font-semibold">Quote unavailable</div>
                )}
              </div>

              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-muted-foreground tracking-widest mb-1">
                    {bothPricesAvailable ? 'BUY FROM' : 'UNISWAP V3'}
                  </div>
                  <div className="font-bold text-foreground">{bothPricesAvailable ? buyDex : 'Uniswap V3'}</div>
                  <div className={s.uniswapPrice === null ? 'text-red-400 text-sm' : 'text-primary font-semibold'}>
                    {s.uniswapPrice !== null ? `$${s.uniswapPrice.toFixed(2)}` : 'failed'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground tracking-widest mb-1">
                    {bothPricesAvailable ? 'SELL AT' : 'SUSHISWAP V2'}
                  </div>
                  <div className="font-bold text-foreground">{bothPricesAvailable ? sellDex : 'SushiSwap V2'}</div>
                  <div className={s.sushiswapPrice === null ? 'text-red-400 text-sm' : 'text-primary font-semibold'}>
                    {s.sushiswapPrice !== null ? `$${s.sushiswapPrice.toFixed(2)}` : 'failed'}
                  </div>
                </div>
              </div>

              {opp && (
                <div className="px-5 pb-3">
                  <div className="text-[10px] text-muted-foreground tracking-widest">NET PROFIT (before gas)</div>
                  <div className={`text-3xl font-bold ${opp.profitPercentage >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    {opp.profitPercentage.toFixed(2)}%
                  </div>
                </div>
              )}

              <div className="px-5 pb-5 flex items-center justify-between border-t border-[#2a2a2a] pt-4">
                <div className="text-xs text-muted-foreground">
                  {opp
                    ? 'Real cross-DEX opportunity found this scan.'
                    : bothPricesAvailable
                      ? 'Both venues priced, but no genuine cross-DEX edge right now.'
                      : 'One venue failed to quote — nothing tradeable here this scan.'}
                </div>
                <Button size="sm" disabled={!opp || !address || step !== 'idle'} onClick={() => opp && startExecution(opp)}>
                  {opp ? 'Start Arbitrage' : 'No Opportunity'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {step === 'leg2-confirm' && selected && refreshedLeg2 && (
        <div className="p-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 space-y-3">
          <p className="text-sm text-yellow-200 font-semibold">Leg 1 done. Confirm leg 2 before continuing.</p>
          <p className="text-xs text-muted-foreground">
            Original planned output: {(Number(selected.quoteReceived) / 10 ** MAINNET_TOKENS[selected.quoteSymbol].decimals).toFixed(2)} {selected.quoteSymbol}.
            Current re-quoted output: {(Number(refreshedLeg2.quoteReceived) / 10 ** MAINNET_TOKENS[selected.quoteSymbol].decimals).toFixed(2)} {selected.quoteSymbol}
            {' '}({refreshedLeg2.drift >= 0 ? '+' : ''}{refreshedLeg2.drift.toFixed(2)}% vs. scan).
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmLeg2}>Confirm & Execute Leg 2</Button>
            <Button size="sm" variant="outline" onClick={cancelAfterLeg1}>Stop Here</Button>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-xs text-muted-foreground space-y-1">
          {log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}

      {step === 'done' && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary flex gap-2">
          <span>Both legs executed. Check your wallet for the actual resulting balance.</span>
        </div>
      )}
    </div>
  )
}

declare global {
  interface Window {
    ethereum?: any
  }
}
