'use client'

import { useState, useEffect } from 'react'
import { getConnectedWallets, getTransactionHistory } from '@/app/actions/wallet'
import { fetchTokenQuotes } from '@/app/actions/prices'
import { listExchangeCredentials } from '@/app/actions/credentials'
import { calculateArbitrage, ExchangePrice } from '@/lib/exchanges'
import { formatWalletAddress } from '@/lib/wallet-utils'
import WalletConnector from './wallet-connector'
import PriceMonitor from './price-monitor'
import TransactionHistory from './transaction-history'
import ArbitrageOpportunities from './arbitrage-opportunities'
import ExchangeCredentials from './exchange-credentials'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name?: string
}

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter()
  const [wallets, setWallets] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [prices, setPrices] = useState<ExchangePrice[]>([])
  const [credentials, setCredentials] = useState<Array<{ id: string; exchangeId: string; label: string; status: string }>>([])
  const [loading, setLoading] = useState(true)
  const [selectedToken, setSelectedToken] = useState('BTC')
  const [activeTab, setActiveTab] = useState('overview')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [walletsData, transactionsData, pricesData, credentialsData] = await Promise.all([
          getConnectedWallets(),
          getTransactionHistory(),
          fetchTokenQuotes(selectedToken),
          listExchangeCredentials(),
        ])

        setWallets(walletsData)
        setTransactions(transactionsData)
        setPrices(pricesData)
        setCredentials(credentialsData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedToken])

  // Refresh prices periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const pricesData = await fetchTokenQuotes(selectedToken)
        setPrices(pricesData)
      } catch (error) {
        console.error('Error refreshing prices:', error)
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [selectedToken])

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/')
  }

  const arbitrage = prices.length > 0 ? calculateArbitrage(prices) : null

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
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs">Logout</span>
          </Button>
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
                <div className="text-5xl font-bold text-primary mb-3">{wallets.length}</div>
                <p className="text-xs text-muted-foreground">
                  {wallets.map((w) => w.chainType).join(', ') || 'None connected'}
                </p>
              </div>
            </div>

            {/* Active Trades Card */}
            <div className="group relative p-8 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-xs text-muted-foreground mb-2 tracking-widest">ACTIVE TRADES</div>
                <div className="text-5xl font-bold text-primary mb-3">
                  {transactions.filter((t) => t.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {transactions.length} total transactions
                </p>
              </div>
            </div>

            {/* Best Arbitrage Card */}
            <div className="group relative p-8 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-xs text-muted-foreground mb-2 tracking-widest">BEST ARBITRAGE</div>
                <div className="text-5xl font-bold text-primary mb-3">
                  {arbitrage ? `${arbitrage.profitPercentage.toFixed(2)}%` : '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {arbitrage ? `${arbitrage.buyFrom} → ${arbitrage.sellTo}` : 'No opportunity'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex gap-8 border-b border-[#2a2a2a]">
            {['overview', 'wallets', 'prices', 'history', 'exchanges'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1 py-3 text-xs font-bold tracking-widest capitalize transition-colors border-b-2 ${
                  activeTab === tab
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
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-foreground">Arbitrage <span className="text-primary">Opportunities</span></h2>
                <ArbitrageOpportunities
                  token={selectedToken}
                  prices={prices}
                  arbitrage={arbitrage}
                  onTokenChange={setSelectedToken}
                  credentials={credentials}
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-6 text-foreground">Quick <span className="text-primary">Actions</span></h2>
                <div className="space-y-3">
                  <WalletConnector onWalletAdded={() => {}} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallets' && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-foreground">Connected <span className="text-primary">Wallets</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wallets.length > 0 ? (
                  wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="bg-card border border-border rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {wallet.chainType}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            {wallet.walletProvider}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-green-500/20 text-green-600 text-xs rounded-full">
                          Connected
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-all">
                        {formatWalletAddress(wallet.walletAddress, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(wallet.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center">
                    <p className="text-muted-foreground mb-4">No wallets connected</p>
                    <WalletConnector onWalletAdded={() => {}} />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'prices' && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-foreground">Price <span className="text-primary">Monitor</span></h2>
              <PriceMonitor
                token={selectedToken}
                prices={prices}
                onTokenChange={setSelectedToken}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-foreground">Transaction <span className="text-primary">History</span></h2>
              <TransactionHistory transactions={transactions} />
            </div>
          )}

          {activeTab === 'exchanges' && <ExchangeCredentials />}
        </div>
      </main>
    </div>
  )
}
