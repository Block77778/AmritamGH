'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, userApproval } from '@/lib/db/schema'
import { isAdminEmail } from '@/lib/admin'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || !isAdminEmail(session.user.email)) throw new Error('Unauthorized')
  return session.user
}

export async function listPendingUsers() {
  await requireAdmin()
  const rows = await db.select({
    userId: userApproval.userId,
    status: userApproval.status,
    createdAt: userApproval.createdAt,
    name: user.name,
    email: user.email,
  }).from(userApproval).innerJoin(user, eq(userApproval.userId, user.id))
  return rows.sort((a, b) => (a.status === 'pending' ? -1 : 1))
}

export async function approveUser(userId: string) {
  const admin = await requireAdmin()
  await db.update(userApproval).set({ status: 'approved', reviewedBy: admin.email, reviewedAt: new Date() }).where(eq(userApproval.userId, userId))
  revalidatePath('/admin')
}

export async function rejectUser(userId: string) {
  const admin = await requireAdmin()
  await db.update(userApproval).set({ status: 'rejected', reviewedBy: admin.email, reviewedAt: new Date() }).where(eq(userApproval.userId, userId))
  revalidatePath('/admin')
}
