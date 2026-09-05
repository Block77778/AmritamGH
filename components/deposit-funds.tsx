'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getBalances, getTransactionHistory, depositWithPaystack, depositWithNowPayments } from '@/app/actions/payments'
import { CreditCard, Coins, Loader } from 'lucide-react'

export default function DepositFunds() {
  const [balances, setBalances] = useState<{ ghs: any; usd: any } | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [ghsAmount, setGhsAmount] = useState('50')
  const [usdAmount, setUsdAmount] = useState('10')
  const [loadingProvider, setLoadingProvider] = useState<'paystack' | 'nowpayments' | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    const [bal, tx] = await Promise.all([getBalances(), getTransactionHistory()])
    setBalances(bal)
    setHistory(tx)
  }

  useEffect(() => { load() }, [])

  const handlePaystack = async () => {
    setError('')
    setLoadingProvider('paystack')
    try {
      const { redirectUrl } = await depositWithPaystack(parseFloat(ghsAmount))
      window.location.href = redirectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start deposit')
      setLoadingProvider(null)
    }
  }

  const handleNowPayments = async () => {
    setError('')
    setLoadingProvider('nowpayments')
    try {
      const { redirectUrl } = await depositWithNowPayments(parseFloat(usdAmount))
      window.location.href = redirectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start deposit')
      setLoadingProvider(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]">
          <div className="text-xs text-muted-foreground tracking-widest mb-1">GHS BALANCE</div>
          <div className="text-3xl font-bold text-primary">
            {balances ? `GHS ${Number(balances.ghs.balance).toFixed(2)}` : '...'}
          </div>
        </div>
        <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]">
          <div className="text-xs text-muted-foreground tracking-widest mb-1">USD BALANCE</div>
          <div className="text-3xl font-bold text-primary">
            {balances ? `$${Number(balances.usd.balance).toFixed(2)}` : '...'}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center -mt-2">
        These are separate balances, not automatically converted between each other.
      </p>

      {error && <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}

      <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CreditCard className="w-4 h-4 text-primary" /> Card / Mobile Money (Paystack) — GHS
        </div>
        <input type="number" value={ghsAmount} onChange={(e) => setGhsAmount(e.target.value)} min="1"
          className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
        <Button onClick={handlePaystack} disabled={loadingProvider !== null} className="w-full flex items-center justify-center gap-2">
          {loadingProvider === 'paystack' ? <Loader className="w-4 h-4 animate-spin" /> : null}
          Deposit GHS {ghsAmount || '0'}
        </Button>
      </div>

      <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Coins className="w-4 h-4 text-primary" /> Crypto (NOWPayments) — USD
        </div>
        <input type="number" value={usdAmount} onChange={(e) => setUsdAmount(e.target.value)} min="1"
          className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
        <Button onClick={handleNowPayments} disabled={loadingProvider !== null} variant="outline" className="w-full flex items-center justify-center gap-2">
          {loadingProvider === 'nowpayments' ? <Loader className="w-4 h-4 animate-spin" /> : null}
          Deposit ${usdAmount || '0'}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-muted-foreground tracking-widest">TRANSACTION HISTORY</div>
        {history.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
        {history.map((tx) => (
          <div key={tx.id} className="p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] flex items-center justify-between text-xs">
            <span className="text-foreground font-medium capitalize">{tx.provider}</span>
            <span className="text-muted-foreground">{tx.currency} {Number(tx.amount).toFixed(2)}</span>
            <span className={tx.status === 'success' ? 'text-primary' : tx.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}>
              {tx.status.toUpperCase()}
            </span>
            <span className="text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
