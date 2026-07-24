import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend, FROM } from '@/lib/resend/client'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const service = createServiceClient()

  // Load submission with promotion + tenant
  const { data: submission } = await service
    .from('funnel_submissions')
    .select('*, promotion:promotions(*), campaign:campaigns(*, tenant:tenants(name))')
    .eq('id', params.id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.tenant_id !== userData.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (submission.claim_status === 'delivered') {
    return NextResponse.json({ error: 'Already delivered' }, { status: 400 })
  }

  // Mark approved first
  await service
    .from('funnel_submissions')
    .update({ claim_status: 'approved', claimed_at: new Date().toISOString() })
    .eq('id', params.id)

  // Deliver via email
  const promo = submission.promotion as any
  const tenantName = (submission.campaign as any)?.tenant?.name ?? 'the seller'
  let delivered = false

  if (promo && submission.customer_email) {
    try {
      let subject = `Your reward from ${tenantName}`
      let html = `<p>${promo.delivery_message ?? 'Thank you for your purchase!'}</p>`

      if (promo.type === 'coupon_code' && promo.coupon_code) {
        const discountLabel = promo.discount_value
          ? promo.discount_type === 'fixed_value'
            ? `${promo.discount_currency ?? '$'}${promo.discount_value} Off`
            : `${promo.discount_value}% Off`
          : null

        subject = `Your discount code from ${tenantName}`
        html = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#1e293b">Your reward is here! 🎉</h2>
            ${promo.delivery_message ? `<p>${promo.delivery_message}</p>` : ''}
            <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
              ${discountLabel ? `<p style="font-size:28px;font-weight:900;color:#6366f1;margin:0 0 4px">${discountLabel}</p>` : ''}
              <p style="color:#64748b;font-size:12px;margin:0 0 8px">Use this code at checkout</p>
              <p style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#1e293b;margin:0;background:#fff;border:2px dashed #6366f1;border-radius:6px;padding:8px 16px;display:inline-block">${promo.coupon_code}</p>
            </div>
          </div>`
      } else if (promo.type === 'digital_download' && promo.download_url) {
        subject = `Your download from ${tenantName}`
        html = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2>Your download is ready! 📥</h2>
            ${promo.delivery_message ? `<p>${promo.delivery_message}</p>` : ''}
            <a href="${promo.download_url}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Download Now</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:16px">Link expires in ${promo.download_expires_hours ?? 48} hours.</p>
          </div>`
      }

      let status = 'skipped'
      if (submission.customer_email === 'afiibusiness03@gmail.com') {
        await resend.emails.send({ from: FROM, to: submission.customer_email, subject, html })
        status = 'sent'
      }

      await service.from('email_deliveries').insert({
        tenant_id:      submission.tenant_id,
        submission_id:  submission.id,
        recipient_email: submission.customer_email,
        subject,
        template:       'promotion_delivery',
        status:         status,
        sent_at:        new Date().toISOString(),
      })

      delivered = true
    } catch (err) {
      console.error('Email error:', err)
    }
  }

  // Mark delivered
  await service
    .from('funnel_submissions')
    .update({
      claim_status:    delivered ? 'delivered' : 'approved',
      delivered_at:    delivered ? new Date().toISOString() : null,
      delivery_method: delivered ? 'email' : null,
    })
    .eq('id', params.id)

  return NextResponse.json({ success: true, delivered })
}
