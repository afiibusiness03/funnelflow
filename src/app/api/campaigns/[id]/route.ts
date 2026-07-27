import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const serviceClient = createServiceClient()
  const { data: campaign, error } = await serviceClient
    .from('campaigns')
    .select('*, product:products!campaigns_product_id_fkey(*), promotion:promotions(*), tenant:tenants(brand_color)')
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)
    .single()

  if (error || !campaign) {
    console.error('GET campaign error:', error)
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Fetch campaign_products entries if multi-products
  const { data: cpRows } = await serviceClient
    .from('campaign_products')
    .select('product:products!campaign_products_product_id_fkey(*)')
    .eq('campaign_id', campaign.id)

  let productsList = []
  if (cpRows && cpRows.length > 0) {
    productsList = cpRows.map((r: any) => r.product).filter(Boolean)
  } else if (campaign.product) {
    productsList = [campaign.product]
  }

  return NextResponse.json({
    data: {
      ...campaign,
      products: productsList,
    }
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const allowed = [
    'name', 'status', 'require_order_verify', 'smart_routing', 'smart_routing_threshold',
    'language', 'review_url', 'custom_thank_you_msg', 'custom_color', 'custom_logo_url',
    'product_id', 'promotion_id',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  updates.updated_at = new Date().toISOString()

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('campaigns')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)
    .select('*, product:products!campaigns_product_id_fkey(*), promotion:promotions(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('campaigns')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
