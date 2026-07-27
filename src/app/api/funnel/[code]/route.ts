import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public endpoint — no auth needed
// Returns only the data the funnel UI needs (no sensitive info)
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const supabase = createServiceClient()

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(`
      id, name, language, require_order_verify,
      smart_routing, smart_routing_threshold,
      custom_logo_url, custom_color, custom_thank_you_msg,
      review_url, qr_short_code, status,
      product:products!campaigns_product_id_fkey(id, name, image_url, review_url, platform, marketplace),
      promotion:promotions(id, type, delivery_message, requires_address, auto_deliver),
      tenant:tenants(name, logo_url, brand_color)
    `)
    .eq('qr_short_code', params.code)
    .eq('status', 'active')
    .single()

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found or inactive' }, { status: 404 })
  }

  // Check if campaign has multi-products in campaign_products table
  const { data: cpRows } = await supabase
    .from('campaign_products')
    .select('product:products!campaign_products_product_id_fkey(id, name, image_url, review_url, platform, marketplace)')
    .eq('campaign_id', campaign.id)

  let productsList = []
  if (cpRows && cpRows.length > 0) {
    productsList = cpRows.map((r: any) => r.product).filter(Boolean)
  } else if (campaign.product) {
    productsList = [campaign.product]
  }

  const campaignData = {
    ...campaign,
    products: productsList,
  }

  return NextResponse.json({ data: campaignData })
}
