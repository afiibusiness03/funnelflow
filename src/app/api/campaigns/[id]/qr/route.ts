import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { requireAccount } from '@/lib/security/access'
import { apiError, HttpError, uuid } from '@/lib/security/http'
import { rateLimit } from '@/lib/security/rate-limit'
import { generateQRSvg, generateQRPng } from '@/lib/qr/generate'

// Bounded warm-instance cache: authorization still runs before every read.
const cache = new Map<string, { body: string | Uint8Array; etag: string; expires: number }>()
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, profile } = await requireAccount()
    const { id } = await params
    const query = new URL(request.url).searchParams
    const format = query.get('format') ?? 'svg', color = query.get('color') ?? '#000000'
    if (!uuid.safeParse(id).success || !['svg', 'png'].includes(format) || !/^#[0-9a-f]{6}$/i.test(color)) throw new HttpError(400, 'Invalid QR options')
    const { data: campaign } = await supabase.from('campaigns').select('qr_short_code').eq('id', id).eq('tenant_id', profile.tenant_id).single()
    if (!campaign) throw new HttpError(404, 'Campaign not found')
    const key = `${campaign.qr_short_code}/${format}/${color.toLowerCase()}`
    let entry = cache.get(key)
    if (!entry || entry.expires < Date.now()) {
      await rateLimit(request, 'qr-generate', 20)
      const options = { shortCode: campaign.qr_short_code, color }
      const body = format === 'png' ? new Uint8Array(await generateQRPng(options)) : await generateQRSvg(options)
      entry = { body, etag: `"${createHash('sha256').update(body).digest('hex')}"`, expires: Date.now() + 600000 }
      if (cache.size >= 100) cache.delete(cache.keys().next().value!)
      cache.set(key, entry)
    }
    const headers = { 'Content-Type': format === 'png' ? 'image/png' : 'image/svg+xml',
      'Content-Disposition': `attachment; filename="qr-${campaign.qr_short_code}.${format}"`,
      'Cache-Control': 'private, no-cache', ETag: entry.etag }
    if (request.headers.get('if-none-match') === entry.etag) return new NextResponse(null, { status: 304, headers })
    return new NextResponse(entry.body as BodyInit, { headers })
  } catch (error) { return apiError(error) }
}
