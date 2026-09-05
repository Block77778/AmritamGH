import { and, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { userBalance } from '@/lib/db/schema'

export async function creditBalance(userId: string, currency: string, amount: string) {
  const existing = await db.select().from(userBalance)
    .where(and(eq(userBalance.userId, userId), eq(userBalance.currency, currency)))
    .limit(1)

  if (existing[0]) {
    await db.update(userBalance)
      .set({ balance: sql`${userBalance.balance} + ${amount}`, updatedAt: new Date() })
      .where(eq(userBalance.id, existing[0].id))
  } else {
    await db.insert(userBalance).values({ id: nanoid(), userId, balance: amount, currency })
  }
}
