'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getBotConfig, updateBotConfig, getBotTradeLog, startSession, stopSession, runBotNow } from '@/app/actions/bot'
import { Bot, ShieldAlert, Loader, Play, Square, Clock } from 'lucide-react'

const TRADE_COUNT_OPTIONS = [3, 5, 7, 10]

export default function BotControlPanel() {
  const [config, setConfig] = useState<any>(null)
  const [log, setLog] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<string>('')
  const [now, setNow] = useState(Date.now())

  const load = async () => {
    const [cfg, logRows] = await Promise.all([getBotConfig(), getBotTradeLog()])
    setConfig(cfg)
    setLog(logRows)
  }

  useEffect(() => {
    load()
    const pollInterval = setInterval(load, 15000)
    return () => clearInterval(pollInterval)
  }, [])

  useEffect(() => {
    const tickInterval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickInterval)
  }, [])

  const save = async (patch: Partial<typeof config>) => {
    const next = { ...config, ...patch }
    setConfig(next)
    setSaving(true)
    try {
      await updateBotConfig({
        dryRun: next.dryRun, candidateSymbols: next.candidateSymbols,
        maxAmountPerTrade: Number(next.maxAmountPerTrade), dailyLossCapUsd: Number(next.dailyLossCapUsd),
        minNetProfitBps: Number(next.minNetProfitBps), cooldownSeconds: Number(next.cooldownSeconds),
        exchangeScanCount: Number(next.exchangeScanCount), maxTradesPerSession: Number(next.maxTradesPerSession),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleStart = async () => {
    setStarting(true)
    try {
      await startSession()
      await load()
    } finally {
      setStarting(false)
    }
  }

  const handleStop = async () => {
    await stopSession()
    await load()
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

  const sessionActive = config.sessionActive
  const elapsedMs = sessionActive && config.sessionStartedAt ? now - new Date(config.sessionStartedAt).getTime() : 0
  const durationMs = Number(config.sessionDurationMinutes) * 60_000
  const remainingMs = Math.max(0, durationMs - elapsedMs)
  const remainingMin = Math.floor(remainingMs / 60_000)
  const remainingSec = Math.floor((remainingMs % 60_000) / 1000)
  const tradesRemaining = Math.max(0, Number(config.maxTradesPerSession) - Number(config.tradesThisSession))

  return (
    <div className="space-y-6">
      {!config.dryRun && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">
            <span className="font-semibold">Live mode is ON.</span> Starting a session places real orders with real funds until it hits its time or trade limit.
          </div>
        </div>
      )}

      {config.autoDisabledReason && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-200">
          Bot was auto-disabled: {config.autoDisabledReason}
        </div>
      )}

      {/* Session control */}
      <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Trading Session</span>
        </div>

        {sessionActive ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-background border border-primary/30 text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-primary">{remainingMin}:{remainingSec.toString().padStart(2, '0')}</div>
                <div className="text-[10px] text-muted-foreground tracking-widest">TIME REMAINING</div>
              </div>
              <div className="p-4 rounded-lg bg-background border border-primary/30 text-center">
                <div className="text-2xl font-bold text-primary">{tradesRemaining}</div>
                <div className="text-[10px] text-muted-foreground tracking-widest">TRADES REMAINING (of {config.maxTradesPerSession})</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Session length was randomly set to {config.sessionDurationMinutes} min when started. Stops automatically at whichever limit hits first.
            </p>
            <Button onClick={handleStop} variant="outline" className="w-full flex items-center gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10">
              <Square className="w-4 h-4" />
              Stop Session Now
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {config.sessionStoppedReason && (
              <p className="text-xs text-muted-foreground">
                Last session ended: <span className="text-foreground">{config.sessionStoppedReason.replace(/_/g, ' ')}</span>
              </p>
            )}
            <Button onClick={handleStart} disabled={starting} className="w-full flex items-center gap-2">
              {starting ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Session
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Bot will pick a random 30–60 min session length and stop after {config.maxTradesPerSession} trades or when time runs out — whichever comes first.
            </p>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="p-6 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] space-y-5">
        <div className="flex gap-2">
          <button
            onClick={() => save({ dryRun: true })}
            disabled={sessionActive}
            className={`flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${config.dryRun ? 'bg-primary text-primary-foreground' : 'bg-[#2a2a2a] text-muted-foreground'}`}
          >
            Dry Run (simulated)
          </button>
          <button
            onClick={() => save({ dryRun: false })}
            disabled={sessionActive}
            className={`flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${!config.dryRun ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-muted-foreground'}`}
          >
            Live (real money)
          </button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-2">How many times should the bot trade this session?</label>
          <div className="grid grid-cols-4 gap-2">
            {TRADE_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => save({ maxTradesPerSession: n })}
                disabled={sessionActive}
                className={`py-2 rounded-lg text-sm font-bold disabled:opacity-50 ${
                  Number(config.maxTradesPerSession) === n ? 'bg-primary text-primary-foreground' : 'bg-[#2a2a2a] text-muted-foreground hover:bg-[#333]'
                }`}
              >
                {n}×
              </button>
            ))}
          </div>
          {!TRADE_COUNT_OPTIONS.includes(Number(config.maxTradesPerSession)) && (
            <p className="text-xs text-muted-foreground mt-1">
              Currently set to a custom value ({config.maxTradesPerSession}). Pick one of the options above to switch to a preset.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Candidate symbols (comma-separated, bot picks the best one each run)</label>
            <textarea value={config.candidateSymbols} onChange={(e) => setConfig({ ...config, candidateSymbols: e.target.value })} onBlur={() => save({})}
              rows={2} className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
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
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Cooldown per symbol (seconds)</label>
            <input type="number" value={config.cooldownSeconds} onChange={(e) => setConfig({ ...config, cooldownSeconds: e.target.value })} onBlur={() => save({})}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Exchanges to scan (top N)</label>
            <input type="number" value={config.exchangeScanCount} onChange={(e) => setConfig({ ...config, exchangeScanCount: e.target.value })} onBlur={() => save({})}
              className="w-full p-2 rounded bg-background border border-[#2a2a2a] text-sm text-foreground" />
          </div>
        </div>

        {saving && <div className="text-xs text-muted-foreground">Saving...</div>}

        <Button onClick={runNow} disabled={running} variant="outline" className="w-full flex items-center gap-2">
          {running ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run One Tick Now (manual test, doesn't need an active session)
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
