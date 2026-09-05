import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { paymentTransactions } from '@/lib/db/schema'
import { verifyNowPaymentsSignature } from '@/lib/payments/nowpayments'
import { creditBalance } from '@/lib/payments/balance'

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
  await creditBalance(tx.userId, tx.currency, tx.amount)

  return NextResponse.json({ received: true })
}
