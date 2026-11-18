import { NextResponse } from 'next/server'
import { requireAccount } from '@/lib/security/access'
import { apiError, checkOrigin, HttpError, uuid } from '@/lib/security/http'
import { rateLimit } from '@/lib/security/rate-limit'
import { deliverReward } from '@/lib/resend/deliver-reward'
import { createServiceClient } from '@/lib/supabase/server'
import { emailDeliveryPaused, isPausedEmailClaim } from '@/lib/resend/delivery-mode'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(request)
    const { profile } = await requireAccount({ write: true })
    const { id } = await params
    if (!uuid.safeParse(id).success) throw new HttpError(400, 'Invalid claim')
    await rateLimit(request, 'claim-delivery', 20)
    const db = createServiceClient()
    const { data: claim } = await db.from('funnel_submissions').select('claim_status,promotion:promotions(type),delivery:reward_deliveries(type:payload->>type)').eq('id',id).eq('tenant_id',profile.tenant_id).single()
    if (!claim) throw new HttpError(404, 'Claim not found')
    if (claim.claim_status === 'expired') throw new HttpError(409, 'Claim unavailable')
    if (isPausedEmailClaim(claim)) return NextResponse.json(emailDeliveryPaused)
    const delivered = await deliverReward(id,profile.tenant_id,true)
    return NextResponse.json({ success: true, delivered })
  } catch (error) { return apiError(error) }
}
