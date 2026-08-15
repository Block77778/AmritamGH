// Replace these with your real two admin email addresses before deploying.
// Anyone signing up with one of these exact emails is auto-approved and can
// approve/reject everyone else from /admin.
export const ADMIN_EMAILS = [
  'theblockchainsolutions@gmail.com',
  'admin2@example.com',
]

export function isAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
