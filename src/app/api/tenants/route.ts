import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { apiError, HttpError, readJson } from '@/lib/security/http'
import { rateLimit } from '@/lib/security/rate-limit'
export async function POST(request: Request) {
  try {
    const body=await readJson(request,z.object({name:z.string().trim().min(2).max(200),fullName:z.string().trim().max(200).default('')}))
    const db=await createClient()
    const {data:{user}}=await db.auth.getUser()
    if(!user)throw new HttpError(401,'Confirm your email and sign in first')
    const {data:existing}=await db.from('users').select('tenant_id').eq('id',user.id).single()
    if(existing)return NextResponse.json({tenant:{id:existing.tenant_id}})
    await rateLimit(request,'registration',5,3600)
    const {data,error}=await db.rpc('create_tenant_account',{p_name:body.name,p_full_name:body.fullName})
    if(error)throw new HttpError(403,'Account creation is unavailable. Contact support if you have an invitation.')
    return NextResponse.json({tenant:{id:data}},{status:201})
  }catch(error){return apiError(error)}
}
