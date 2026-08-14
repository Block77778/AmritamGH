'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Loader, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { fetchSwapPrices } from '@/app/actions/prices'

interface SwapWindowProps {
  isAuthenticated?: boolean
}

interface PriceData {
  token: string
  buyExchange: string
  buyPrice: number
  sellExchange: string
  sellPrice: number
  spread: number
  spreadPercentage: number
  profit: number
  profitPercentage: number
  timestamp: number
}

interface PriceHistory {
  price: number
  timestamp: number
}

export function SwapWindow({ isAuthenticated = false }: SwapWindowProps) {
  const [selectedToken, setSelectedToken] = useState('BTC')
  const [amount, setAmount] = useState('1')
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const tokens = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'ZEC', 'CC', 'RAIN']

  // Fetch real prices function
  const fetchPrices = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const data = await fetchSwapPrices(selectedToken)
      if (data) {
        // Track previous price for comparison
        if (priceData) {
          setPreviousPrice(priceData.buyPrice)
        }
        setPriceData(data)
        setLastUpdated(new Date())
      } else {
        setError(`Could not fetch prices for ${selectedToken}`)
      }
    } catch (err) {
      setError('Failed to fetch real-time prices')
      console.error('[v0] Price fetch error:', err)
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  // Fetch prices when token changes
  useEffect(() => {
    setPreviousPrice(null)
    setLastUpdated(null)
    fetchPrices()
  }, [selectedToken])

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchPrices(true)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, selectedToken])

  // Calculate potential profit based on user input
  const calculateProfit = () => {
    if (!priceData || !amount) return { totalCost: 0, totalRevenue: 0, profit: 0 }
    
    const numAmount = parseFloat(amount) || 0
    const totalCost = numAmount * priceData.buyPrice
    const totalRevenue = numAmount * priceData.sellPrice
    const feesCost = totalCost * 0.001 // 0.1% fee
    const feesRevenue = totalRevenue * 0.001 // 0.1% fee
    const profit = totalRevenue - totalCost - feesCost - feesRevenue

    return { totalCost, totalRevenue, profit }
  }

  const profitCalc = calculateProfit()
  const isArbitrage = priceData && priceData.profitPercentage > 0

  // Determine if price went up or down
  const getPriceChange = () => {
    if (!priceData || !previousPrice) return null
    const change = priceData.buyPrice - previousPrice
    const percentChange = (change / previousPrice) * 100
    return { change, percentChange }
  }

  const priceChange = getPriceChange()

  // Format time since last update
  const getTimeAgo = () => {
    if (!lastUpdated) return 'Never'
    const now = new Date()
    const diff = now.getTime() - lastUpdated.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    return 'Over an hour ago'
  }

  return (
    <div className="w-full">
      {/* Header with Refresh Controls */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          <div className="text-center md:text-left flex-1">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              Arbitrage <span className="text-primary">Swap Window</span>
            </h2>
            <p className="text-muted-foreground">
              Compare prices and find the best arbitrage opportunities
            </p>
          </div>
          
          {/* Refresh Controls */}
          <div className="flex flex-col items-end gap-3">
            {/* Last Updated */}
            <div className="text-xs text-muted-foreground">
              Last updated: <span className="text-primary font-semibold">{getTimeAgo()}</span>
            </div>
            
            {/* Refresh and Auto-refresh Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => fetchPrices(true)}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary text-sm font-semibold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating...' : 'Refresh'}
              </button>
              
              {/* Auto-refresh Toggle */}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Token Selection & Amount */}
        <div className="space-y-6">
          {/* Token Selector */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] rounded-xl p-6">
            <label className="text-sm text-muted-foreground mb-4 block tracking-widest font-bold">SELECT TOKEN</label>
            <div className="grid grid-cols-3 gap-2">
              {tokens.map((token) => (
                <button
                  key={token}
                  onClick={() => setSelectedToken(token)}
                  disabled={loading}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                    selectedToken === token
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-[#2a2a2a] text-foreground hover:bg-[#3a3a3a]'
                  } disabled:opacity-50`}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] rounded-xl p-6">
            <label className="text-sm text-muted-foreground mb-3 block tracking-widest font-bold">AMOUNT</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-2 text-foreground text-lg font-semibold focus:outline-none focus:border-primary"
              />
              <span className="text-foreground font-semibold">{selectedToken}</span>
            </div>
          </div>

          {/* Profit Card */}
          {loading ? (
            <div className="bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] rounded-xl p-6 flex items-center justify-center gap-2">
              <Loader className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Fetching real prices...</span>
            </div>
          ) : error ? (
            <div className="bg-gradient-to-br from-red-900/20 to-red-950/20 border border-red-500/30 rounded-xl p-6">
              <div className="text-sm text-red-400">{error}</div>
            </div>
          ) : priceData && isArbitrage ? (
            <div className="bg-gradient-to-br from-green-900/20 to-green-950/20 border border-green-500/30 rounded-xl p-6">
              <div className="text-sm text-muted-foreground mb-2 tracking-widest font-bold">POTENTIAL PROFIT</div>
              <div className="text-4xl font-bold text-green-400 mb-1">${profitCalc.profit.toFixed(2)}</div>
              <div className="text-xs text-green-400">{priceData.profitPercentage.toFixed(2)}% profit on {amount} {selectedToken}</div>
            </div>
          ) : null}
        </div>

        {/* Middle Panel - Exchange Price Comparison */}
        <div className="flex flex-col justify-center">
          {loading ? (
            <div className="space-y-4">
              <div className="h-32 bg-[#1a1a1a] rounded-xl animate-pulse border border-[#2a2a2a]"></div>
              <div className="h-16 bg-[#1a1a1a] rounded-lg animate-pulse border border-[#2a2a2a]"></div>
              <div className="h-32 bg-[#1a1a1a] rounded-xl animate-pulse border border-[#2a2a2a]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          ) : priceData ? (
            <div className="space-y-4">
              {/* Buy Card */}
              <div className="bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] hover:border-primary/50 rounded-xl p-6 transition-all">
                <div className="text-xs text-primary mb-2 tracking-widest">BUY FROM</div>
                <div className="text-2xl font-bold text-foreground mb-1">{priceData.buyExchange}</div>
                <div className="flex items-end gap-3 mb-3">
                  <div className="text-3xl font-bold text-primary">${priceData.buyPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                  {priceChange && (
                    <div className={`flex items-center gap-1 text-sm font-semibold pb-1 ${priceChange.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {priceChange.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {priceChange.percentChange >= 0 ? '+' : ''}{priceChange.percentChange.toFixed(2)}%
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Per {priceData.token}</div>
              </div>

              {/* Spread Indicator */}
              <div className="flex justify-center">
                <div className="bg-gradient-to-r from-[#1a1a1a] to-background border border-green-500/30 rounded-lg px-6 py-3 text-center hover:border-green-500/50 transition-all">
                  <div className="text-green-400 font-bold text-lg">{priceData.spreadPercentage.toFixed(2)}%</div>
                  <div className="text-xs text-muted-foreground">Price Spread</div>
                </div>
              </div>

              {/* Sell Card */}
              <div className="bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] hover:border-primary/50 rounded-xl p-6 transition-all">
                <div className="text-xs text-primary mb-2 tracking-widest font-bold">SELL TO</div>
                <div className="text-2xl font-bold text-foreground mb-1">{priceData.sellExchange}</div>
                <div className="text-3xl font-bold text-primary mb-3">${priceData.sellPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                <div className="text-xs text-muted-foreground">Per {priceData.token}</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Panel - Summary & CTA */}
        <div className="flex flex-col justify-center">
          {loading ? (
            <div className="space-y-4">
              <div className="h-20 bg-[#1a1a1a] rounded-xl animate-pulse border border-[#2a2a2a]"></div>
              <div className="h-20 bg-[#1a1a1a] rounded-xl animate-pulse border border-[#2a2a2a]"></div>
              <div className="h-12 bg-[#1a1a1a] rounded-lg animate-pulse border border-[#2a2a2a]"></div>
            </div>
          ) : error ? null : priceData ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] rounded-xl p-6">
                <div className="text-xs text-muted-foreground mb-1 tracking-widest font-bold">TOTAL COST</div>
                <div className="text-2xl font-bold text-foreground">${profitCalc.totalCost.toFixed(2)}</div>
              </div>

              <div className="bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] rounded-xl p-6">
                <div className="text-xs text-muted-foreground mb-1 tracking-widest font-bold">REVENUE</div>
                <div className="text-2xl font-bold text-foreground">${profitCalc.totalRevenue.toFixed(2)}</div>
              </div>

              <div className={`bg-gradient-to-br rounded-xl p-6 border ${
                profitCalc.profit > 0
                  ? 'from-green-900/20 to-green-950/20 border-green-500/30'
                  : 'from-[#1a1a1a] to-background border-[#2a2a2a]'
              }`}>
                <div className="text-xs text-muted-foreground mb-1 tracking-widest font-bold">NET PROFIT</div>
                <div className={`text-2xl font-bold ${profitCalc.profit > 0 ? 'text-green-400' : 'text-foreground'}`}>
                  ${profitCalc.profit.toFixed(2)}
                </div>
              </div>

              {/* CTA Buttons */}
              {isAuthenticated ? (
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold py-6 text-lg mt-2">
                  Execute Swap Now
                </Button>
              ) : (
                <div className="space-y-2 pt-2">
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
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
