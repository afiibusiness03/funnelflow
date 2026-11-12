import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
function signature(payload: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing server signing key')
  return createHmac('sha256', key).update(`funnel-event:${payload}`).digest('base64url')
}
export function createEventToken(campaignId: string) {
  const payload = Buffer.from(JSON.stringify({ campaignId, session: randomUUID(), exp: Date.now() + 15 * 60000 })).toString('base64url')
  return `${payload}.${signature(payload)}`
}
export function verifyEventToken(token: string, campaignId: string): string | null {
  try {
    if (token.length > 1024) return null
    const [payload, supplied, extra] = token.split('.')
    if (!payload || !supplied || extra) return null
    const expected = signature(payload)
    if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return data.campaignId === campaignId && typeof data.session === 'string' && data.exp > Date.now() ? data.session : null
  } catch { return null }
}
