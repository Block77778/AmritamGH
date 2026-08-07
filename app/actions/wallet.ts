'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectedWallets, transactions, priceSnapshots } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function addConnectedWallet(
  chainType: string,
  walletAddress: string,
  walletProvider: string
) {
  const userId = await getUserId()

  const wallet = await db
    .insert(connectedWallets)
    .values({
      id: nanoid(),
      userId,
      chainType,
      walletAddress,
      walletProvider,
    })
    .returning()

  revalidatePath('/dashboard')
  return wallet[0]
}

export async function getConnectedWallets() {
  const userId = await getUserId()

  return db
    .select()
    .from(connectedWallets)
    .where(and(eq(connectedWallets.userId, userId), eq(connectedWallets.isActive, true)))
    .orderBy(desc(connectedWallets.createdAt))
}

export async function removeWallet(walletId: string) {
  const userId = await getUserId()

  await db
    .update(connectedWallets)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(connectedWallets.id, walletId), eq(connectedWallets.userId, userId)))

  revalidatePath('/dashboard')
}

export async function recordTransaction(data: {
  walletId: string
  transactionType: string
  fromExchange?: string
  toExchange?: string
  tokenSymbol: string
  amount: string
  buyPrice?: string
  sellPrice?: string
  profit?: string
  gasFeesEstimate?: string
  transactionHash?: string
}) {
  const userId = await getUserId()

  // Verify wallet belongs to user
  const wallet = await db
    .select()
    .from(connectedWallets)
    .where(and(eq(connectedWallets.id, data.walletId), eq(connectedWallets.userId, userId)))

  if (!wallet.length) throw new Error('Wallet not found')

  const transaction = await db
    .insert(transactions)
    .values({
      id: nanoid(),
      userId,
      walletId: data.walletId,
      transactionType: data.transactionType,
      fromExchange: data.fromExchange,
      toExchange: data.toExchange,
      tokenSymbol: data.tokenSymbol,
      amount: data.amount,
      buyPrice: data.buyPrice,
      sellPrice: data.sellPrice,
      profit: data.profit,
      gasFeesEstimate: data.gasFeesEstimate,
      transactionHash: data.transactionHash,
      status: 'pending',
    })
    .returning()

  revalidatePath('/dashboard')
  return transaction[0]
}

export async function getTransactionHistory() {
  const userId = await getUserId()

  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
}

export async function savePriceSnapshot(
  tokenSymbol: string,
  exchange: string,
  price: string,
  liquidity?: string,
  volume24h?: string
) {
  const userId = await getUserId()

  await db.insert(priceSnapshots).values({
    id: nanoid(),
    userId,
    tokenSymbol,
    exchange,
    price,
    liquidity,
    volume24h,
  })

  revalidatePath('/dashboard')
}

export async function getPriceHistory(tokenSymbol: string) {
  const userId = await getUserId()

  return db
    .select()
    .from(priceSnapshots)
    .where(and(eq(priceSnapshots.userId, userId), eq(priceSnapshots.tokenSymbol, tokenSymbol)))
    .orderBy(desc(priceSnapshots.createdAt))
}
