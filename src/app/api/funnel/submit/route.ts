import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkFraud } from '@/lib/utils/fraud-detection'
import { resend, FROM } from '@/lib/resend/client'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined
    const userAgent = request.headers.get('user-agent') ?? undefined

    const body = await request.json()
    const {
      campaignId, customerEmail, customerName,
      orderId, orderVerified, platform, marketplace,
      rating, feedbackText,
      shippingAddress, promotionId,
    } = body

    if (!campaignId || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 1. Load campaign + tenant info
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*, promotion:promotions(*), tenant:tenants(id, name)')
      .eq('id', campaignId)
      .eq('status', 'active')
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // 2. Fraud detection
    const { isFlagged, reason } = await checkFraud({
      campaignId,
      customerEmail,
      orderId,
      ipAddress: ip,
    })

    // 3. Smart routing — should we ask for a review?
    const reviewRequested =
      campaign.smart_routing
        ? (rating ?? 0) >= (campaign.smart_routing_threshold ?? 4)
        : true

    // 4. Create submission
    const { data: submission, error: submitError } = await supabase
      .from('funnel_submissions')
      .insert({
        campaign_id:      campaignId,
        tenant_id:        (campaign.tenant as any).id,
        customer_email:   customerEmail,
        customer_name:    customerName   ?? null,
        order_id:         orderId        ?? null,
        order_verified:   orderVerified  ?? false,
        platform:         platform       ?? campaign.product?.platform ?? 'amazon',
        marketplace:      marketplace    ?? 'US',
        rating:           rating         ?? null,
        feedback_text:    feedbackText   ?? null,
        shipping_address: shippingAddress ?? null,
        promotion_id:     promotionId    ?? campaign.promotion_id ?? null,
        review_requested: reviewRequested,
        ip_address:       ip             ?? null,
        user_agent:       userAgent      ?? null,
        is_flagged:       isFlagged,
        flag_reason:      reason         ?? null,
        // If flagged → rejected. Otherwise always 'approved' (delivery attempt below).
        claim_status:     isFlagged ? 'rejected' : 'approved',
      })
      .select()
      .single()

    if (submitError || !submission) {
      console.error('Submission error:', submitError)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    // 5. Track funnel_complete event
    await supabase.from('funnel_events').insert({
      campaign_id:   campaignId,
      tenant_id:     (campaign.tenant as any).id,
      submission_id: submission.id,
      event_type:    'funnel_complete',
      step_number:   5,
    })

    // 6. Auto-deliver promotion if not flagged and promotion has deliverable content
    const promo = campaign.promotion
    const hasDeliverableContent =
      (promo?.type === 'coupon_code'      && promo?.coupon_code)  ||
      (promo?.type === 'digital_download' && promo?.download_url) ||
      (promo?.type === 'gift_card'        && promo?.gift_card_value)

    if (!isFlagged && promo?.auto_deliver && hasDeliverableContent) {
      await deliverPromotion({ submission, campaign, customerEmail, supabase })
    }

    return NextResponse.json({
      success: true,
      submissionId:    submission.id,
      reviewRequested,
      reviewUrl:       campaign.review_url ?? null,
      thankYouMessage: campaign.custom_thank_you_msg ?? null,
      promotionDelivered: !isFlagged && campaign.promotion?.auto_deliver && (!!campaign.promotion?.coupon_code || !!campaign.promotion?.download_url || !!campaign.promotion?.gift_card_value),
      coupon_code: (!isFlagged && promo?.type === 'coupon_code' && promo?.coupon_code)
        ? promo.coupon_code
        : null,
    })
  } catch (error) {
    console.error('Funnel submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function deliverPromotion({ submission, campaign, customerEmail, supabase }: any) {
  const promo = campaign.promotion
  if (!promo) return

  let subject = `Your reward from ${(campaign.tenant as any).name}`
  let html = promo.delivery_message ?? `<p>Thank you for your purchase!</p>`

  // Build promotion-specific email content
  if (promo.type === 'coupon_code' && promo.coupon_code) {
    const discountLabel = promo.discount_value
      ? promo.discount_type === 'fixed_value'
        ? `${promo.discount_currency ?? '$'}${promo.discount_value} Off`
        : `${promo.discount_value}% Off`
      : null

    subject = `Your discount code from ${(campaign.tenant as any).name}`
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b">Thank you for your purchase! 🎉</h2>
        ${promo.delivery_message ? `<p>${promo.delivery_message}</p>` : ''}
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
          ${discountLabel ? `<p style="font-size:28px;font-weight:900;color:#6366f1;margin:0 0 4px">${discountLabel}</p>` : ''}
          <p style="color:#64748b;font-size:12px;margin:0 0 8px">Use this code at checkout</p>
          <p style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#1e293b;margin:0;background:#fff;border:2px dashed #6366f1;border-radius:6px;padding:8px 16px;display:inline-block">${promo.coupon_code}</p>
        </div>
      </div>
    `
  } else if (promo.type === 'digital_download' && promo.download_url) {
    subject = `Your download from ${(campaign.tenant as any).name}`
    html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b">Your download is ready! 📥</h2>
        ${promo.delivery_message ? `<p>${promo.delivery_message}</p>` : ''}
        <a href="${promo.download_url}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">
          Download Now
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px">Link expires in ${promo.download_expires_hours ?? 48} hours.</p>
      </div>
    `
  }

  try {
    let resendId = null
    let status = 'skipped'

    if (customerEmail === 'afiibusiness03@gmail.com') {
      const { data: emailResult } = await resend.emails.send({
        from: FROM,
        to: customerEmail,
        subject,
        html,
      })
      resendId = emailResult?.id ?? null
      status = 'sent'
    }

    // Record email delivery
    await supabase.from('email_deliveries').insert({
      tenant_id:     (campaign.tenant as any).id,
      submission_id: submission.id,
      recipient_email: customerEmail,
      subject,
      template:      'promotion_delivery',
      resend_id:     resendId,
      status:        status,
      sent_at:       new Date().toISOString(),
    })

    // Mark claim as delivered
    await supabase
      .from('funnel_submissions')
      .update({
        claim_status:    'delivered',
        delivered_at:    new Date().toISOString(),
        delivery_method: 'email',
      })
      .eq('id', submission.id)
  } catch (err) {
    console.error('Email delivery error:', err)
  }
}
