import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp } from 'lucide-react'

export const metadata = {
  title: 'Dashboard Demo - Crypto Arbitrage Platform',
  description: 'Preview of the arbitrage trading dashboard',
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-[#1a1a1a] bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold">₿</span>
            </div>
            <div>
              <div className="text-xs font-bold text-primary tracking-widest">AMRITAMGH</div>
              <div className="text-xs text-muted-foreground">user@example.com</div>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-4 sm:px-6 lg:px-8 pb-8">
        {/* Stats Overview */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Connected Wallets Card */}
            <div className="group relative p-8 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-xs text-muted-foreground mb-2 tracking-widest">CONNECTED WALLETS</div>
                <div className="text-5xl font-bold text-primary mb-3">3</div>
                <p className="text-xs text-muted-foreground">EVM, Solana, Bitcoin</p>
              </div>
            </div>

            {/* Active Trades Card */}
            <div className="group relative p-8 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-xs text-muted-foreground mb-2 tracking-widest">ACTIVE TRADES</div>
                <div className="text-5xl font-bold text-primary mb-3">2</div>
                <p className="text-xs text-muted-foreground">12 total transactions</p>
              </div>
            </div>

            {/* Best Arbitrage Card */}
            <div className="group relative p-8 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-xs text-muted-foreground mb-2 tracking-widest">BEST ARBITRAGE</div>
                <div className="text-5xl font-bold text-primary mb-3">4.2%</div>
                <p className="text-xs text-muted-foreground">Binance → Kraken</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex gap-8 border-b border-[#2a2a2a]">
            {['overview', 'wallets', 'prices', 'history'].map((tab) => (
              <button
                key={tab}
                className={`px-1 py-3 text-xs font-bold tracking-widest capitalize transition-colors border-b-2 ${
                  tab === 'overview'
                    ? 'text-primary border-b-primary'
                    : 'text-muted-foreground border-b-transparent hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Arbitrage Opportunities */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-foreground">Arbitrage <span className="text-primary">Opportunities</span></h2>

              {/* Token Selector */}
              <div>
                <label className="text-xs font-bold text-primary tracking-widest block mb-4">SELECT TOKEN</label>
                <div className="grid grid-cols-5 gap-2">
                  {['BTC', 'ETH', 'SOL', 'USDC', 'USDT'].map((token) => (
                    <button
                      key={token}
                      className={`py-3 px-2 rounded-lg font-bold text-sm transition-all ${
                        token === 'BTC'
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                          : 'bg-[#1a1a1a] border border-[#2a2a2a] text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Arbitrage Card */}
              <div className="relative p-8 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-background border border-primary/30 overflow-hidden shadow-lg shadow-primary/20">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-40"></div>
                <div className="relative space-y-6">
                  {/* Profit Highlight */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-primary font-bold tracking-widest mb-2">PROFIT OPPORTUNITY</div>
                      <div className="text-5xl font-bold text-primary">4.2%</div>
                      <p className="text-sm text-muted-foreground mt-2">per transaction</p>
                    </div>
                    <TrendingUp className="w-16 h-16 text-primary/20" />
                  </div>

                  {/* Buy/Sell Flow */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-background/50 border border-[#2a2a2a]">
                      <div className="text-xs text-muted-foreground mb-2">BUY FROM</div>
                      <div className="text-2xl font-bold text-foreground mb-2">Binance</div>
                      <div className="text-lg font-semibold text-primary">$43,500.00</div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <ArrowRight className="w-6 h-6 text-primary" />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-background/50 border border-[#2a2a2a]">
                      <div className="text-xs text-muted-foreground mb-2">SELL TO</div>
                      <div className="text-2xl font-bold text-foreground mb-2">Kraken</div>
                      <div className="text-lg font-semibold text-primary">$45,327.50</div>
                    </div>
                  </div>

                  {/* Spread */}
                  <div className="pt-4 border-t border-[#2a2a2a]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Price Spread</span>
                      <span className="text-lg font-bold text-primary">$1,827.50</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade Execution Form */}
              <div className="space-y-4 p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]">
                <div className="text-xs font-bold text-primary tracking-widest">EXECUTE TRADE</div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-2">Select Wallet</label>
                  <select className="w-full p-3 rounded-lg bg-background border border-[#2a2a2a] text-foreground text-sm focus:outline-none focus:border-primary">
                    <option>MetaMask (EVM)</option>
                    <option>Phantom (Solana)</option>
                    <option>Unisat (Bitcoin)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-2">Amount (BTC)</label>
                  <input
                    type="number"
                    defaultValue="1.0"
                    min="0.01"
                    step="0.01"
                    className="w-full p-3 rounded-lg bg-background border border-[#2a2a2a] text-foreground text-sm focus:outline-none focus:border-primary"
                    placeholder="1.0"
                  />
                </div>

                <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Buy Cost</span>
                    <span className="text-foreground font-semibold">$43,500.00</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Sell Value</span>
                    <span className="text-foreground font-semibold">$45,327.50</span>
                  </div>
                  <div className="border-t border-primary/20 pt-2 flex justify-between text-xs font-bold">
                    <span className="text-primary">Profit</span>
                    <span className="text-primary">$1,827.50</span>
                  </div>
                </div>

                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 rounded-lg">
                  Execute Trade - Profit: $1,827.50
                </Button>
              </div>
            </div>

            {/* Right Column - Quick Actions */}
            <div>
              <h2 className="text-3xl font-bold mb-6 text-foreground">Quick <span className="text-primary">Actions</span></h2>
              
              <div className="space-y-6">
                <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]">
                  <h3 className="text-lg font-bold text-foreground mb-4">Connect Wallet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Connect your multi-chain wallets to start trading</p>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Connect New Wallet
                  </Button>
                </div>

                <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]">
                  <h3 className="text-lg font-bold text-foreground mb-4">Recent Trades</h3>
                  <div className="space-y-3">
                    {[
                      { pair: 'BTC: Binance → Coinbase', profit: '+$850.30', time: '2 hours ago' },
                      { pair: 'ETH: Kraken → Uniswap', profit: '+$245.75', time: '5 hours ago' },
                      { pair: 'SOL: Binance → Phantom', profit: '+$125.20', time: '1 day ago' },
                    ].map((trade, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-[#2a2a2a] last:border-b-0">
                        <div>
                          <p className="text-xs text-muted-foreground">{trade.pair}</p>
                          <p className="text-xs text-muted-foreground/70">{trade.time}</p>
                        </div>
                        <span className="text-primary font-bold">{trade.profit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
