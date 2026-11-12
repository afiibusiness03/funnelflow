import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { apiError, email, readJson } from '@/lib/security/http'
import { rateLimit } from '@/lib/security/rate-limit'
export async function POST(request: Request) {
  try {
    const body = await readJson(request,z.object({email,notes:z.string().trim().max(2000).optional()}),4096)
    await rateLimit(request,'waitlist',3,3600)
    const { error } = await createServiceClient().from('waitlist_requests').insert({email:body.email,notes:body.notes || null})
    if (error) throw error
    return NextResponse.json({success:true,message:'Your request has been received!'})
  } catch(error) { return apiError(error) }
}
