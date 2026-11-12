import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, checkOrigin } from '@/lib/security/http'
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) return apiError(error)
    return NextResponse.redirect(new URL('/login', request.url), 303)
  } catch (error) { return apiError(error) }
}
