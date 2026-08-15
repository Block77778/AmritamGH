import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '@/lib/admin'
import AdminPanel from '@/components/admin-panel'

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || !isAdminEmail(session.user.email)) {
    redirect('/dashboard')
  }
  return (
    <div className="min-h-screen bg-background p-8">
      <AdminPanel />
    </div>
  )
}
