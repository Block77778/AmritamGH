import crypto from 'crypto'

const NOWPAYMENTS_BASE = 'https://api.nowpayments.io/v1'

export async function createNowPaymentsInvoice(input: {
  amountMajorUnits: number
  currency: string
  orderId: string
  ipnCallbackUrl: string
  successUrl: string
  cancelUrl: string
}) {
  const response = await fetch(`${NOWPAYMENTS_BASE}/invoice`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: input.amountMajorUnits,
      price_currency: input.currency,
      order_id: input.orderId,
      ipn_callback_url: input.ipnCallbackUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }),
  })
  const data = await response.json()
  if (!data.invoice_url) throw new Error(data.message || 'Failed to create NOWPayments invoice')
  return { invoiceUrl: data.invoice_url as string, orderId: input.orderId }
}

function sortObjectKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys)
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((sorted: any, key) => {
      sorted[key] = sortObjectKeys(obj[key])
      return sorted
    }, {})
  }
  return obj
}

export function verifyNowPaymentsSignature(body: any, signature: string | null): boolean {
  if (!signature) return false
  const sorted = sortObjectKeys(body)
  const computed = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!).update(JSON.stringify(sorted)).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
}
