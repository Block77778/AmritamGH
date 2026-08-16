'use client'

import { useState, useEffect, useCallback } from 'react'
import { scanAllOpportunities } from '@/app/actions/prices'
import type { SwapPriceData } from '@/app/actions/prices'
import { executeOpportunity } from '@/app/actions/trading'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader } from 'lucide-react'

interface ArbitrageOpportunitiesProps {
  credentials: Array<{ id: string; exchangeId: string; label: string; status: string }>
}

const TICKER_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#14f195', XRP: '#23292f', ADA: '#0033ad', DOGE: '#c2a633',
  ZEC: '#f4b728', CC: '#f5e663', RAIN: '#d4e13a', LTC: '#bfbbbb', LINK: '#2a5ada', DOT: '#e6007a',
  AVAX: '#e84142', UNI: '#ff007a', ATOM: '#2e3148', NEAR: '#000000', APT: '#000000', ARB: '#28a0f0',
  OP: '#ff0420', INJ: '#00d2ff', SEI: '#941ee8', SUI: '#4da2ff', FIL: '#0090ff', RUNE: '#33ff99',
  HBAR: '#000000', PEPE: '#4caf50', SHIB: '#ffa409', WIF: '#c8a2c8', BONK: '#f7b500', DEXE: '#6f4fd1',
}

const SCANNED_TOKENS = [
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'ZEC', 'CC', 'RAIN',
  'LTC', 'LINK', 'DOT', 'AVAX', 'UNI', 'ATOM', 'NEAR', 'APT', 'ARB', 'OP', 'INJ', 'SEI',
  'SUI', 'FIL', 'RUNE', 'HBAR', 'PEPE', 'SHIB', 'WIF', 'BONK', 'DEXE',
]

