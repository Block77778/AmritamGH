import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { paymentTransactions } from '@/lib/db/schema'
import { verifyPaystackSignature } from '@/lib/payments/paystack'
import { creditBalance } from '@/lib/payments/balance'

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
  await creditBalance(tx.userId, tx.currency, tx.amount)

  return NextResponse.json({ received: true })
}
