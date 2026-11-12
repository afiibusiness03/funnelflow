import { requireAccount } from '@/lib/security/access'
import { apiError, checkOrigin, readJson } from '@/lib/security/http'
import { productSchema } from '@/lib/security/schemas'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/products/[id]
export async function GET(_req: Request, { params: routeParams }: { params: Promise<{ id: string }> }) {
  const params = await routeParams
  let account
  try { account = await requireAccount({ write: false }) } catch (error) { return apiError(error) }
  const { supabase, profile: userData } = account

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data })
}

// PATCH /api/products/[id] — update fields or toggle is_active
export async function PATCH(request: Request, { params: routeParams }: { params: Promise<{ id: string }> }) {
  const params = await routeParams
  let account
  try { account = await requireAccount({ write: true }); checkOrigin(request) } catch (error) { return apiError(error) }
  const { supabase, profile: userData } = account

  let body
  try { body = await readJson(request, productSchema.partial()) } catch (error) { return apiError(error) }
  const allowed = ['name', 'asin', 'sku', 'product_url', 'review_url', 'image_url', 'is_active']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key as keyof typeof body]
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Unable to save this change' }, { status: 500 })
  return NextResponse.json({ data })
}
