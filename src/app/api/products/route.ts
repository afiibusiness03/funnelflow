import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/products — list all products for current tenant
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: products })
}

// POST /api/products — create a new product
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, tenant:tenants(max_products)')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await request.json()
  const { name, platform, marketplace, asin, sku, product_url, image_url } = body

  if (!name) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
  }

  // Service role insert to guarantee bypass of RLS issues
  const serviceClient = createServiceClient()
  const { data: product, error } = await serviceClient
    .from('products')
    .insert({
      tenant_id:   userData.tenant_id,
      name,
      platform:    platform    ?? 'amazon',
      marketplace: marketplace ?? 'US',
      asin:        asin        || null,
      sku:         sku         || null,
      product_url: product_url || null,
      image_url:   image_url   || null,
      is_active:   true,
    })
    .select()
    .single()

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create product' }, { status: 500 })
  }

  return NextResponse.json({ data: product }, { status: 201 })
}
