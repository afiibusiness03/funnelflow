import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeRedirect } from '@/lib/security/http'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {data:{user}}=await supabase.auth.getUser()
      if(user){
        const {error:accountError}=await supabase.rpc('create_tenant_account',{p_name:String(user.user_metadata.business_name || 'My business').slice(0,200),p_full_name:String(user.user_metadata.full_name || '').slice(0,200)})
        if(accountError)return NextResponse.redirect(new URL('/login?error=account_unavailable',origin))
      }
      return NextResponse.redirect(safeRedirect(next, origin))
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
