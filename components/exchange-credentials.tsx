'use client'

import { useEffect, useState } from 'react'
import { listSupportedExchanges, listExchangeCredentials, saveExchangeCredential, revokeExchangeCredential } from '@/app/actions/credentials'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ExchangeCredentials() {
  const [exchanges, setExchanges] = useState<string[]>([])
  const [saved, setSaved] = useState<Array<{ id: string; exchangeId: string; label: string; status: string }>>([])
  const [exchangeId, setExchangeId] = useState('binance')
  const [label, setLabel] = useState('Primary trading account')
  const [apiKey, setApiKey] = useState('')
  const [secret, setSecret] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listSupportedExchanges(), listExchangeCredentials()]).then(([supported, existing]) => {
      setExchanges(supported)
      setSaved(existing)
    })
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const credential = await saveExchangeCredential({ exchangeId, label, apiKey, secret, passphrase: passphrase || undefined })
      setSaved((items) => [credential, ...items])
      setApiKey('')
      setSecret('')
      setPassphrase('')
      setMessage('Credentials validated and encrypted successfully. Withdrawals are not permitted.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to validate credentials')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    setBusy(true)
    try {
      await revokeExchangeCredential(id)
      setSaved((items) => items.filter((item) => item.id !== id))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to revoke credential')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs tracking-widest text-primary">EXECUTION ACCESS</p>
        <h2 className="mt-2 text-3xl font-bold text-foreground">Exchange API vault</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Connect trading-only API keys. Keys are encrypted server-side, never returned to the browser, and must have withdrawals disabled.</p>
      </div>
      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="exchange">Exchange</Label><select id="exchange" value={exchangeId} onChange={(event) => setExchangeId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{exchanges.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="label">Label</Label><Input id="label" value={label} onChange={(event) => setLabel(event.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="api-key">API key</Label><Input id="api-key" value={apiKey} onChange={(event) => setApiKey(event.target.value)} required autoComplete="off" /></div>
        <div className="space-y-2"><Label htmlFor="api-secret">API secret</Label><Input id="api-secret" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} required autoComplete="new-password" /></div>
        <div className="space-y-2"><Label htmlFor="passphrase">Passphrase (if required)</Label><Input id="passphrase" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="new-password" /></div>
        <div className="flex items-end"><Button type="submit" disabled={busy || !exchanges.length}>{busy ? 'Validating…' : 'Validate and encrypt'}</Button></div>
        {message && <p className="md:col-span-2 text-sm text-muted-foreground" role="status">{message}</p>}
      </form>
      {saved.length > 0 && <div className="space-y-3">{saved.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4"><div><p className="font-medium text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.exchangeId} · {item.status} · trade only</p></div><Button variant="outline" size="sm" onClick={() => revoke(item.id)} disabled={busy}>Revoke</Button></div>)}</div>}
    </section>
  )
}
