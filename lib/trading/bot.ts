import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { botConfig, botTradeLog, exchangeCredentials } from '@/lib/db/schema'
import { findCrossExchangeOpportunities } from './opportunities'
import { executeOpportunityCore } from './execution'

async function getTodaysRealizedPnL(userId: string): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const rows = await db
    .select({ total: sql<string>`COALESCE(SUM(${botTradeLog.netProfit}), 0)` })
    .from(botTradeLog)
    .where(and(eq(botTradeLog.userId, userId), eq(botTradeLog.dryRun, false), gte(botTradeLog.createdAt, startOfDay)))
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

export async function runBotForUser(userId: string) {
  const configRows = await db.select().from(botConfig).where(eq(botConfig.userId, userId)).limit(1)
  const config = configRows[0]
  if (!config || !config.enabled) return { skipped: 'disabled' }

  // Kill switch — checked every run, before anything else
  if (!config.dryRun) {
    const pnlToday = await getTodaysRealizedPnL(userId)
    if (pnlToday <= -Number(config.dailyLossCapUsd)) {
      await db.update(botConfig).set({
        enabled: false,
        autoDisabledAt: new Date(),
        autoDisabledReason: `Daily loss cap of $${config.dailyLossCapUsd} reached (realized: $${pnlToday.toFixed(2)})`,
        updatedAt: new Date(),
      }).where(eq(botConfig.userId, userId))
      return { skipped: 'daily_loss_cap_reached', pnlToday }
    }
  }

  const credentialRows = await db.select().from(exchangeCredentials).where(and(eq(exchangeCredentials.userId, userId), eq(exchangeCredentials.status, 'active')))
  if (credentialRows.length < 2) return { skipped: 'insufficient_credentials' }
  const exchangeIds = credentialRows.map((c) => c.exchangeId)

  const symbols = config.symbols.split(',').map((s) => s.trim()).filter(Boolean)
  const results: any[] = []

  for (const symbol of symbols) {
    if (await isInCooldown(userId, symbol, Number(config.cooldownSeconds))) {
      results.push({ symbol, status: 'skipped_cooldown' })
      continue
    }

    const opportunities = await findCrossExchangeOpportunities({ symbol, exchangeIds, amount: Number(config.maxAmountPerTrade) })
    const best = opportunities.filter((o) => o.netProfitBps >= Number(config.minNetProfitBps)).sort((a, b) => b.netProfitBps - a.netProfitBps)[0]
    if (!best) { results.push({ symbol, status: 'no_opportunity' }); continue }

    const logId = nanoid()

    if (config.dryRun) {
      await db.insert(botTradeLog).values({
        id: logId, userId, symbol, buyExchange: best.buy.exchangeId, sellExchange: best.sell.exchangeId,
        amount: String(config.maxAmountPerTrade), buyPrice: String(best.buy.ask), sellPrice: String(best.sell.bid),
        netProfit: String(best.netProfit), dryRun: true, status: 'simulated',
      })
      results.push({ symbol, status: 'simulated', netProfit: best.netProfit })
      continue
    }

    const buyCred = credentialRows.find((c) => c.exchangeId === best.buy.exchangeId)
    const sellCred = credentialRows.find((c) => c.exchangeId === best.sell.exchangeId)
    if (!buyCred || !sellCred) { results.push({ symbol, status: 'missing_credential' }); continue }

    try {
      const outcome = await executeOpportunityCore(userId, {
        opportunityId: `bot_${logId}`, buyCredentialId: buyCred.id, sellCredentialId: sellCred.id,
        symbol, amount: Number(config.maxAmountPerTrade), buyPrice: best.buy.ask, sellPrice: best.sell.bid,
      })
      await db.insert(botTradeLog).values({
        id: logId, userId, symbol, buyExchange: best.buy.exchangeId, sellExchange: best.sell.exchangeId,
        amount: String(config.maxAmountPerTrade), buyPrice: String(best.buy.ask), sellPrice: String(best.sell.bid),
        netProfit: String(best.netProfit), dryRun: false, status: 'executed',
      })
      results.push({ symbol, status: 'executed', ...outcome })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      await db.insert(botTradeLog).values({
        id: logId, userId, symbol, buyExchange: best.buy.exchangeId, sellExchange: best.sell.exchangeId,
        amount: String(config.maxAmountPerTrade), buyPrice: String(best.buy.ask), sellPrice: String(best.sell.bid),
        netProfit: '0', dryRun: false, status: 'failed', error,
      })
      results.push({ symbol, status: 'failed', error })
    }
  }

  return { results }
}

export async function runBotForAllEnabledUsers() {
  const enabledConfigs = await db.select().from(botConfig).where(eq(botConfig.enabled, true))
  const outcomes = await Promise.allSettled(enabledConfigs.map((c) => runBotForUser(c.userId)))
  return outcomes.map((o, i) => ({ userId: enabledConfigs[i].userId, ...(o.status === 'fulfilled' ? o.value : { error: 'run failed' }) }))
}
