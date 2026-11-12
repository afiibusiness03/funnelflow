import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { apiError, HttpError, readJson, uuid } from '@/lib/security/http'
import { rateLimit } from '@/lib/security/rate-limit'
export async function POST(request: Request) {
  try {
    const body = await readJson(request, z.object({ campaignId: uuid, orderId: z.string().trim().min(3).max(100) }))
    await rateLimit(request, 'order-verification', 10)
    const { data: campaign } = await createServiceClient().from('campaigns').select('id').eq('id', body.campaignId).eq('status','active').single()
    if (!campaign) throw new HttpError(404, 'Campaign not found')
    // A formatted order number is not proof of a purchase or buyer ownership.
    return NextResponse.json({ verified: false, manualReview: true, message: 'Submit your claim for seller review.' })
  } catch (error) { return apiError(error) }
}
