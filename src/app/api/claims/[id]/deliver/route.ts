import { z } from 'zod'
import { NextResponse } from 'next/server'
import { requireAccount } from '@/lib/security/access'
import { apiError, checkOrigin, HttpError, uuid, readJson } from '@/lib/security/http'
import { rateLimit } from '@/lib/security/rate-limit'
import { deliverReward } from '@/lib/resend/deliver-reward'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(request)
    const { profile } = await requireAccount({ write: true })
    const { id } = await params
    if (!uuid.safeParse(id).success) throw new HttpError(400, 'Invalid claim')
    await rateLimit(request, 'claim-delivery', 20)
    const db = createServiceClient()
    const { data: claim } = await db.from('funnel_submissions').select('claim_status').eq('id',id).eq('tenant_id',profile.tenant_id).single()
    if (!claim) throw new HttpError(404, 'Claim not found')
    if (!['approved','delivered'].includes(claim.claim_status)) throw new HttpError(409, 'Approve the claim first')
    const body = await readJson(request, z.object({ manualFulfilled: z.boolean().optional() }))
    // The authenticated seller is delivering an already-approved claim, including
    // legacy approvals that predate reward reservations.
    let delivered = await deliverReward(id,profile.tenant_id,true)
    if (!delivered && body.manualFulfilled) {
      const { error } = await db.rpc('finish_manual_reward', { p_submission: id, p_tenant: profile.tenant_id })
      if (error) throw new HttpError(409, 'Unable to confirm manual fulfillment')
      delivered = true
    }
    if (!delivered) throw new HttpError(409, 'Confirm that the reward has been fulfilled manually')
    return NextResponse.json({ success: true, delivered })
  } catch (error) { return apiError(error) }
}
