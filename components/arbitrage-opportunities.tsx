'use client'

import { useState } from 'react'
import { ExchangePrice, calculateArbitrage } from '@/lib/exchanges'
import { executeOpportunity } from '@/app/actions/trading'
import { Button } from '@/components/ui/button'
import { ArrowRight, AlertCircle, TrendingUp } from 'lucide-react'

interface ArbitrageOpportunitiesProps {
  token: string
  prices: ExchangePrice[]
  arbitrage: ReturnType<typeof calculateArbitrage> | null
  onTokenChange: (token: string) => void
  credentials: Array<{ id: string; exchangeId: string; label: string; status: string }>
}

const POPULAR_TOKENS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'ZEC', 'CC', 'RAIN']

export default function ArbitrageOpportunities({
  token,
  prices,
  arbitrage,
  onTokenChange,
  credentials,
}: ArbitrageOpportunitiesProps) {
  const [amount, setAmount] = useState('1')
  const [executing, setExecuting] = useState(false)
  const [message, setMessage] = useState('')

  const handleExecute = async () => {
    if (!arbitrage || !amount) {
      setMessage('Please fill in all fields')
      return
    }

    setExecuting(true)
    setMessage('')

    try {
      const buyCredential = credentials.find((credential) => credential.exchangeId === arbitrage.buyFrom)
      const sellCredential = credentials.find((credential) => credential.exchangeId === arbitrage.sellTo)
      if (!buyCredential || !sellCredential) {
        setMessage('Connect validated trading-only API keys for both exchanges before executing.')
        return
      }
      const result = await executeOpportunity({
        opportunityId: `${token}-${Date.now()}`,
        buyCredentialId: buyCredential.id,
        sellCredentialId: sellCredential.id,
        symbol: `${token}/USDT`,
        amount: parseFloat(amount),
        buyPrice: arbitrage.buyPrice,
        sellPrice: arbitrage.sellPrice,
      })
      setMessage(`Live orders submitted: ${result.buyOrderId} / ${result.sellOrderId}`)
      setAmount('1')
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Token Selector */}
      <div>
        <label className="text-xs font-bold text-primary tracking-widest block mb-4">SELECT TOKEN</label>
        <div className="grid grid-cols-5 gap-2">
          {POPULAR_TOKENS.map((t) => (
            <button
              key={t}
              onClick={() => onTokenChange(t)}
              className={`py-3 px-2 rounded-lg font-bold text-sm transition-all ${
                token === t
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] text-muted-foreground hover:border-primary/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Arbitrage Opportunity Display */}
      {arbitrage ? (
        <div className="space-y-6">
          {/* Main Arbitrage Card */}
          <div className="relative p-8 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-background border border-primary/30 overflow-hidden shadow-lg shadow-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-40"></div>
            <div className="relative space-y-6">
              {/* Profit Highlight */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-primary font-bold tracking-widest mb-2">PROFIT OPPORTUNITY</div>
                  <div className="text-5xl font-bold text-primary">{arbitrage.profitPercentage.toFixed(2)}%</div>
                  <p className="text-sm text-muted-foreground mt-2">per transaction</p>
                </div>
                <TrendingUp className="w-16 h-16 text-primary/20" />
              </div>

              {/* Buy/Sell Flow */}
              <div className="grid grid-cols-3 gap-4">
                {/* Buy From */}
                <div className="p-4 rounded-lg bg-background/50 border border-[#2a2a2a]">
                  <div className="text-xs text-muted-foreground mb-2">BUY FROM</div>
                  <div className="text-2xl font-bold text-foreground mb-2">{arbitrage.buyFrom}</div>
                  <div className="text-lg font-semibold text-primary">${arbitrage.buyPrice.toFixed(2)}</div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Sell To */}
                <div className="p-4 rounded-lg bg-background/50 border border-[#2a2a2a]">
                  <div className="text-xs text-muted-foreground mb-2">SELL TO</div>
                  <div className="text-2xl font-bold text-foreground mb-2">{arbitrage.sellTo}</div>
                  <div className="text-lg font-semibold text-primary">${arbitrage.sellPrice.toFixed(2)}</div>
                </div>
              </div>

              {/* Spread */}
              <div className="pt-4 border-t border-[#2a2a2a]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Price Spread</span>
                  <span className="text-lg font-bold text-primary">${(arbitrage.sellPrice - arbitrage.buyPrice).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Execution Form */}
          <div className="space-y-4 p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]">
            <div className="text-xs font-bold text-primary tracking-widest">EXECUTE TRADE</div>

            {/* Amount Input */}
            <div>
              <label className="text-xs text-muted-foreground block mb-2">Amount ({token})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className="w-full p-3 rounded-lg bg-background border border-[#2a2a2a] text-foreground text-sm focus:outline-none focus:border-primary"
                placeholder="1.0"
              />
            </div>

            {/* Calculation Display */}
            {amount && (
              <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Buy Cost</span>
                  <span className="text-foreground font-semibold">${(arbitrage.buyPrice * parseFloat(amount)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sell Value</span>
                  <span className="text-foreground font-semibold">${(arbitrage.sellPrice * parseFloat(amount)).toFixed(2)}</span>
                </div>
                <div className="border-t border-primary/20 pt-2 flex justify-between text-xs font-bold">
                  <span className="text-primary">Profit</span>
                  <span className="text-primary">${((arbitrage.sellPrice - arbitrage.buyPrice) * parseFloat(amount)).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {/* Execute Button */}
            <Button
              onClick={handleExecute}
              disabled={executing || !arbitrage || !amount}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 rounded-lg"
            >
              {executing ? 'Processing...' : `Execute Trade - Profit: $${((arbitrage.sellPrice - arbitrage.buyPrice) * parseFloat(amount)).toFixed(2)}`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-lg border-2 border-dashed border-[#2a2a2a] text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No arbitrage opportunities found for {token}</p>
          <p className="text-xs text-muted-foreground mt-2">Try selecting a different token or check again later</p>
        </div>
      )}
    </div>
  )
}
