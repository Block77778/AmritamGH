'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Loader, RefreshCw } from 'lucide-react'
import { scanAllOpportunities } from '@/app/actions/prices'
import type { SwapPriceData } from '@/app/actions/prices'

interface SwapWindowProps {
  isAuthenticated?: boolean
}

const TICKER_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#14f195', XRP: '#23292f', ADA: '#0033ad', DOGE: '#c2a633',
  ZEC: '#f4b728', CC: '#f5e663', RAIN: '#d4e13a', LTC: '#bfbbbb', LINK: '#2a5ada', DOT: '#e6007a',
  AVAX: '#e84142', UNI: '#ff007a', ATOM: '#2e3148', NEAR: '#000000', APT: '#000000', ARB: '#28a0f0',
  OP: '#ff0420', INJ: '#00d2ff', SEI: '#941ee8', SUI: '#4da2ff', FIL: '#0090ff', RUNE: '#33ff99',
  HBAR: '#000000', PEPE: '#4caf50', SHIB: '#ffa409', WIF: '#c8a2c8', BONK: '#f7b500', DEXE: '#6f4fd1',
}

const REFERENCE_AMOUNT = 1000

export function SwapWindow({ isAuthenticated = false }: SwapWindowProps) {
  const [opportunities, setOpportunities] = useState<SwapPriceData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchOpportunities = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const results = await scanAllOpportunities()
      setOpportunities(results.sort((a, b) => b.profitPercentage - a.profitPercentage))
      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to fetch real-time prices')
      console.error('[v0] Price fetch error:', err)
    } finally {
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => fetchOpportunities(true), 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchOpportunities])

  const getTimeAgo = () => {
    if (!lastUpdated) return 'Never'
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
    const minutes = Math.floor(seconds / 60)
    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    return 'Over an hour ago'
  }

  const profitable = opportunities.filter((o) => o.profitPercentage > 0)
  const bestSpread = opportunities.length > 0 ? Math.max(...opportunities.map((o) => o.spreadPercentage)) : 0
  const tradeLink = (token: string) => (isAuthenticated ? `/dashboard?pair=${token}` : `/sign-up?pair=${token}`)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          <div className="text-center md:text-left flex-1">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              Live <span className="text-primary">Arbitrage Scanner</span>
            </h2>
            <p className="text-muted-foreground">
              Real prices, scanned live across major exchanges — pick an opportunity to trade it
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-xs text-muted-foreground">
              Last updated: <span className="text-primary font-semibold">{getTimeAgo()}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchOpportunities(true)}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary text-sm font-semibold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating...' : 'Refresh'}
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  autoRefresh
                    ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                    : 'bg-muted/10 border-muted/30 text-muted-foreground hover:bg-muted/20'
                }`}
              >
                Auto {autoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a]">
            <div className="text-[10px] text-muted-foreground tracking-widest mb-1">OPPORTUNITIES</div>
            <div className="text-2xl font-bold text-foreground">{profitable.length}</div>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a]">
            <div className="text-[10px] text-muted-foreground tracking-widest mb-1">BEST SPREAD</div>
            <div className="text-2xl font-bold text-primary">{bestSpread.toFixed(2)}%</div>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a]">
            <div className="text-[10px] text-muted-foreground tracking-widest mb-1">COINS SCANNED</div>
            <div className="text-2xl font-bold text-foreground">{opportunities.length}</div>
          </div>
          <div className="p-4 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a]">
            <div className="text-[10px] text-muted-foreground tracking-widest mb-1">LAST UPDATE</div>
            <div className="text-lg font-bold text-foreground">{lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-[#1a1a1a] rounded-xl animate-pulse border border-[#2a2a2a]" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {opportunities.map((opp) => (
            <div
              key={opp.token}
              className="rounded-xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-background overflow-hidden hover:border-primary/40 transition-all"
            >
              <div className="p-5 flex items-center justify-between border-b border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black"
                    style={{ backgroundColor: TICKER_COLORS[opp.token] ?? '#d4af37' }}
                  >
                    {opp.token.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">{opp.token}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Vol: {opp.volume24h ? `$${(opp.volume24h / 1_000_000).toFixed(1)}M` : '—'}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${opp.spreadPercentage >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  {opp.spreadPercentage.toFixed(2)}%
                </div>
              </div>

              <div className="p-5 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground tracking-widest mb-1">BUY</div>
                  <div className="font-bold text-foreground">{opp.buyExchange}</div>
                  <div className="text-primary font-semibold">${opp.buyPrice.toFixed(opp.buyPrice < 1 ? 6 : 2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground tracking-widest mb-1">SELL</div>
                  <div className="font-bold text-foreground">{opp.sellExchange}</div>
                  <div className="text-primary font-semibold">${opp.sellPrice.toFixed(opp.sellPrice < 1 ? 6 : 2)}</div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <div className="text-[10px] text-muted-foreground tracking-widest">NET PROFIT</div>
                <div className={`text-3xl font-bold ${opp.profitPercentage >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  {opp.profitPercentage.toFixed(2)}%
                </div>
              </div>

              <div className="px-5 pb-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Est. on ${REFERENCE_AMOUNT.toLocaleString()}</span>
                <span className={`font-bold ${opp.profitPercentage >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  ${((opp.profit / opp.buyPrice) * REFERENCE_AMOUNT).toFixed(2)}
                </span>
              </div>

              <Link href={tradeLink(opp.token)} className="block px-5 pb-5">
                <Button size="sm" className="w-full">
                  Trade This Pair
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-md mx-auto space-y-2">
        {isAuthenticated ? (
          <Link href="/dashboard" className="block">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold py-6 text-lg">
              Go to Dashboard
            </Button>
          </Link>
        ) : (
          <>
            <Link href="/sign-up" className="block">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold py-6 text-lg">
                Sign Up to Trade
              </Button>
            </Link>
            <Link href="/sign-in" className="block">
              <Button variant="outline" className="w-full border-primary/40 text-foreground hover:bg-primary/5 rounded-lg font-semibold py-6 text-lg">
                Already have an account? Sign In
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
