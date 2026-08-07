import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard-client'

export const metadata = {
  title: 'Dashboard - Crypto Arbitrage',
  description: 'Monitor crypto prices and execute arbitrage trades',
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardClient user={session.user} />
    </div>
  )
}
