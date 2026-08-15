import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { botConfig, botTradeLog, exchangeCredentials } from '@/lib/db/schema'
import { findCrossExchangeOpportunities } from './opportunities'
import { executeOpportunityCore } from './execution'

const EXCHANGE_POOL = ['binance', 'coinbase', 'okx', 'bybit', 'kraken', 'kucoin', 'bitget', 'gate', 'htx', 'mexc']

async function getTodaysRealizedPnL(userId: string): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const rows = await db
    .select({ total: sql<string>`COALESCE(SUM(${botTradeLog.netProfit}), 0)` })
    .from(botTradeLog)
    .where(and(eq(botTradeLog.userId, userId), eq(botTradeLog.dryRun, false), eq(botTradeLog.strategy, 'arbitrage'), gte(botTradeLog.createdAt, startOfDay)))
  return Number(rows[0]?.total ?? 0)
}

async function isInCooldown(userId: string, symbol: string, cooldownSeconds: number): Promise<boolean> {
  const rows = await db.select().from(botTradeLog)
    .where(and(eq(botTradeLog.userId, userId), eq(botTradeLog.symbol, symbol)))
    .orderBy(desc(botTradeLog.createdAt)).limit(1)
  const last = rows[0]
  if (!last) return false
  return Date.now() - last.createdAt.getTime() < cooldownSeconds * 1000
}

// Starts a new session: bot picks a random duration between 30 and 60
// minutes. This is a bounded random choice, not a market-aware prediction —
// there's no signal in this codebase (volatility, volume trend, etc.) that
// would justify claiming it's "smart" about the choice.
export async function startBotSession(userId: string) {
  const durationMinutes = 30 + Math.floor(Math.random() * 31) // 30–60 inclusive
  await db.update(botConfig).set({
    enabled: true,
    sessionActive: true,
    sessionStartedAt: new Date(),
    sessionDurationMinutes: String(durationMinutes),
    tradesThisSession: 0,
    sessionStoppedReason: null,
    updatedAt: new Date(),
  }).where(eq(botConfig.userId, userId))
  return { durationMinutes }
}

export async function stopBotSession(userId: string, reason: string = 'manual_stop') {
  await db.update(botConfig).set({
    enabled: false,
    sessionActive: false,
    sessionStoppedReason: reason,
    updatedAt: new Date(),
  }).where(eq(botConfig.userId, userId))
}

