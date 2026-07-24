import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const reason = body.reason ?? 'Rejected by seller'

  const service = createServiceClient()
  const { error } = await service
    .from('funnel_submissions')
    .update({ claim_status: 'rejected', flag_reason: reason, is_flagged: true })
    .eq('id', params.id)
    .eq('tenant_id', userData.tenant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
