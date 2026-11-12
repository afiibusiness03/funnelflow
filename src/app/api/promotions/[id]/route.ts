import { requireAccount } from '@/lib/security/access'
import { apiError, checkOrigin, readJson } from '@/lib/security/http'
import { promotionSchema } from '@/lib/security/schemas'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/promotions/[id]
export async function GET(_req: Request, { params: routeParams }: { params: Promise<{ id: string }> }) {
  const params = await routeParams
  let account
  try { account = await requireAccount({ write: false }) } catch (error) { return apiError(error) }
  const { supabase, profile: userData } = account

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data })
}

// PATCH /api/promotions/[id]
export async function PATCH(request: Request, { params: routeParams }: { params: Promise<{ id: string }> }) {
  const params = await routeParams
  let account
  try { account = await requireAccount({ write: true }); checkOrigin(request) } catch (error) { return apiError(error) }
  const { supabase, profile: userData } = account

  let body
  try { body = await readJson(request, promotionSchema.partial()) } catch (error) { return apiError(error) }
  const allowed = [
    'name', 'coupon_code', 'discount_type', 'discount_value', 'discount_currency',
    'download_url', 'download_expires_hours', 'gift_card_value', 'gift_card_currency',
    'delivery_message', 'auto_deliver', 'max_redemptions', 'is_active',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key as keyof typeof body]
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('promotions')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Unable to save this change' }, { status: 500 })
  return NextResponse.json({ data })
}
