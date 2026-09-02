'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getBalance, getTransactionHistory, depositWithPaystack, depositWithNowPayments } from '@/app/actions/payments'
import { CreditCard, Coins, Loader } from 'lucide-react'

export default function DepositFunds() {
  const [balance, setBalance] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [amount, setAmount] = useState('50')
  const [loadingProvider, setLoadingProvider] = useState<'paystack' | 'nowpayments' | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    const [bal, tx] = await Promise.all([getBalance(), getTransactionHistory()])
    setBalance(bal)
    setHistory(tx)
  }

  useEffect(() => { load() }, [])

  const handleDeposit = async (provider: 'paystack' | 'nowpayments') => {
    setError('')
    setLoadingProvider(provider)
    try {
      const { redirectUrl } = provider === 'paystack'
        ? await depositWithPaystack(parseFloat(amount))
        : await depositWithNowPayments(parseFloat(amount))
      window.location.href = redirectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start deposit')
      setLoadingProvider(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]">
        <div className="text-xs text-muted-foreground tracking-widest mb-1">CURRENT BALANCE</div>
        <div className="text-4xl font-bold text-primary">
          {balance ? `${balance.currency} ${Number(balance.balance).toFixed(2)}` : '...'}
        </div>
      </div>

      <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Amount ({balance?.currency || 'GHS'})</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1"
            className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
        </div>

        {error && <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}

        <Button onClick={() => handleDeposit('paystack')} disabled={loadingProvider !== null} className="w-full flex items-center justify-center gap-2">
          {loadingProvider === 'paystack' ? <Loader className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Pay with Card / Mobile Money (Paystack)
        </Button>
        <Button onClick={() => handleDeposit('nowpayments')} disabled={loadingProvider !== null} variant="outline" className="w-full flex items-center justify-center gap-2">
          {loadingProvider === 'nowpayments' ? <Loader className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
          Pay with Crypto (NOWPayments)
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
