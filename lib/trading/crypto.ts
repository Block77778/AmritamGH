import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const VERSION = 1

function getKey() {
  const secret = process.env.TRADING_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('TRADING_ENCRYPTION_KEY or BETTER_AUTH_SECRET must be configured')
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${VERSION}.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptSecret(payload: string) {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = payload.split('.')
  if (Number(version) !== VERSION || !ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('Unsupported encrypted credential format')
  }
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivEncoded, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
