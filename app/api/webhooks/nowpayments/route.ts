import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { paymentTransactions, userBalance } from '@/lib/db/schema'
import { verifyNowPaymentsSignature } from '@/lib/payments/nowpayments'

export async function POST(request: Request) {
  const body = await request.json()
  const signature = request.headers.get('x-nowpayments-sig')

  if (!verifyNowPaymentsSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (body.payment_status !== 'finished') {
    return NextResponse.json({ received: true })
  }

  const orderId = body.order_id
  const txRows = await db.select().from(paymentTransactions).where(eq(paymentTransactions.externalReference, orderId)).limit(1)
  const tx = txRows[0]
  if (!tx || tx.status === 'success') {
    return NextResponse.json({ received: true })
  }

  await db.update(paymentTransactions).set({ status: 'success', rawPayload: JSON.stringify(body), completedAt: new Date() }).where(eq(paymentTransactions.id, tx.id))

  const existing = await db.select().from(userBalance).where(eq(userBalance.userId, tx.userId)).limit(1)
  if (existing[0]) {
    await db.update(userBalance).set({ balance: sql`${userBalance.balance} + ${tx.amount}`, updatedAt: new Date() }).where(eq(userBalance.userId, tx.userId))
  } else {
    await db.insert(userBalance).values({ id: nanoid(), userId: tx.userId, balance: tx.amount, currency: tx.currency })
  }

  return NextResponse.json({ received: true })
}