// Free, open-source icon set (MIT licensed, hosted on jsdelivr). Falls back
// to a colored letter circle for any ticker it doesn't have (e.g. CC, RAIN).
function CoinIcon({ symbol, size = 44 }: { symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const iconUrl = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1.x/128/color/${symbol.toLowerCase()}.png`

  if (failed) {
    return (
      <div
        className="rounded-full flex items-center justify-center font-bold text-black flex-shrink-0"
        style={{ backgroundColor: TICKER_COLORS[symbol] ?? '#d4af37', width: size, height: size }}
      >
        {symbol.slice(0, 1)}
      </div>
    )
  }

  return (
    <img
      src={iconUrl}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full flex-shrink-0 bg-[#0a0a0a]"
      onError={() => setFailed(true)}
    />
  )
}

export default function ArbitrageOpportunities({ credentials }: ArbitrageOpportunitiesProps) {
  const [opportunities, setOpportunities] = useState<SwapPriceData[]>([])
  const [scanning, setScanning] = useState(false)
  const [lastScanAt, setLastScanAt] = useState<number | null>(null)
  const [minProfitPercent, setMinProfitPercent] = useState('0')
  const [minVolume, setMinVolume] = useState('0')
  const [showAll, setShowAll] = useState(false)
  const [executingToken, setExecutingToken] = useState<string | null>(null)
  const [amount, setAmount] = useState('1')
  const [message, setMessage] = useState('')

  const scan = useCallback(async () => {
    setScanning(true)
    try {
      const results = await scanAllOpportunities()
      setOpportunities(results.sort((a, b) => b.profitPercentage - a.profitPercentage))
      setLastScanAt(Date.now())
    } finally {
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    scan()
    const interval = setInterval(scan, 30000)
    return () => clearInterval(interval)
  }, [scan])

  const threshold = parseFloat(minProfitPercent) || 0
  const volumeThreshold = parseFloat(minVolume) || 0
  const visible = showAll
    ? opportunities
    : opportunities.filter((o) => o.profitPercentage >= threshold && (o.volume24h ?? 0) >= volumeThreshold)
  const bestSpread = opportunities.length > 0 ? Math.max(...opportunities.map((o) => o.spreadPercentage)) : 0

  const handleExecute = async (opp: SwapPriceData) => {
    setMessage('')
    const buyCredential = credentials.find((c) => c.exchangeId === opp.buyExchange)
    const sellCredential = credentials.find((c) => c.exchangeId === opp.sellExchange)
    if (!buyCredential || !sellCredential) {
      const missing = [!buyCredential ? opp.buyExchange : null, !sellCredential ? opp.sellExchange : null].filter(Boolean)
      setMessage(`Add API keys for ${missing.join(' and ')} in the Exchanges tab before executing ${opp.token}.`)
      return
    }
    setExecutingToken(opp.token)
    try {
      const result = await executeOpportunity({
        opportunityId: `${opp.token}-${Date.now()}`,
        buyCredentialId: buyCredential.id,
        sellCredentialId: sellCredential.id,
        symbol: `${opp.token}/USDT`,
        amount: parseFloat(amount),
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice,
      })
      setMessage(`${opp.token}: live orders submitted (${result.buyOrderId} / ${result.sellOrderId})`)
    } catch (error) {
      setMessage(`${opp.token}: ${error instanceof Error ? error.message : 'Execution failed'}`)
    } finally {
      setExecutingToken(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Risk disclaimer — permanent, not dismissible */}
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="text-red-300 font-semibold mb-1">You are fully responsible for trades placed here</p>
          <p>
            This scanner deliberately includes smaller, less liquid exchanges and thinner-volume tokens to surface
            larger spreads. A quoted spread reflects the best bid/ask at the moment of the scan — it does not guarantee
            that size is available to fill at that price, and thin order books can move or vanish before your order
            lands. Prices, spreads, and liquidity can change or disappear in seconds. Nothing here is financial advice,
            and trading on this platform carries real risk of loss.
          </p>
        </div>
      </div>

      {/* Stat header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a]">
          <div className="text-[10px] text-muted-foreground tracking-widest mb-1">OPPORTUNITIES</div>
          <div className="text-2xl font-bold text-foreground">{visible.length}</div>
        </div>
        <div className="p-4 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a]">
          <div className="text-[10px] text-muted-foreground tracking-widest mb-1">BEST SPREAD</div>
          <div className="text-2xl font-bold text-primary">{bestSpread.toFixed(2)}%</div>
        </div>
        <div className="p-4 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a]">
          <div className="text-[10px] text-muted-foreground tracking-widest mb-1">COINS SCANNED</div>
          <div className="text-2xl font-bold text-foreground">{opportunities.length}</div>
        </div>
        <div className="p-4 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a]">
          <div className="text-[10px] text-muted-foreground tracking-widest mb-1">LAST UPDATE</div>
          <div className="text-lg font-bold text-foreground">{lastScanAt ? new Date(lastScanAt).toLocaleTimeString() : '—'}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs text-muted-foreground block mb-1">Min Profit %</label>
            <input
              type="number"
              step="0.01"
              value={minProfitPercent}
              onChange={(e) => setMinProfitPercent(e.target.value)}
              disabled={showAll}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground disabled:opacity-50"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-muted-foreground block mb-1">Min Volume (24h)</label>
            <select
              value={minVolume}
              onChange={(e) => setMinVolume(e.target.value)}
              disabled={showAll}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground disabled:opacity-50"
            >
              <option value="0">Any</option>
              <option value="1000000">$1,000,000+</option>
              <option value="10000000">$10,000,000+</option>
              <option value="50000000">$50,000,000+</option>
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs text-muted-foreground block mb-1">Amount per trade</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground"
            />
          </div>
          <Button onClick={scan} disabled={scanning} className="flex items-center gap-2">
            {scanning ? <Loader className="w-4 h-4 animate-spin" /> : null}
            Scan Markets
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show all {opportunities.length} scanned coins (ignore filters — useful for checking the scanner is working even when nothing's profitable)
        </label>
        <p className="text-xs text-muted-foreground">
          Scanning {SCANNED_TOKENS.length} tokens across Binance, Kraken, Coinbase, OKX, Bybit, KuCoin, HTX, and MEXC. Refreshes every 30s.
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {/* Opportunity cards */}
      <div className="space-y-3">
        {visible.length === 0 && !scanning && (
          <div className="p-8 rounded-lg border-2 border-dashed border-[#2a2a2a] text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {opportunities.length === 0
                ? 'The scanner found no live quotes at all — check back in a moment or hit Scan Markets.'
                : `No opportunities above ${minProfitPercent}% net profit right now. Try "Show all scanned coins" to see real current spreads.`}
            </p>
          </div>
        )}

        {visible.map((opp) => {
          const buyCredential = credentials.find((c) => c.exchangeId === opp.buyExchange)
          const sellCredential = credentials.find((c) => c.exchangeId === opp.sellExchange)
          const missingKeys = !buyCredential || !sellCredential
          const numAmount = parseFloat(amount) || 0

          return (
            <div key={opp.token} className="rounded-xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-background overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                  <CoinIcon symbol={opp.token} />
                  <div>
                    <div className="font-bold text-foreground">{opp.token}</div>
                    <div className="text-xs text-muted-foreground">
                      {opp.token}/USDT · Vol: {opp.volume24h ? `$${(opp.volume24h / 1_000_000).toFixed(2)}M` : '—'}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${opp.spreadPercentage >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  {opp.spreadPercentage.toFixed(2)}%
                </div>
              </div>

              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-muted-foreground tracking-widest mb-1 flex items-center gap-1">
                    BUY FROM {!buyCredential && <span className="text-yellow-500">(no key)</span>}
                  </div>
                  <div className="font-bold text-foreground">{opp.buyExchange}</div>
                  <div className="text-primary font-semibold">${opp.buyPrice.toFixed(opp.buyPrice < 1 ? 6 : 2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground tracking-widest mb-1 flex items-center justify-end gap-1">
                    {!sellCredential && <span className="text-yellow-500">(no key)</span>} SELL AT
                  </div>
                  <div className="font-bold text-foreground">{opp.sellExchange}</div>
                  <div className="text-primary font-semibold">${opp.sellPrice.toFixed(opp.sellPrice < 1 ? 6 : 2)}</div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <div className="text-[10px] text-muted-foreground tracking-widest">NET PROFIT</div>
                <div className={`text-4xl font-bold ${opp.profitPercentage >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  {opp.profitPercentage.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Gross: {opp.spreadPercentage.toFixed(2)}% | Fees: -{(opp.spreadPercentage - opp.profitPercentage).toFixed(2)}%
                </div>
              </div>

              <div className="px-5 pb-5 flex items-center justify-between border-t border-[#2a2a2a] pt-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Est. profit on {amount || '0'} {opp.token}: </span>
                  <span className={`font-bold ${opp.profit * numAmount >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    ${(opp.profit * numAmount).toFixed(2)}
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={missingKeys || executingToken === opp.token || opp.profitPercentage < 0}
                  onClick={() => handleExecute(opp)}
                >
                  {executingToken === opp.token ? 'Executing...' : missingKeys ? 'Add Keys to Execute' : 'Execute'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
