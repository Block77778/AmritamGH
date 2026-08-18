'use client'

import { useState, useEffect } from 'react'
import { createScheduledOrder, listScheduledOrders, cancelScheduledOrder } from '@/app/actions/scheduled-orders'
import { listExchangeCredentials } from '@/app/actions/credentials'
import { Button } from '@/components/ui/button'
import { Clock, X, AlertCircle } from 'lucide-react'

const TOKENS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'ZEC', 'CC', 'RAIN', 'LTC', 'LINK', 'DOT', 'AVAX', 'UNI', 'ATOM', 'NEAR', 'APT', 'ARB', 'OP', 'INJ', 'SEI', 'SUI', 'FIL', 'RUNE', 'HBAR', 'PEPE', 'SHIB', 'WIF', 'BONK', 'DEXE']

export default function ScheduledOrders() {
  const [credentials, setCredentials] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const [credentialId, setCredentialId] = useState('')
  const [token, setToken] = useState('BTC')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('0.01')
  const [triggerType, setTriggerType] = useState<'price' | 'time'>('price')
  const [triggerPrice, setTriggerPrice] = useState('')
  const [triggerAt, setTriggerAt] = useState('')

  const load = async () => {
    setLoading(true)
    const [creds, ords] = await Promise.all([listExchangeCredentials(), listScheduledOrders()])
    setCredentials(creds)
    setOrders(ords)
    if (!credentialId && creds[0]) setCredentialId(creds[0].id)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setError('')
    setCreating(true)
    try {
      await createScheduledOrder({
        credentialId,
        symbol: `${token}/USDT`,
        side,
        amount: parseFloat(amount),
        triggerType,
        triggerPrice: triggerType === 'price' ? parseFloat(triggerPrice) : undefined,
        triggerAt: triggerType === 'time' ? triggerAt : undefined,
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setCreating(false)
    }
  }

  const handleCancel = async (id: string) => {
    await cancelScheduledOrder(id)
    await load()
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="text-red-300 font-semibold mb-1">Executes at market price, not a guaranteed price</p>
          <p>
            When a trigger fires, the order executes immediately at whatever the current market price is — not
            necessarily your exact target. Fast-moving or thin markets can fill notably worse than expected. Checks run
            on the same server schedule as the trading bot, which may not be instant — see your bot settings for the
            current check frequency.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Schedule an Order</span>
        </div>

        {credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add an exchange API key in the Exchanges tab first.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Exchange</label>
                <select value={credentialId} onChange={(e) => setCredentialId(e.target.value)} className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground">
                  {credentials.map((c) => <option key={c.id} value={c.id}>{c.label} ({c.exchangeId})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Token</label>
                <select value={token} onChange={(e) => setToken(e.target.value)} className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground">
                  {TOKENS.map((t) => <option key={t} value={t}>{t}/USDT</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setSide('buy')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${side === 'buy' ? 'bg-primary text-primary-foreground' : 'bg-[#2a2a2a] text-muted-foreground'}`}>Buy</button>
              <button onClick={() => setSide('sell')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${side === 'sell' ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-muted-foreground'}`}>Sell</button>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount ({token})</label>
              <input type="number" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setTriggerType('price')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${triggerType === 'price' ? 'bg-primary text-primary-foreground' : 'bg-[#2a2a2a] text-muted-foreground'}`}>Trigger at Price</button>
              <button onClick={() => setTriggerType('time')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${triggerType === 'time' ? 'bg-primary text-primary-foreground' : 'bg-[#2a2a2a] text-muted-foreground'}`}>Trigger at Time</button>
            </div>

            {triggerType === 'price' ? (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Trigger price (USDT) — {side === 'buy' ? 'buys when price drops to or below this' : 'sells when price rises to or above this'}
                </label>
                <input type="number" step="0.000001" value={triggerPrice} onChange={(e) => setTriggerPrice(e.target.value)} className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Trigger date/time</label>
                <input type="datetime-local" value={triggerAt} onChange={(e) => setTriggerAt(e.target.value)} className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
              </div>
            )}

            {error && <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}

            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? 'Scheduling...' : 'Schedule Order'}
            </Button>
          </>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-muted-foreground tracking-widest">YOUR SCHEDULED ORDERS</div>
        {orders.length === 0 && <p className="text-sm text-muted-foreground">No scheduled orders yet.</p>}
        {orders.map((o) => (
          <div key={o.id} className="p-4 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] flex items-center justify-between text-sm">
            <div>
              <div className="font-semibold text-foreground">
                {o.side === 'buy' ? 'Buy' : 'Sell'} {o.amount} {o.symbol} on {o.exchangeId}
              </div>
              <div className="text-xs text-muted-foreground">
                {o.triggerType === 'price'
                  ? `Trigger: price ${o.side === 'buy' ? '≤' : '≥'} $${Number(o.triggerPrice).toFixed(6)}`
                  : `Trigger: ${new Date(o.triggerAt).toLocaleString()}`}
              </div>
              {o.error && <div className="text-xs text-red-400 mt-1">{o.error}</div>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                o.status === 'executed' ? 'bg-primary/20 text-primary' :
                o.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                o.status === 'cancelled' ? 'bg-muted text-muted-foreground' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {o.status.toUpperCase()}
              </span>
              {o.status === 'pending' && (
                <button onClick={() => handleCancel(o.id)} className="text-muted-foreground hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
