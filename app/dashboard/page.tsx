import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userApproval } from '@/lib/db/schema'
import DashboardClient from '@/components/dashboard-client'

export const metadata = {
  title: 'Dashboard - Crypto Arbitrage',
  description: 'Monitor crypto prices and execute arbitrage trades',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pair?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  const approvalRows = await db.select().from(userApproval).where(eq(userApproval.userId, session.user.id)).limit(1)
  const approval = approvalRows[0]

  if (!approval || approval.status === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Account pending approval</h1>
          <p className="text-muted-foreground">
            Your account has been created but needs to be approved by an admin before you can access the dashboard. You'll be able to sign in normally once approved.
          </p>
        </div>
      </div>
    )
  }

  if (approval.status === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
          <p className="text-muted-foreground">Your account request was not approved.</p>
        </div>
      </div>
    )
  }

  const { pair } = await searchParams

  return (
    <div className="min-h-screen bg-background">
      <DashboardClient user={session.user} initialPair={pair} />
    </div>
  )
}
