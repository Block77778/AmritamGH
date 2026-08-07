'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { exchangeCredentials, tradingAuditLog } from '@/lib/db/schema'
import { encryptSecret } from '@/lib/trading/crypto'
import { validateCredentials, getSupportedExchangeIds } from '@/lib/trading/exchange-adapter'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function listSupportedExchanges() {
  return getSupportedExchangeIds()
}

export async function saveExchangeCredential(input: {
  exchangeId: string
  label: string
  apiKey: string
  secret: string
  passphrase?: string
}) {
  const userId = await getUserId()
  const validation = await validateCredentials(input.exchangeId, {
    apiKey: input.apiKey,
    secret: input.secret,
    password: input.passphrase,
  })
  if (!validation.valid) throw new Error(validation.error)

  const id = nanoid()
  await db.insert(exchangeCredentials).values({
    id, userId, exchangeId: input.exchangeId, label: input.label,
    apiKeyCiphertext: encryptSecret(input.apiKey),
    apiSecretCiphertext: encryptSecret(input.secret),
    passphraseCiphertext: input.passphrase ? encryptSecret(input.passphrase) : null,
    permissions: 'trade:no-withdrawals', status: 'active',
  })
  await db.insert(tradingAuditLog).values({ id: nanoid(), userId, event: 'credential.created', resourceId: id, metadata: JSON.stringify({ exchangeId: input.exchangeId }) })
  revalidatePath('/dashboard')
  return { id, exchangeId: input.exchangeId, label: input.label, status: 'active' as const }
}

export async function listExchangeCredentials() {
  const userId = await getUserId()
  return db.select({ id: exchangeCredentials.id, exchangeId: exchangeCredentials.exchangeId, label: exchangeCredentials.label, status: exchangeCredentials.status }).from(exchangeCredentials).where(and(eq(exchangeCredentials.userId, userId), eq(exchangeCredentials.status, 'active')))
}

export async function revokeExchangeCredential(id: string) {
  const userId = await getUserId()
  await db.update(exchangeCredentials).set({ status: 'revoked', updatedAt: new Date() }).where(and(eq(exchangeCredentials.id, id), eq(exchangeCredentials.userId, userId)))
  await db.insert(tradingAuditLog).values({ id: nanoid(), userId, event: 'credential.revoked', resourceId: id, metadata: '{}' })
  revalidatePath('/dashboard')
}
