'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { nanoid } from 'nanoid'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { botConfig, botTradeLog } from '@/lib/db/schema'
import { runBotForUser } from '@/lib/trading/bot'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getBotConfig() {
  const userId = await getUserId()
  const rows = await db.select().from(botConfig).where(eq(botConfig.userId, userId)).limit(1)
  if (rows[0]) return rows[0]
  const created = await db.insert(botConfig).values({ id: nanoid(), userId }).returning()
  return created[0]
}

export async function updateBotConfig(input: {
  enabled: boolean
  dryRun: boolean
  symbols: string
  maxAmountPerTrade: number
  dailyLossCapUsd: number
  minNetProfitBps: number
  cooldownSeconds: number
}) {
  const userId = await getUserId()
  if (input.maxAmountPerTrade <= 0 || input.maxAmountPerTrade > 10) throw new Error('Max amount per trade must be between 0 and 10 (in base asset units)')
  if (input.dailyLossCapUsd <= 0) throw new Error('Daily loss cap must be positive')
  await db.update(botConfig).set({
    enabled: input.enabled, dryRun: input.dryRun, symbols: input.symbols,
    maxAmountPerTrade: String(input.maxAmountPerTrade), dailyLossCapUsd: String(input.dailyLossCapUsd),
    minNetProfitBps: String(input.minNetProfitBps), cooldownSeconds: String(input.cooldownSeconds),
    autoDisabledAt: null, autoDisabledReason: null, updatedAt: new Date(),
  }).where(eq(botConfig.userId, userId))
  revalidatePath('/dashboard')
}

export async function getBotTradeLog() {
  const userId = await getUserId()
  return db.select().from(botTradeLog).where(eq(botTradeLog.userId, userId)).orderBy(botTradeLog.createdAt).limit(50)
}

export async function runBotNow() {
  const userId = await getUserId()
  return runBotForUser(userId)
}
