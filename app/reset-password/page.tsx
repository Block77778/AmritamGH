'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('This reset link is invalid or missing. Request a new one.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) {
        setError(result.error.message || 'This link may have expired. Request a new one.')
      } else {
        setDone(true)
        setTimeout(() => router.push('/sign-in'), 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Set a new password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {done ? 'Password updated. Redirecting to sign in...' : 'Choose a new password for your account.'}
        </p>
      </div>

      {!done && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      )}

      <p className="text-sm text-muted-foreground text-center mt-6">
        <Link href="/sign-in" className="text-foreground font-medium underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  )
}
