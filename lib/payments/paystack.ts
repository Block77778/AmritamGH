import crypto from 'crypto'

const PAYSTACK_BASE = 'https://api.paystack.co'

export async function initializePaystackTransaction(input: {
  email: string
  amountMajorUnits: number
  currency: string
  reference: string
  callbackUrl: string
}) {
  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountMajorUnits * 100),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ['card', 'mobile_money', 'apple_pay'],
    }),
  })
  const data = await response.json()
  if (!data.status) throw new Error(data.message || 'Failed to initialize Paystack transaction')
  return { authorizationUrl: data.data.authorization_url as string, reference: data.data.reference as string }
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  })
  const data = await response.json()
  if (!data.status) throw new Error(data.message || 'Failed to verify transaction')
  return data.data
}

export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  const computed = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
}payments/paystack.ts
