'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { nanoid } from 'nanoid'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { arbitrageOpportunities, exchangeCredentials, executionOrders } from '@/lib/db/schema'
import { decryptSecret } from '@/lib/trading/crypto'
import { findCrossExchangeOpportunities } from '@/lib/trading/opportunities'
import { fetchOrder } from '@/lib/trading/exchange-adapter'
import { executeOpportunityCore } from '@/lib/trading/execution'

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
  return executeOpportunityCore(userId, input)
}

export async function reconcileOrder(input: { credentialId: string; orderId: string; symbol: string; executionOrderId: string }) {
  const userId = await getUserId()
  const rows = await db.select().from(exchangeCredentials).where(and(eq(exchangeCredentials.id, input.credentialId), eq(exchangeCredentials.userId, userId), eq(exchangeCredentials.status, 'active'))).limit(1)
  const credential = rows[0]
  if (!credential) throw new Error('Active exchange credential not found')
  const decrypted = { apiKey: decryptSecret(credential.apiKeyCiphertext), secret: decryptSecret(credential.apiSecretCiphertext), password: credential.passphraseCiphertext ? decryptSecret(credential.passphraseCiphertext) : undefined, exchangeId: credential.exchangeId }
  const order = await fetchOrder(decrypted.exchangeId, decrypted, input.orderId, input.symbol)
  await db.update(executionOrders).set({ status: order.status ?? 'unknown', filled: String(order.filled ?? 0), average: order.average ? String(order.average) : null, updatedAt: new Date() }).where(and(eq(executionOrders.id, input.executionOrderId), eq(executionOrders.userId, userId)))
  return order
}
