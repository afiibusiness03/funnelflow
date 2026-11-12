import { requireAccount } from '@/lib/security/access'
import { apiError, checkOrigin, readJson } from '@/lib/security/http'
import { campaignSchema } from '@/lib/security/schemas'
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params: routeParams }: { params: Promise<{ id: string }> }) {
  const params = await routeParams
  let account
  try { account = await requireAccount({ write: false }) } catch (error) { return apiError(error) }
  const { supabase, profile: userData } = account

  const [
    { data: campaign, error },
    { data: cpRows }
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select('*, product:products!campaigns_product_id_fkey(*), promotion:promotions(*), tenant:tenants(brand_color)')
      .eq('id', params.id)
      .eq('tenant_id', userData.tenant_id)
      .single(),
    supabase
      .from('campaign_products')
      .select('product:products!campaign_products_product_id_fkey(*)')
      .eq('campaign_id', params.id)
  ])

  if (error || !campaign) {
    console.error('GET campaign error:', error)
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

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

export async function PATCH(request: Request, { params: routeParams }: { params: Promise<{ id: string }> }) {
  const params = await routeParams
  let account
  try { account = await requireAccount({ write: true }); checkOrigin(request) } catch (error) { return apiError(error) }
  const { supabase, profile: userData } = account

  let body
  try { body = await readJson(request, campaignSchema.partial()) } catch (error) { return apiError(error) }

  if (Array.isArray(body.product_ids) && body.product_ids.length > 0) {
    body.product_id = body.product_ids[0]
  }

  const requestedProducts = body.product_ids?.length ? [...new Set(body.product_ids)] : body.product_id ? [body.product_id] : null
  if (requestedProducts) {
    const { data: owned, error: ownError } = await supabase.from('products').select('id').eq('tenant_id', userData.tenant_id).in('id', requestedProducts)
    if (ownError || owned?.length !== requestedProducts.length) return NextResponse.json({ error: 'Invalid product selection' }, { status: 400 })
  }
  if (body.promotion_id) {
    const { data: owned } = await supabase.from('promotions').select('id').eq('tenant_id', userData.tenant_id).eq('id', body.promotion_id).single()
    if (!owned) return NextResponse.json({ error: 'Invalid promotion' }, { status: 400 })
  }

  const allowed = [
    'name', 'status', 'require_order_verify', 'smart_routing', 'smart_routing_threshold',
    'language', 'review_url', 'custom_thank_you_msg', 'custom_color', 'custom_logo_url',
    'product_id', 'promotion_id',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key as keyof typeof body]
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

  if (error) return NextResponse.json({ error: 'Unable to save this change' }, { status: 500 })

  if (requestedProducts) {
    const { error: linksError } = await serviceClient.rpc('replace_campaign_products', { p_campaign: params.id, p_tenant: userData.tenant_id, p_products: requestedProducts })
    if (linksError) return NextResponse.json({ error: 'Unable to save product selection' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: Request, { params: routeParams }: { params: Promise<{ id: string }> }) {
  const params = await routeParams
  let account
  try { account = await requireAccount({ write: true }); checkOrigin(request) } catch (error) { return apiError(error) }
  const { supabase, profile: userData } = account

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('campaigns')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)

  if (error) return NextResponse.json({ error: 'Unable to save this change' }, { status: 500 })
  return NextResponse.json({ success: true })
}
