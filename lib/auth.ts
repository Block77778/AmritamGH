import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'
import { db } from '@/lib/db'
import { userApproval } from '@/lib/db/schema'
import { nanoid } from 'nanoid'
import { isAdminEmail } from '@/lib/admin'

async function sendResetPasswordEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[auth] RESEND_API_KEY is not set — password reset email was not sent')
    return
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'AmritamGH <onboarding@resend.dev>',
      to,
      subject: 'Reset your AmritamGH password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Reset your password</h2>
          <p>Someone requested a password reset for your AmritamGH account. If this wasn't you, you can safely ignore this email.</p>
          <p><a href="${resetUrl}" style="display: inline-block; background: #d4af37; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a></p>
          <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If the button doesn't work, copy this URL: ${resetUrl}</p>
        </div>
      `,
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    console.error('[auth] Resend API error:', response.status, body)
  }
}

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL ?? 'http://localhost:3000'),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url)
    },
    resetPasswordTokenExpiresIn: 60 * 60,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.insert(userApproval).values({
            id: nanoid(),
            userId: user.id,
            status: isAdminEmail(user.email) ? 'approved' : 'pending',
            reviewedBy: isAdminEmail(user.email) ? 'auto (admin email)' : null,
            reviewedAt: isAdminEmail(user.email) ? new Date() : null,
          })
        },
      },
    },
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1:3000',
    'https://*.v0.app',
    'https://*.v0.dev',
    'https://*.vercel.app',
    'https://*.vercel.run',
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})
