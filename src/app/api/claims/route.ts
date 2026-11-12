import { requireAccount } from '@/lib/security/access'
import { apiError } from '@/lib/security/http'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  let account
  try { account = await requireAccount() } catch(error) { return apiError(error) }
  const {supabase,profile:userData}=account
  const { searchParams } = new URL(request.url)
  const status=searchParams.get('status')
  if(status && !['pending','approved','delivered','rejected','expired'].includes(status)) return NextResponse.json({error:'Invalid status'},{status:400})
  const page=Number(searchParams.get('page') ?? 1)
  const perPage=Number(searchParams.get('per_page') ?? 20)
  if(!Number.isInteger(page)||page<1||page>10000||!Number.isInteger(perPage)||perPage<1||perPage>100)return NextResponse.json({error:'Invalid pagination'},{status:400})
  const from=(page-1)*perPage
  const to=from+perPage-1

  let query = supabase
    .from('funnel_submissions')
    .select(`
      id, customer_email, customer_name, rating, feedback_text,
      order_id, order_verified, platform, marketplace, shipping_address,
      claim_status, claimed_at, delivered_at, delivery_method,
      is_flagged, flag_reason, created_at,
      campaign:campaigns(id, name),
      promotion:promotions(id, name, type)
    `, { count: 'exact' })
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('claim_status', status)

  const [{ data, count, error }, {data:counts,error:countsError}] = await Promise.all([query,supabase.rpc('claim_counts')])
  if(countsError)return apiError(countsError)
  if (error) return NextResponse.json({ error: 'Unable to load claims' }, { status: 500 })

  return NextResponse.json({
    data,
    counts,
    count,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  })
}
