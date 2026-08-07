'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { nanoid } from 'nanoid'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { arbitrageOpportunities, exchangeCredentials, executionOrders, tradingAuditLog } from '@/lib/db/schema'
import { decryptSecret } from '@/lib/trading/crypto'
import { findCrossExchangeOpportunities } from '@/lib/trading/opportunities'
import { cancelOrder, fetchOrder, fetchQuote, placeLimitOrder } from '@/lib/trading/exchange-adapter'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function scanOpportunities(input: { symbol: string; exchanges: string[]; amount: number }) {
  const userId = await getUserId()
  const opportunities = await findCrossExchangeOpportunities({
    symbol: input.symbol,
    exchangeIds: input.exchanges,
    amount: input.amount,
  })
  const saved = await Promise.all(opportunities.map(async (opportunity) => {
    const id = nanoid()
    await db.insert(arbitrageOpportunities).values({
      id, userId, symbol: opportunity.symbol, buyExchange: opportunity.buy.exchangeId, sellExchange: opportunity.sell.exchangeId,
      buyPrice: String(opportunity.buy.ask), sellPrice: String(opportunity.sell.bid), quantity: String(opportunity.amount),
      grossProfit: String(opportunity.grossProfit), estimatedFees: String(opportunity.estimatedFees), estimatedSlippage: String(opportunity.estimatedSlippage),
      netProfit: String(opportunity.netProfit), netProfitBps: String(opportunity.netProfitBps), observedAt: new Date(opportunity.observedAt), expiresAt: new Date(opportunity.expiresAt),
    })
    return { ...opportunity, id }
  }))
  return saved
}

async function getCredential(userId: string, id: string) {
  const rows = await db.select().from(exchangeCredentials).where(and(eq(exchangeCredentials.id, id), eq(exchangeCredentials.userId, userId), eq(exchangeCredentials.status, 'active'))).limit(1)
  const credential = rows[0]
  if (!credential) throw new Error('Active exchange credential not found')
  return { apiKey: decryptSecret(credential.apiKeyCiphertext), secret: decryptSecret(credential.apiSecretCiphertext), password: credential.passphraseCiphertext ? decryptSecret(credential.passphraseCiphertext) : undefined, exchangeId: credential.exchangeId }
}

