import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { apiError, email, HttpError, readJson, uuid } from '@/lib/security/http'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { isDisposableEmail } from '@/lib/utils/fraud-detection'
import { deliverReward } from '@/lib/resend/deliver-reward'
import { hasAccess } from '@/lib/security/access'
import { rewardEmailEnabled } from '@/lib/resend/delivery-mode'
const schema = z.object({
  campaignId: uuid, customerEmail: email, customerName: z.string().trim().max(200).optional(),
  orderId: z.string().trim().max(100).optional(), rating: z.number().int().min(1).max(5),
  feedbackText: z.string().trim().min(10).max(4000), selectedProductIds: z.array(uuid).min(1, 'Please select at least one product').max(50),
  shippingAddress: z.object({ line1:z.string().max(200),line2:z.string().max(200).optional(),city:z.string().max(100),state:z.string().max(100).optional(),zip:z.string().max(32),country:z.string().max(64) }).optional(),
})
export async function POST(request: Request) {
  try {
    const body = await readJson(request, schema)
    await rateLimit(request, 'funnel-submit', 5, 3600)
    if (isDisposableEmail(body.customerEmail)) throw new HttpError(400, 'Please use a permanent email address')
    const db = createServiceClient()
    const { data: campaign, error } = await db.from('campaigns').select('id,tenant_id,promotion_id,require_order_verify,smart_routing,smart_routing_threshold,custom_thank_you_msg,review_url,tenant:tenants(plan_status,trial_ends_at),promotion:promotions(id,type,auto_deliver,is_active,tenant_id,requires_address)').eq('id',body.campaignId).eq('status','active').single()
    if (error || !campaign) throw new HttpError(404,'Campaign not found')
    const tenant = campaign.tenant as any
    if (!tenant || !hasAccess(tenant)) throw new HttpError(404,'Campaign not found')
    if (campaign.require_order_verify && !body.orderId) throw new HttpError(400,'Please provide your order number')
    const reviewRequested = !campaign.smart_routing || body.rating >= campaign.smart_routing_threshold
    const promo = campaign.promotion as any
    const hasReward = promo?.is_active && promo.tenant_id === campaign.tenant_id
    const automatic = hasReward && promo.auto_deliver && ['coupon_code', 'digital_download'].includes(promo.type)
    const emailPaused = automatic && !rewardEmailEnabled()
    if (promo?.is_active && promo.requires_address && (!body.shippingAddress || ['line1', 'city', 'zip', 'country'].some(key => !body.shippingAddress?.[key as keyof typeof body.shippingAddress]?.trim()))) throw new HttpError(400, 'Please provide the shipping address')
    const { data: submission, error: insertError } = await db.from('funnel_submissions').insert({
      campaign_id:campaign.id,tenant_id:campaign.tenant_id,customer_email:body.customerEmail,customer_name:body.customerName || null,
      order_id:body.orderId || null,order_verified:false,rating:body.rating,feedback_text:body.feedbackText,
      selected_product_ids:[...new Set(body.selectedProductIds)],shipping_address:body.shippingAddress ?? null,
      promotion_id:promo?.is_active && promo.tenant_id===campaign.tenant_id ? campaign.promotion_id : null,
      review_requested:reviewRequested,claim_status:emailPaused ? 'approved' : 'pending',is_flagged:false,ip_address:clientIp(request),
      user_agent:request.headers.get('user-agent')?.slice(0,512) ?? null,
    }).select('id').single()
    if (insertError?.code === '23505') throw new HttpError(409,'A claim for this email or order already exists')
    if (insertError?.code === '23514') throw new HttpError(400,'Invalid campaign or product selection')
    if (insertError || !submission) throw insertError ?? new Error('Submission failed')
    // Essential completion event is inserted by a DB trigger in this same transaction.
    let sent = false
    if (automatic && !emailPaused) {
      try { sent = await deliverReward(submission.id,campaign.tenant_id,false) }
      catch { /* Saved for retry. Never claim that an unsuccessful delivery succeeded. */ }
    }
    const deliveryStatus = sent ? 'sent' : emailPaused ? 'paused' : automatic ? 'failed' : hasReward ? 'manual' : 'none'
    return NextResponse.json({ success:true,submissionId:submission.id,reviewRequested,reviewUrl:campaign.review_url,
      thankYouMessage:campaign.custom_thank_you_msg,promotionDelivered:sent,deliveryStatus,manualReview:deliveryStatus==='manual',coupon_code:null })
  } catch (error) { return apiError(error) }
}
