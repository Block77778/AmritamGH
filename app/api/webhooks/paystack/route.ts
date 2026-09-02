import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { paymentTransactions, userBalance } from '@/lib/db/schema'
import { verifyPaystackSignature } from '@/lib/payments/paystack'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const reference = event.data.reference
  const txRows = await db.select().from(paymentTransactions).where(eq(paymentTransactions.externalReference, reference)).limit(1)
  const tx = txRows[0]
  if (!tx || tx.status === 'success') {
    return NextResponse.json({ received: true })
  }

  await db.update(paymentTransactions).set({ status: 'success', rawPayload: rawBody, completedAt: new Date() }).where(eq(paymentTransactions.id, tx.id))

  const existing = await db.select().from(userBalance).where(eq(userBalance.userId, tx.userId)).limit(1)
  if (existing[0]) {
    await db.update(userBalance).set({ balance: sql`${userBalance.balance} + ${tx.amount}`, updatedAt: new Date() }).where(eq(userBalance.userId, tx.userId))
  } else {
    await db.insert(userBalance).values({ id: nanoid(), userId: tx.userId, balance: tx.amount, currency: tx.currency })
  }

  return NextResponse.json({ received: true })
}
