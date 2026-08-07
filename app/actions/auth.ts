'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signUpAction(
  name: string,
  email: string,
  password: string
) {
  try {
    await auth.api.signUpEmail({
      body: { email, password, name },
      headers: await headers(),
    })
  } catch (error) {
    console.error('[v0] Sign up error:', error)
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
  redirect('/dashboard')
}

export async function signInAction(email: string, password: string) {
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    })
  } catch (error) {
    console.error('[v0] Sign in error:', error)
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
  redirect('/dashboard')
}
