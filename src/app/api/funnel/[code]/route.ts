import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public endpoint — no auth needed
// Returns only the data the funnel UI needs (no sensitive info)
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const supabase = createServiceClient()

  // 1. Fetch campaign details by qr_short_code
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(`
      id, name, language, require_order_verify,
      smart_routing, smart_routing_threshold,
      custom_logo_url, custom_color, custom_thank_you_msg,
      review_url, qr_short_code, status, product_id, promotion_id, tenant_id
    `)
    .eq('qr_short_code', params.code)
    .single()

  if (error || !campaign) {
    console.error('GET funnel campaign error:', error)
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // 2. Fetch tenant branding info
  let tenant = null
  if (campaign.tenant_id) {
    const { data: t } = await supabase
      .from('tenants')
      .select('name, logo_url, brand_color')
      .eq('id', campaign.tenant_id)
      .single()
    tenant = t
  }

  // 3. Fetch primary product if set
  let primaryProduct = null
  if (campaign.product_id) {
    const { data: p } = await supabase
      .from('products')
      .select('id, name, image_url, review_url, platform, marketplace')
      .eq('id', campaign.product_id)
      .single()
    primaryProduct = p
  }

  // 4. Fetch promotion details if set
  let promotion = null
  if (campaign.promotion_id) {
    const { data: pr } = await supabase
      .from('promotions')
      .select('id, type, delivery_message, requires_address, auto_deliver')
      .eq('id', campaign.promotion_id)
      .single()
    promotion = pr
  }

  // 5. Fetch campaign_products entries if multi-product
  const { data: cpRows } = await supabase
    .from('campaign_products')
    .select('product_id')
    .eq('campaign_id', campaign.id)

  let productsList: any[] = []
  if (cpRows && cpRows.length > 0) {
    const pIds = cpRows.map(r => r.product_id)
    const { data: multiProds } = await supabase
      .from('products')
      .select('id, name, image_url, review_url, platform, marketplace')
      .in('id', pIds)
    productsList = multiProds || []
  } else if (primaryProduct) {
    productsList = [primaryProduct]
  }

  const campaignData = {
    ...campaign,
    product: primaryProduct || productsList[0] || null,
    products: productsList,
    promotion,
    tenant,
  }

  return NextResponse.json({ data: campaignData })
}
