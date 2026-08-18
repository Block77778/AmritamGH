import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { scheduledOrders, exchangeCredentials } from '@/lib/db/schema'
import { decryptSecret } from './crypto'
import { fetchQuote, placeMarketOrder } from './exchange-adapter'

async function getCredential(credentialId: string, userId: string) {
  const rows = await db.select().from(exchangeCredentials).where(and(eq(exchangeCredentials.id, credentialId), eq(exchangeCredentials.userId, userId), eq(exchangeCredentials.status, 'active'))).limit(1)
  const credential = rows[0]
  if (!credential) return null
  return { apiKey: decryptSecret(credential.apiKeyCiphertext), secret: decryptSecret(credential.apiSecretCiphertext), password: credential.passphraseCiphertext ? decryptSecret(credential.passphraseCiphertext) : undefined, exchangeId: credential.exchangeId }
}

async function executeScheduledOrder(order: typeof scheduledOrders.$inferSelect) {
  const credential = await getCredential(order.credentialId, order.userId)
  if (!credential) {
    await db.update(scheduledOrders).set({ status: 'failed', error: 'Exchange credential no longer available', executedAt: new Date() }).where(eq(scheduledOrders.id, order.id))
    return
  }
  try {
    const quote = await fetchQuote(order.exchangeId, order.symbol, credential)
    const result = await placeMarketOrder(order.exchangeId, credential, order.symbol, order.side as 'buy' | 'sell', Number(order.amount))
    await db.update(scheduledOrders).set({
      status: 'executed',
      exchangeOrderId: result.id,
      filledPrice: String(result.average ?? (order.side === 'buy' ? quote.ask : quote.bid)),
      executedAt: new Date(),
    }).where(eq(scheduledOrders.id, order.id))
  } catch (err) {
    await db.update(scheduledOrders).set({ status: 'failed', error: err instanceof Error ? err.message : 'Unknown error', executedAt: new Date() }).where(eq(scheduledOrders.id, order.id))
  }
}

export async function checkScheduledOrders() {
  const pending = await db.select().from(scheduledOrders).where(eq(scheduledOrders.status, 'pending'))
  const results: any[] = []

  for (const order of pending) {
    if (order.triggerType === 'time') {
      if (order.triggerAt && new Date() >= order.triggerAt) {
        await executeScheduledOrder(order)
        results.push({ id: order.id, triggered: 'time' })
      }
      continue
    }

    const credential = await getCredential(order.credentialId, order.userId)
    if (!credential) continue
    try {
      const quote = await fetchQuote(order.exchangeId, order.symbol, credential)
      const currentPrice = order.side === 'buy' ? quote.ask : quote.bid
      const target = Number(order.triggerPrice)
      const shouldTrigger = order.side === 'buy' ? currentPrice <= target : currentPrice >= target
      if (shouldTrigger) {
        await executeScheduledOrder(order)
        results.push({ id: order.id, triggered: 'price', currentPrice })
      }
    } catch {
      // Quote fetch failed this round — leave pending, will retry next cron run
    }
  }

  return results
}
