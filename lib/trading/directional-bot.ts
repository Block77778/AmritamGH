import { and, eq, gte, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { directionalBotConfig, botPositions, botTradeLog, exchangeCredentials } from '@/lib/db/schema'
import { decryptSecret } from './crypto'
import { fetchQuote, placeLimitOrder } from './exchange-adapter'
import { getOHLCV } from './market-data'
import { computeCrossoverSignal } from './strategy'
import { isWithinWindow } from './windows'

async function getCredential(userId: string, exchangeId: string) {
  const rows = await db.select().from(exchangeCredentials).where(and(eq(exchangeCredentials.userId, userId), eq(exchangeCredentials.exchangeId, exchangeId), eq(exchangeCredentials.status, 'active'))).limit(1)
  const credential = rows[0]
  if (!credential) return null
  return { apiKey: decryptSecret(credential.apiKeyCiphertext), secret: decryptSecret(credential.apiSecretCiphertext), password: credential.passphraseCiphertext ? decryptSecret(credential.passphraseCiphertext) : undefined, exchangeId: credential.exchangeId }
}

async function getTodaysRealizedPnL(userId: string): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const rows = await db.select({ total: sql<string>`COALESCE(SUM(${botPositions.realizedPnl}), 0)` })
    .from(botPositions)
    .where(and(eq(botPositions.userId, userId), eq(botPositions.dryRun, false), gte(botPositions.closedAt, startOfDay)))
  return Number(rows[0]?.total ?? 0)
}

export async function runDirectionalBotForUser(userId: string) {
  const rows = await db.select().from(directionalBotConfig).where(eq(directionalBotConfig.userId, userId)).limit(1)
  const config = rows[0]
  if (!config || !config.enabled) return { skipped: 'disabled' }

  if (!isWithinWindow(config.windowStartTime, Number(config.windowDurationMinutes))) {
    return { skipped: 'outside_trading_window' }
  }

  if (!config.dryRun) {
    const pnlToday = await getTodaysRealizedPnL(userId)
    if (pnlToday <= -Number(config.dailyLossCapUsd)) {
      await db.update(directionalBotConfig).set({
        enabled: false, autoDisabledAt: new Date(),
        autoDisabledReason: `Daily loss cap of $${config.dailyLossCapUsd} reached (realized: $${pnlToday.toFixed(2)})`,
        updatedAt: new Date(),
      }).where(eq(directionalBotConfig.userId, userId))
      return { skipped: 'daily_loss_cap_reached', pnlToday }
    }
  }

  const credential = config.dryRun ? null : await getCredential(userId, config.exchangeId)
  if (!config.dryRun && !credential) return { skipped: 'missing_credential' }

  const symbols = config.symbols.split(',').map((s) => s.trim()).filter(Boolean)
  const results: any[] = []

  for (const symbol of symbols) {
    const openPositionRows = await db.select().from(botPositions).where(and(eq(botPositions.userId, userId), eq(botPositions.symbol, symbol), eq(botPositions.status, 'open'))).limit(1)
    const openPosition = openPositionRows[0]

    const quote = credential ? await fetchQuote(config.exchangeId, symbol, credential) : await fetchQuote(config.exchangeId, symbol)
    const currentPrice = (quote.bid + quote.ask) / 2

    if (openPosition) {
      let exitReason: string | null = null
      if (currentPrice <= Number(openPosition.stopLossPrice)) exitReason = 'stop_loss'
      else if (currentPrice >= Number(openPosition.takeProfitPrice)) exitReason = 'take_profit'
      else {
        const candles = await getOHLCV(config.exchangeId, symbol, config.timeframe, Math.max(Number(config.slowMaPeriod) + 5, 30))
        const signal = computeCrossoverSignal(candles.map((c) => c.close), Number(config.fastMaPeriod), Number(config.slowMaPeriod))
        if (signal === 'sell') exitReason = 'signal_reversal'
      }

      if (exitReason) {
        const realizedPnl = (currentPrice - Number(openPosition.entryPrice)) * Number(openPosition.amount)
        if (!config.dryRun && credential) {
          await placeLimitOrder(config.exchangeId, credential, symbol, 'sell', Number(openPosition.amount), quote.bid, `dirbot_${openPosition.id}_close`)
        }
        await db.update(botPositions).set({ status: 'closed', exitPrice: String(currentPrice), exitReason, realizedPnl: String(realizedPnl), closedAt: new Date() }).where(eq(botPositions.id, openPosition.id))
        await db.insert(botTradeLog).values({
          id: nanoid(), userId, symbol, buyExchange: config.exchangeId, sellExchange: config.exchangeId,
          amount: openPosition.amount, buyPrice: openPosition.entryPrice, sellPrice: String(currentPrice),
          netProfit: String(realizedPnl), dryRun: config.dryRun, status: config.dryRun ? 'simulated' : 'executed', strategy: 'directional',
        })
        results.push({ symbol, status: 'position_closed', exitReason, realizedPnl })
      } else {
        results.push({ symbol, status: 'position_held' })
      }
      continue
    }

    const candles = await getOHLCV(config.exchangeId, symbol, config.timeframe, Math.max(Number(config.slowMaPeriod) + 5, 30))
    const signal = computeCrossoverSignal(candles.map((c) => c.close), Number(config.fastMaPeriod), Number(config.slowMaPeriod))
    if (signal !== 'buy') { results.push({ symbol, status: 'no_signal' }); continue }

    const amount = Number(config.maxPositionUsd) / currentPrice
    const stopLossPrice = currentPrice * (1 - Number(config.stopLossPercent) / 100)
    const takeProfitPrice = currentPrice * (1 + Number(config.takeProfitPercent) / 100)

    if (!config.dryRun && credential) {
      await placeLimitOrder(config.exchangeId, credential, symbol, 'buy', amount, quote.ask, `dirbot_${nanoid(8)}_open`)
    }
    await db.insert(botPositions).values({
      id: nanoid(), userId, exchangeId: config.exchangeId, symbol, amount: String(amount), entryPrice: String(currentPrice),
      stopLossPrice: String(stopLossPrice), takeProfitPrice: String(takeProfitPrice), dryRun: config.dryRun,
    })
    results.push({ symbol, status: 'position_opened', entryPrice: currentPrice })
  }

  return { results }
}

export async function runDirectionalBotForAllEnabledUsers() {
  const enabledConfigs = await db.select().from(directionalBotConfig).where(eq(directionalBotConfig.enabled, true))
  const outcomes = await Promise.allSettled(enabledConfigs.map((c) => runDirectionalBotForUser(c.userId)))
  return outcomes.map((o, i) => ({ userId: enabledConfigs[i].userId, ...(o.status === 'fulfilled' ? o.value : { error: 'run failed' }) }))
}
