'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { scanAllOpportunities } from '@/app/actions/prices'
import type { SwapPriceData } from '@/app/actions/prices'
import { executeOpportunity } from '@/app/actions/trading'
import { Button } from '@/components/ui/button'
import { ArrowRight, AlertCircle, TrendingUp, KeyRound, Loader } from 'lucide-react'

interface ArbitrageOpportunitiesProps {
  credentials: Array<{ id: string; exchangeId: string; label: string; status: string }>
}

const TICKER_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#14f195', XRP: '#23292f', ADA: '#0033ad', DOGE: '#c2a633',
  ZEC: '#f4b728', CC: '#f5e663', RAIN: '#d4e13a',
}

export default function ArbitrageOpportunities({ credentials }: ArbitrageOpportunitiesProps) {
  const [opportunities, setOpportunities] = useState<SwapPriceData[]>([])
  const [scanning, setScanning] = useState(false)
  const [lastScanAt, setLastScanAt] = useState<number | null>(null)
  const [minProfitPercent, setMinProfitPercent] = useState('0.1')
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
  const visible = opportunities.filter((o) => o.profitPercentage >= threshold)
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
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Min Profit %</label>
            <input
              type="number"
              step="0.01"
              value={minProfitPercent}
              onChange={(e) => setMinProfitPercent(e.target.value)}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground"
            />
          </div>
          <div className="flex-1">
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
        <p className="text-xs text-muted-foreground">
          Scanning {Object.keys({ BTC: 1, ETH: 1, SOL: 1, XRP: 1, ADA: 1, DOGE: 1, ZEC: 1, CC: 1, RAIN: 1 }).length} tokens across Binance, Kraken, Coinbase, OKX, Bybit, and KuCoin. Refreshes every 30s.
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
            <p className="text-muted-foreground">No opportunities above {minProfitPercent}% net profit right now.</p>
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
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-black"
                    style={{ backgroundColor: TICKER_COLORS[opp.token] ?? '#d4af37' }}
                  >
                    {opp.token.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{opp.token}</div>
                    <div className="text-xs text-muted-foreground">{opp.token}/USDT</div>
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
                <div className="flex items-end justify-between">
                  <div className="text-[10px] text-muted-foreground tracking-widest">NET PROFIT</div>
                </div>
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
