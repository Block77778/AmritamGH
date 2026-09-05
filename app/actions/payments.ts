'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { nanoid } from 'nanoid'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userBalance, paymentTransactions } from '@/lib/db/schema'
import { initializePaystackTransaction } from '@/lib/payments/paystack'
import { createNowPaymentsInvoice } from '@/lib/payments/nowpayments'

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

function getSiteUrl() {
  return process.env.BETTER_AUTH_URL || `https://${process.env.VERCEL_URL}`
}

export async function getBalances() {
  const user = await getUser()
  const rows = await db.select().from(userBalance).where(eq(userBalance.userId, user.id))
  const ghs = rows.find((r) => r.currency === 'GHS') ?? { balance: '0', currency: 'GHS' }
  const usd = rows.find((r) => r.currency === 'USD') ?? { balance: '0', currency: 'USD' }
  return { ghs, usd }
}

export async function getTransactionHistory() {
  const user = await getUser()
  return db.select().from(paymentTransactions).where(eq(paymentTransactions.userId, user.id)).orderBy(paymentTransactions.createdAt)
}

// Paystack — GHS (confirmed working on your account)
export async function depositWithPaystack(amountMajorUnits: number) {
  const user = await getUser()
  if (amountMajorUnits <= 0) throw new Error('Enter a valid amount')
  const currency = 'GHS'
  const reference = `paystack_${nanoid(16)}`

  await db.insert(paymentTransactions).values({
    id: nanoid(), userId: user.id, provider: 'paystack', externalReference: reference,
    amount: String(amountMajorUnits), currency, status: 'pending',
  })

  const { authorizationUrl } = await initializePaystackTransaction({
    email: user.email, amountMajorUnits, currency, reference,
    callbackUrl: `${getSiteUrl()}/dashboard?deposit=paystack`,
  })
  return { redirectUrl: authorizationUrl }
}

// NOWPayments — USD (GHS is not in NOWPayments' supported base-currency list,
// so this is intentionally a separate USD balance, not converted into GHS)
export async function depositWithNowPayments(amountMajorUnits: number) {
  const user = await getUser()
  if (amountMajorUnits <= 0) throw new Error('Enter a valid amount')
  const currency = 'USD'
  const orderId = `nowpayments_${nanoid(16)}`

  await db.insert(paymentTransactions).values({
    id: nanoid(), userId: user.id, provider: 'nowpayments', externalReference: orderId,
    amount: String(amountMajorUnits), currency, status: 'pending',
  })

  const { invoiceUrl } = await createNowPaymentsInvoice({
    amountMajorUnits, currency, orderId,
    ipnCallbackUrl: `${getSiteUrl()}/api/webhooks/nowpayments`,
    successUrl: `${getSiteUrl()}/dashboard?deposit=nowpayments`,
    cancelUrl: `${getSiteUrl()}/dashboard`,
  })
  return { redirectUrl: invoiceUrl }
}
