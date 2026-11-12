import { NextResponse } from 'next/server'
import { requireAccount } from '@/lib/security/access'
import { apiError, checkOrigin, readJson, HttpError } from '@/lib/security/http'
import { promotionSchema } from '@/lib/security/schemas'

export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const { supabase, profile } = await requireAccount({ write: true })
    const body = await readJson(request, promotionSchema)
    const { data, error } = await supabase.from('promotions').insert({ ...body, tenant_id: profile.tenant_id }).select('id').single()
    if (error) throw new HttpError(409, 'Unable to create promotion. Check your plan limit and reward details.')
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) { return apiError(error) }
}
