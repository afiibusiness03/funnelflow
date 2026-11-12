import { NextResponse } from 'next/server'
import { z } from 'zod'

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export const uuid = z.string().uuid()
export const email = z.string().trim().toLowerCase().email().max(254)
export const safeUrl = z.string().max(2048).refine(value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password }
  catch { return false }
}, 'Use a valid HTTPS URL')
export const optionalUrl = z.union([safeUrl, z.literal(''), z.null()]).optional()

export function safeRedirect(value: string | null, origin: string) {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return new URL('/dashboard', origin)
  const url = new URL(value, origin)
  return url.origin === origin ? url : new URL('/dashboard', origin)
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Invalid request origin')
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Invalid request origin')
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T, maxBytes = 16384): Promise<z.output<T>> {
  checkOrigin(request)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Use application/json')
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) throw new HttpError(413, 'Request too large')
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, 'Missing request body')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, 'Request too large') }
      chunks.push(value)
    }
    const parsed = schema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid input')
    return parsed.data
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'Invalid JSON')
  } finally { reader.releaseLock() }
}

export function apiError(error: unknown) {
  const status = error instanceof HttpError ? error.status : 500
  if (status >= 500) console.error('Request failed:', error instanceof Error ? error.name : 'Database error')
  return NextResponse.json({ error: error instanceof HttpError ? error.message : 'Unable to complete this request' }, { status })
}

export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
}
