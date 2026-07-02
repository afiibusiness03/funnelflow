import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const status   = searchParams.get('status')    // pending | approved | delivered | rejected
  const page     = parseInt(searchParams.get('page') ?? '1')
  const perPage  = parseInt(searchParams.get('per_page') ?? '20')
  const from     = (page - 1) * perPage
  const to       = from + perPage - 1

  let query = supabase
    .from('funnel_submissions')
    .select(`
      id, customer_email, customer_name, rating, feedback_text,
      order_id, order_verified, platform, marketplace,
      claim_status, claimed_at, delivered_at, delivery_method,
      is_flagged, flag_reason, created_at,
      campaign:campaigns(id, name),
      promotion:promotions(id, name, type)
    `, { count: 'exact' })
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('claim_status', status)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    count,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  })
}
