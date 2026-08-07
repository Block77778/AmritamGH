'use client'

import { ExchangePrice } from '@/lib/exchanges'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PriceMonitorProps {
  token: string
  prices: ExchangePrice[]
  onTokenChange: (token: string) => void
}

const POPULAR_TOKENS = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT']

export default function PriceMonitor({
  token,
  prices,
  onTokenChange,
}: PriceMonitorProps) {
  const lowestPrice = prices.length > 0 ? Math.min(...prices.map((p) => p.price)) : 0
  const highestPrice = prices.length > 0 ? Math.max(...prices.map((p) => p.price)) : 0
  const priceSpread = lowestPrice > 0 ? ((highestPrice - lowestPrice) / lowestPrice) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Token Selection */}
      <div className="bg-card border border-border rounded-lg p-4">
        <label className="text-sm font-medium text-muted-foreground block mb-3">Select Token</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {POPULAR_TOKENS.map((t) => (
            <button
              key={t}
              onClick={() => onTokenChange(t)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                token === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Current spread: <span className="text-foreground font-semibold">{priceSpread.toFixed(2)}%</span></p>
        </div>
      </div>

      {/* Price Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Exchange</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Price (USD)</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Volume 24h</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Diff</th>
              </tr>
            </thead>
            <tbody>
              {prices.length > 0 ? (
                prices
                  .sort((a, b) => a.price - b.price)
                  .map((price, idx) => {
                    const isLowest = price.price === lowestPrice
                    const isHighest = price.price === highestPrice
                    const priceDiff =
                      lowestPrice > 0
                        ? ((price.price - lowestPrice) / lowestPrice) * 100
                        : 0

                    return (
                      <tr
                        key={idx}
                        className={`border-b border-border hover:bg-muted/50 transition-colors ${
                          isLowest
                            ? 'bg-green-500/10'
                            : isHighest
                              ? 'bg-red-500/10'
                              : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{price.exchange}</span>
                            {isLowest && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-600 text-xs rounded-full">
                                Lowest
                              </span>
                            )}
                            {isHighest && (
                              <span className="px-2 py-1 bg-red-500/20 text-red-600 text-xs rounded-full">
                                Highest
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          ${price.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {price.volume24h
                            ? `$${(price.volume24h / 1e6).toFixed(1)}M`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {priceDiff > 0 ? (
                            <div className="flex items-center justify-end gap-1 text-red-600">
                              <TrendingUp className="w-4 h-4" />
                              +{priceDiff.toFixed(2)}%
                            </div>
                          ) : (
                            <div className="text-green-600">Best</div>
                          )}
                        </td>
                      </tr>
                    )
                  })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Loading prices...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      {prices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Lowest Price</p>
            <p className="text-2xl font-bold text-green-600">${lowestPrice.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Highest Price</p>
            <p className="text-2xl font-bold text-red-600">${highestPrice.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Price Spread</p>
            <p className="text-2xl font-bold text-blue-600">{priceSpread.toFixed(2)}%</p>
          </div>
        </div>
      )}
    </div>
  )
}
