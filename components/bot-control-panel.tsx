'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getBotConfig, updateBotConfig, getBotTradeLog, runBotNow } from '@/app/actions/bot'
import { Bot, ShieldAlert, Loader, Play } from 'lucide-react'

export default function BotControlPanel() {
  const [config, setConfig] = useState<any>(null)
  const [log, setLog] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<string>('')

  const load = async () => {
    const [cfg, logRows] = await Promise.all([getBotConfig(), getBotTradeLog()])
    setConfig(cfg)
    setLog(logRows)
  }

  useEffect(() => { load() }, [])

  const save = async (patch: Partial<typeof config>) => {
    const next = { ...config, ...patch }
    setConfig(next)
    setSaving(true)
    try {
      await updateBotConfig({
        enabled: next.enabled, dryRun: next.dryRun, symbols: next.symbols,
        maxAmountPerTrade: Number(next.maxAmountPerTrade), dailyLossCapUsd: Number(next.dailyLossCapUsd),
        minNetProfitBps: Number(next.minNetProfitBps), cooldownSeconds: Number(next.cooldownSeconds),
      })
    } finally {
      setSaving(false)
    }
  }

  const runNow = async () => {
    setRunning(true)
    setRunResult('')
    try {
      const result = await runBotNow()
      setRunResult(JSON.stringify(result, null, 2))
      await load()
    } finally {
      setRunning(false)
    }
  }

  if (!config) return <div className="text-sm text-muted-foreground">Loading bot config...</div>

  return (
    <div className="space-y-6">
      {!config.dryRun && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">
            <span className="font-semibold">Live mode is ON.</span> The bot will place real orders with real funds, unattended, whenever it finds a qualifying opportunity.
          </div>
        </div>
      )}

      {config.autoDisabledReason && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-200">
          Bot was auto-disabled: {config.autoDisabledReason}
        </div>
      )}

      <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Trading Bot</span>
          </div>
          <button
            onClick={() => save({ enabled: !config.enabled })}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${config.enabled ? 'bg-primary text-primary-foreground' : 'bg-[#2a2a2a] text-muted-foreground'}`}
          >
            {config.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => save({ dryRun: true })}
            className={`flex-1 py-2 rounded-lg text-xs font-bold ${config.dryRun ? 'bg-primary text-primary-foreground' : 'bg-[#2a2a2a] text-muted-foreground'}`}
          >
            Dry Run (simulated)
          </button>
          <button
            onClick={() => save({ dryRun: false })}
            className={`flex-1 py-2 rounded-lg text-xs font-bold ${!config.dryRun ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-muted-foreground'}`}
          >
            Live (real money)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Symbols (comma-separated)</label>
            <input value={config.symbols} onChange={(e) => setConfig({ ...config, symbols: e.target.value })} onBlur={() => save({})}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Max amount per trade</label>
            <input type="number" value={config.maxAmountPerTrade} onChange={(e) => setConfig({ ...config, maxAmountPerTrade: e.target.value })} onBlur={() => save({})}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Daily loss cap (USD) — kill switch</label>
            <input type="number" value={config.dailyLossCapUsd} onChange={(e) => setConfig({ ...config, dailyLossCapUsd: e.target.value })} onBlur={() => save({})}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Min net profit (bps)</label>
            <input type="number" value={config.minNetProfitBps} onChange={(e) => setConfig({ ...config, minNetProfitBps: e.target.value })} onBlur={() => save({})}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Cooldown between trades on same symbol (seconds)</label>
            <input type="number" value={config.cooldownSeconds} onChange={(e) => setConfig({ ...config, cooldownSeconds: e.target.value })} onBlur={() => save({})}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
          </div>
        </div>

        {saving && <div className="text-xs text-muted-foreground">Saving...</div>}

        <Button onClick={runNow} disabled={running} variant="outline" className="w-full flex items-center gap-2">
          {running ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Now (manual test, bypasses cron schedule)
        </Button>
        {runResult && <pre className="text-xs text-muted-foreground bg-background p-3 rounded overflow-x-auto">{runResult}</pre>}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-muted-foreground tracking-widest">RECENT BOT ACTIVITY</div>
        {log.length === 0 && <p className="text-sm text-muted-foreground">No bot runs yet.</p>}
        {log.map((entry) => (
          <div key={entry.id} className="p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">{entry.symbol}</span>
            <span className="text-muted-foreground">{entry.buyExchange} → {entry.sellExchange}</span>
            <span className={entry.status === 'executed' || entry.status === 'simulated' ? 'text-primary' : 'text-red-400'}>{entry.status}</span>
            <span className="text-muted-foreground">${Number(entry.netProfit).toFixed(2)}</span>
            <span className={entry.dryRun ? 'text-yellow-400' : 'text-red-400'}>{entry.dryRun ? 'DRY' : 'LIVE'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
