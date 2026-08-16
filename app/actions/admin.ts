'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { nanoid } from 'nanoid'
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
  // LEFT JOIN so users with no approval row yet still show up (as 'pending')
  // instead of silently disappearing — this was the exact bug that got your
  // own account stuck.
  const rows = await db.select({
    userId: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    status: userApproval.status,
  }).from(user).leftJoin(userApproval, eq(userApproval.userId, user.id))

  return rows
    .map((r) => ({ ...r, status: r.status ?? 'pending' }))
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}

async function setApproval(userId: string, status: 'approved' | 'rejected') {
  const admin = await requireAdmin()
  // Upsert instead of a plain UPDATE — handles both "row already exists"
  // and "no row yet" cases in one call, so this never silently no-ops again.
  await db.insert(userApproval).values({
    id: nanoid(), userId, status, reviewedBy: admin.email, reviewedAt: new Date(),
  }).onConflictDoUpdate({
    target: userApproval.userId,
    set: { status, reviewedBy: admin.email, reviewedAt: new Date() },
  })
  revalidatePath('/admin')
}

export async function approveUser(userId: string) {
  await setApproval(userId, 'approved')
}

export async function rejectUser(userId: string) {
  await setApproval(userId, 'rejected')
}
