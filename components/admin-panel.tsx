'use client'

import { useState, useEffect } from 'react'
import { listPendingUsers, approveUser, rejectUser } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

export default function AdminPanel() {
  const [users, setUsers] = useState<Awaited<ReturnType<typeof listPendingUsers>>>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setUsers(await listPendingUsers())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleApprove = async (userId: string) => {
    await approveUser(userId)
    await load()
  }
  const handleReject = async (userId: string) => {
    await rejectUser(userId)
    await load()
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-foreground">User <span className="text-primary">Approvals</span></h1>
      <div className="space-y-3">
        {users.length === 0 && <p className="text-muted-foreground">No users yet.</p>}
        {users.map((u) => (
          <div key={u.userId} className="p-4 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-between">
            <div>
              <div className="font-semibold text-foreground">{u.name}</div>
              <div className="text-sm text-muted-foreground">{u.email}</div>
              <div className="text-xs text-muted-foreground">Signed up {new Date(u.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                u.status === 'approved' ? 'bg-primary/20 text-primary' :
                u.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {u.status.toUpperCase()}
              </span>
              <Button size="sm" onClick={() => handleApprove(u.userId)} disabled={u.status === 'approved'}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => handleReject(u.userId)} disabled={u.status === 'rejected'}>Reject</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