export async function executeOpportunity(input: {
  opportunityId: string
  buyCredentialId: string
  sellCredentialId: string
  symbol: string
  amount: number
  buyPrice: number
  sellPrice: number
}) {
  const userId = await getUserId()
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 100_000) throw new Error('Trade amount must be positive and below the risk limit')
  if (input.buyPrice <= 0 || input.sellPrice <= input.buyPrice) throw new Error('Opportunity is no longer executable')

  const buy = await getCredential(userId, input.buyCredentialId)
  const sell = await getCredential(userId, input.sellCredentialId)
  if (buy.exchangeId === sell.exchangeId) throw new Error('Arbitrage legs must use different exchanges')

  const [liveBuy, liveSell] = await Promise.all([
    fetchQuote(buy.exchangeId, input.symbol, buy),
    fetchQuote(sell.exchangeId, input.symbol, sell),
  ])
  const liveGross = (liveSell.bid - liveBuy.ask) * input.amount
  const liveFees = (liveBuy.ask * input.amount * (liveBuy.takerFee ?? 0.001)) + (liveSell.bid * input.amount * (liveSell.takerFee ?? 0.001))
  const liveNetBps = (liveGross - liveFees) / (liveBuy.ask * input.amount) * 10_000
  if (liveSell.bid <= liveBuy.ask || liveNetBps < 10) throw new Error('Live spread is below the minimum executable profit threshold')
  if (input.buyPrice < liveBuy.ask * 0.995 || input.sellPrice > liveSell.bid * 1.005) throw new Error('Quoted prices moved beyond the allowed slippage')

  const clientRoot = `arb_${nanoid(16)}`

  const buyOrderId = nanoid(), sellOrderId = nanoid()
  await db.insert(executionOrders).values([
    { id: buyOrderId, userId, opportunityId: input.opportunityId, clientOrderId: `${clientRoot}_buy`, exchangeId: buy.exchangeId, symbol: input.symbol, side: 'buy', type: 'limit', amount: String(input.amount), price: String(input.buyPrice) },
    { id: sellOrderId, userId, opportunityId: input.opportunityId, clientOrderId: `${clientRoot}_sell`, exchangeId: sell.exchangeId, symbol: input.symbol, side: 'sell', type: 'limit', amount: String(input.amount), price: String(input.sellPrice) },
  ])

  try {
    const results = await Promise.allSettled([
      placeLimitOrder(buy.exchangeId, buy, input.symbol, 'buy', input.amount, liveBuy.ask, `${clientRoot}_buy`),
      placeLimitOrder(sell.exchangeId, sell, input.symbol, 'sell', input.amount, liveSell.bid, `${clientRoot}_sell`),
    ])
    const buyResult = results[0]
    const sellResult = results[1]
    if (buyResult.status === 'fulfilled') {
      await db.update(executionOrders).set({ status: buyResult.value.status ?? 'submitted', exchangeOrderId: buyResult.value.id, filled: String(buyResult.value.filled ?? 0), average: buyResult.value.average ? String(buyResult.value.average) : null, updatedAt: new Date() }).where(eq(executionOrders.id, buyOrderId))
    }
    if (sellResult.status === 'fulfilled') {
      await db.update(executionOrders).set({ status: sellResult.value.status ?? 'submitted', exchangeOrderId: sellResult.value.id, filled: String(sellResult.value.filled ?? 0), average: sellResult.value.average ? String(sellResult.value.average) : null, updatedAt: new Date() }).where(eq(executionOrders.id, sellOrderId))
    }
    if (buyResult.status === 'rejected' || sellResult.status === 'rejected') {
      const message = 'One arbitrage leg failed; the successful leg was submitted for cancellation.'
      if (buyResult.status === 'fulfilled' && buyResult.value.id) await cancelOrder(buy.exchangeId, buy, buyResult.value.id, input.symbol).catch(() => undefined)
      if (sellResult.status === 'fulfilled' && sellResult.value.id) await cancelOrder(sell.exchangeId, sell, sellResult.value.id, input.symbol).catch(() => undefined)
      await db.update(executionOrders).set({ status: 'recovery_required', error: message, updatedAt: new Date() }).where(eq(executionOrders.opportunityId, input.opportunityId))
      await db.insert(tradingAuditLog).values({ id: nanoid(), userId, event: 'arbitrage.recovery_required', resourceId: input.opportunityId, metadata: JSON.stringify({ buyRejected: buyResult.status === 'rejected', sellRejected: sellResult.status === 'rejected' }) })
      throw new Error(message)
    }
    await db.insert(tradingAuditLog).values({ id: nanoid(), userId, event: 'arbitrage.executed', resourceId: input.opportunityId, metadata: JSON.stringify({ buyOrderId: buyResult.value.id, sellOrderId: sellResult.value.id }) })
    return { buyOrderId: buyResult.value.id, sellOrderId: sellResult.value.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Order submission failed'
    if (!message.startsWith('One arbitrage leg failed')) {
      await db.update(executionOrders).set({ status: 'failed', error: message, updatedAt: new Date() }).where(and(eq(executionOrders.userId, userId), eq(executionOrders.opportunityId, input.opportunityId)))
    }
    throw new Error(message)
  }
}

export async function reconcileOrder(input: { credentialId: string; orderId: string; symbol: string; executionOrderId: string }) {
  const userId = await getUserId()
  const credential = await getCredential(userId, input.credentialId)
  const order = await fetchOrder(credential.exchangeId, credential, input.orderId, input.symbol)
  await db.update(executionOrders).set({ status: order.status ?? 'unknown', filled: String(order.filled ?? 0), average: order.average ? String(order.average) : null, updatedAt: new Date() }).where(and(eq(executionOrders.id, input.executionOrderId), eq(executionOrders.userId, userId)))
  return order
}
