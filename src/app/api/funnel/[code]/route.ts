import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createEventToken } from '@/lib/security/event-token'
import { apiError, HttpError } from '@/lib/security/http'
import { rateLimit } from '@/lib/security/rate-limit'
import { hasAccess } from '@/lib/security/access'

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await rateLimit(request, 'funnel-read', 60)
    const { code } = await params
    if (!/^[a-zA-Z0-9_+\/-]{1,32}$/.test(code)) throw new HttpError(404, 'Campaign not found')
    const db = createServiceClient()
    const { data: campaign, error } = await db.from('campaigns').select(`
      id,name,language,require_order_verify,smart_routing,smart_routing_threshold,
      custom_logo_url,custom_color,custom_thank_you_msg,review_url,product_id,promotion_id,tenant_id,
      tenant:tenants(name,logo_url,brand_color,plan_status,trial_ends_at),
      promotion:promotions(id,type,delivery_message,requires_address,auto_deliver,is_active,tenant_id),
      campaign_products(product_id)
    `).eq('qr_short_code', code).eq('status', 'active').single()
    if (error || !campaign) throw new HttpError(404, 'Campaign not found')
    const tenant = campaign.tenant as any
    if (!tenant || !hasAccess(tenant)) throw new HttpError(404, 'Campaign not found')
    const ids = [...new Set([campaign.product_id, ...(campaign.campaign_products ?? []).map((p: any) => p.product_id)])]
    const { data: products, error: productError } = await db.from('products').select('id,name,image_url,review_url,platform,marketplace').eq('tenant_id', campaign.tenant_id).eq('is_active', true).in('id', ids)
    if (productError) throw productError
    const promo = campaign.promotion as any
    return NextResponse.json({ data: {
      id: campaign.id, name: campaign.name, language: campaign.language,
      require_order_verify: campaign.require_order_verify, smart_routing: campaign.smart_routing,
      smart_routing_threshold: campaign.smart_routing_threshold, custom_logo_url: campaign.custom_logo_url,
      custom_color: campaign.custom_color, custom_thank_you_msg: campaign.custom_thank_you_msg, review_url: campaign.review_url,
      product: products?.find(p => p.id === campaign.product_id) ?? products?.[0] ?? null, products: products ?? [],
      tenant: { name: tenant.name, logo_url: tenant.logo_url, brand_color: tenant.brand_color },
      promotion: promo?.is_active && promo.tenant_id === campaign.tenant_id ? { id: promo.id, type: promo.type, delivery_message: promo.delivery_message, requires_address: promo.requires_address, auto_deliver: promo.auto_deliver } : null,
      eventToken: createEventToken(campaign.id),
    } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}