export async function runBotForUser(userId: string) {
  const configRows = await db.select().from(botConfig).where(eq(botConfig.userId, userId)).limit(1)
  const config = configRows[0]
  if (!config || !config.enabled || !config.sessionActive || !config.sessionStartedAt) {
    return { skipped: 'no_active_session' }
  }

  const elapsedMinutes = (Date.now() - config.sessionStartedAt.getTime()) / 60_000
  if (elapsedMinutes >= Number(config.sessionDurationMinutes)) {
    await stopBotSession(userId, 'session_duration_elapsed')
    return { skipped: 'session_duration_elapsed' }
  }

  const tradesThisSession = Number(config.tradesThisSession)
  if (tradesThisSession >= Number(config.maxTradesPerSession)) {
    await stopBotSession(userId, 'max_trades_reached')
    return { skipped: 'max_trades_reached' }
  }

  if (!config.dryRun) {
    const pnlToday = await getTodaysRealizedPnL(userId)
    if (pnlToday <= -Number(config.dailyLossCapUsd)) {
      await stopBotSession(userId, 'daily_loss_cap_reached')
      await db.update(botConfig).set({
        autoDisabledAt: new Date(),
        autoDisabledReason: `Daily loss cap of $${config.dailyLossCapUsd} reached (realized: $${pnlToday.toFixed(2)})`,
      }).where(eq(botConfig.userId, userId))
      return { skipped: 'daily_loss_cap_reached', pnlToday }
    }
  }

  const credentialRows = await db.select().from(exchangeCredentials).where(and(eq(exchangeCredentials.userId, userId), eq(exchangeCredentials.status, 'active')))
  const scanExchangeIds = EXCHANGE_POOL.slice(0, Number(config.exchangeScanCount) || 5)
  const symbols = config.candidateSymbols.split(',').map((s) => s.trim()).filter(Boolean)

  let best: any = null
  let bestSymbol = ''
  for (const symbol of symbols) {
    if (await isInCooldown(userId, symbol, Number(config.cooldownSeconds))) continue
    const opportunities = await findCrossExchangeOpportunities({ symbol, exchangeIds: scanExchangeIds, amount: Number(config.maxAmountPerTrade) })
    const top = opportunities.filter((o) => o.netProfitBps >= Number(config.minNetProfitBps)).sort((a, b) => b.netProfitBps - a.netProfitBps)[0]
    if (top && (!best || top.netProfitBps > best.netProfitBps)) { best = top; bestSymbol = symbol }
  }

  if (!best) return { skipped: 'no_opportunity_across_candidates', minutesRemaining: Math.max(0, Number(config.sessionDurationMinutes) - elapsedMinutes) }

  const logId = nanoid()

  if (config.dryRun) {
    await db.insert(botTradeLog).values({
      id: logId, userId, symbol: bestSymbol, buyExchange: best.buy.exchangeId, sellExchange: best.sell.exchangeId,
      amount: String(config.maxAmountPerTrade), buyPrice: String(best.buy.ask), sellPrice: String(best.sell.bid),
      netProfit: String(best.netProfit), dryRun: true, status: 'simulated', strategy: 'arbitrage',
    })
    const newCount = tradesThisSession + 1
    await db.update(botConfig).set({ tradesThisSession: newCount, updatedAt: new Date() }).where(eq(botConfig.userId, userId))
    if (newCount >= Number(config.maxTradesPerSession)) await stopBotSession(userId, 'max_trades_reached')
    return { symbol: bestSymbol, status: 'simulated', netProfit: best.netProfit, tradesThisSession: newCount }
  }

  const buyCred = credentialRows.find((c) => c.exchangeId === best.buy.exchangeId)
  const sellCred = credentialRows.find((c) => c.exchangeId === best.sell.exchangeId)
  if (!buyCred || !sellCred) {
    return { symbol: bestSymbol, status: 'missing_credential', buyExchange: best.buy.exchangeId, sellExchange: best.sell.exchangeId }
  }

  try {
    const outcome = await executeOpportunityCore(userId, {
      opportunityId: `bot_${logId}`, buyCredentialId: buyCred.id, sellCredentialId: sellCred.id,
      symbol: bestSymbol, amount: Number(config.maxAmountPerTrade), buyPrice: best.buy.ask, sellPrice: best.sell.bid,
    })
    await db.insert(botTradeLog).values({
      id: logId, userId, symbol: bestSymbol, buyExchange: best.buy.exchangeId, sellExchange: best.sell.exchangeId,
      amount: String(config.maxAmountPerTrade), buyPrice: String(best.buy.ask), sellPrice: String(best.sell.bid),
      netProfit: String(best.netProfit), dryRun: false, status: 'executed', strategy: 'arbitrage',
    })
    const newCount = tradesThisSession + 1
    await db.update(botConfig).set({ tradesThisSession: newCount, updatedAt: new Date() }).where(eq(botConfig.userId, userId))
    if (newCount >= Number(config.maxTradesPerSession)) await stopBotSession(userId, 'max_trades_reached')
    return { symbol: bestSymbol, status: 'executed', tradesThisSession: newCount, ...outcome }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    await db.insert(botTradeLog).values({
      id: logId, userId, symbol: bestSymbol, buyExchange: best.buy.exchangeId, sellExchange: best.sell.exchangeId,
      amount: String(config.maxAmountPerTrade), buyPrice: String(best.buy.ask), sellPrice: String(best.sell.bid),
      netProfit: '0', dryRun: false, status: 'failed', error, strategy: 'arbitrage',
    })
    return { symbol: bestSymbol, status: 'failed', error }
  }
}

export async function runBotForAllEnabledUsers() {
  const enabledConfigs = await db.select().from(botConfig).where(and(eq(botConfig.enabled, true), eq(botConfig.sessionActive, true)))
  const outcomes = await Promise.allSettled(enabledConfigs.map((c) => runBotForUser(c.userId)))
  return outcomes.map((o, i) => ({ userId: enabledConfigs[i].userId, ...(o.status === 'fulfilled' ? o.value : { error: 'run failed' }) }))
}
