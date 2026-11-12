import 'server-only'
import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { createServiceClient } from '@/lib/supabase/server'
import { HttpError } from './http'

export function clientIp(request: Request) {
  const value = (request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '').split(',')[0].trim()
  return isIP(value) ? value : null
}

// Shared Postgres buckets survive cold starts and do not retain raw IP addresses.
export async function rateLimit(request: Request, scope: string, limit: number, windowSeconds = 60) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new HttpError(503, 'Temporarily unavailable')
  const key = createHmac('sha256', secret).update(`rate-limit:${scope}:${clientIp(request) ?? 'unknown'}`).digest('hex')
  const { data, error } = await createServiceClient().rpc('consume_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds })
  if (error) throw new HttpError(503, 'Temporarily unavailable')
  if (!data) throw new HttpError(429, 'Too many requests. Please try again later.')
}
