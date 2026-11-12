import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { apiError, HttpError, readJson, uuid } from '@/lib/security/http'
import { verifyEventToken } from '@/lib/security/event-token'
import { rateLimit } from '@/lib/security/rate-limit'
const schema = z.object({ campaignId: uuid, eventToken: z.string().max(1024), eventType: z.enum(['qr_scan','review_shown','review_clicked','review_skipped','funnel_abandoned']) })
export async function POST(request: Request) {
  try {
    const body = await readJson(request, schema, 2048)
    const session = verifyEventToken(body.eventToken, body.campaignId)
    if (!session) throw new HttpError(403, 'Invalid event session')
    await rateLimit(request, 'funnel-event', 60)
    const db = createServiceClient()
    const { data: campaign } = await db.from('campaigns').select('tenant_id').eq('id', body.campaignId).eq('status', 'active').single()
    if (!campaign) throw new HttpError(404, 'Campaign not found')
    const { error } = await db.from('funnel_events').insert({ campaign_id: body.campaignId, tenant_id: campaign.tenant_id, event_type: body.eventType, metadata: { session } })
    if (error && error.code !== '23505') throw error
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error) }
}
