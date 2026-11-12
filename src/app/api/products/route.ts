import { requireAccount } from '@/lib/security/access'
import { apiError, checkOrigin, readJson } from '@/lib/security/http'
import { productSchema } from '@/lib/security/schemas'
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/products — list all products for current tenant
export async function GET() {
  let account
  try { account = await requireAccount({ write: false }) } catch (error) { return apiError(error) }
  const { supabase, profile: userData } = account

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Unable to save this change' }, { status: 500 })
  return NextResponse.json({ data: products })
}

// POST /api/products — create a new product
export async function POST(request: Request) {
  let account
  try { account = await requireAccount({ write: true }); checkOrigin(request) } catch (error) { return apiError(error) }
  const { supabase, profile: userData } = account

  let body
  try { body = await readJson(request, productSchema) } catch (error) { return apiError(error) }
  const { name, platform, marketplace, asin, sku, product_url, review_url, image_url } = body

  if (!name) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
  }

  // Database policies and quota triggers enforce the same rules for every caller.
  const { data: product, error } = await supabase
    .from('products')
    .insert({
      tenant_id:   userData.tenant_id,
      name,
      platform:    platform    ?? 'amazon',
      marketplace: marketplace ?? 'US',
      asin:        asin        || null,
      sku:         sku         || null,
      product_url: product_url || null,
      review_url:  review_url  || null,
      image_url:   image_url   || null,
      is_active:   true,
    })
    .select()
    .single()

  if (error || !product) {
    return NextResponse.json({ error: 'Unable to create product. Check your plan limit and product details.' }, { status: 409 })
  }

  return NextResponse.json({ data: product }, { status: 201 })
}
