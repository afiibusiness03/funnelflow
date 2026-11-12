import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAccount } from '@/lib/security/access'
import { apiError, HttpError, readJson, uuid } from '@/lib/security/http'
import { createServiceClient } from '@/lib/supabase/server'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile } = await requireAccount({ write: true })
    const { id } = await params
    if (!uuid.safeParse(id).success) throw new HttpError(400,'Invalid claim')
    const body = await readJson(request,z.object({ reason:z.string().trim().max(1000).default('Rejected by seller') }))
    const { data,error } = await createServiceClient().from('funnel_submissions').update({claim_status:'rejected',flag_reason:body.reason,is_flagged:true}).eq('id',id).eq('tenant_id',profile.tenant_id).eq('claim_status','pending').select('id').single()
    if (error || !data) throw new HttpError(409,'Only pending claims can be rejected')
    return NextResponse.json({success:true})
  } catch(error) { return apiError(error) }
}
