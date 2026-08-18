'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { nanoid } from 'nanoid'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { scheduledOrders, exchangeCredentials } from '@/lib/db/schema'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function createScheduledOrder(input: {
  credentialId: string
  symbol: string
  side: 'buy' | 'sell'
  amount: number
  triggerType: 'price' | 'time'
  triggerPrice?: number
  triggerAt?: string
}) {
  const userId = await getUserId()
  if (input.amount <= 0) throw new Error('Amount must be positive')

  const credRows = await db.select().from(exchangeCredentials).where(and(eq(exchangeCredentials.id, input.credentialId), eq(exchangeCredentials.userId, userId), eq(exchangeCredentials.status, 'active'))).limit(1)
  const credential = credRows[0]
  if (!credential) throw new Error('Select a valid, active exchange credential')

  if (input.triggerType === 'price') {
    if (!input.triggerPrice || input.triggerPrice <= 0) throw new Error('Enter a valid trigger price')
  } else {
    if (!input.triggerAt) throw new Error('Select a trigger date/time')
    if (new Date(input.triggerAt) <= new Date()) throw new Error('Trigger time must be in the future')
  }

  const id = nanoid()
  await db.insert(scheduledOrders).values({
    id, userId, credentialId: input.credentialId, exchangeId: credential.exchangeId,
    symbol: input.symbol, side: input.side, amount: String(input.amount),
    triggerType: input.triggerType,
    triggerPrice: input.triggerType === 'price' ? String(input.triggerPrice) : null,
    triggerAt: input.triggerType === 'time' ? new Date(input.triggerAt!) : null,
  })
  return { id }
}

export async function listScheduledOrders() {
  const userId = await getUserId()
  return db.select().from(scheduledOrders).where(eq(scheduledOrders.userId, userId)).orderBy(scheduledOrders.createdAt)
}

export async function cancelScheduledOrder(id: string) {
  const userId = await getUserId()
  await db.update(scheduledOrders).set({ status: 'cancelled' }).where(and(eq(scheduledOrders.id, id), eq(scheduledOrders.userId, userId)))
}
