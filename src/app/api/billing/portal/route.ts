import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: userData } = await supabase
    .from('users')
    .select('tenant:tenants(stripe_customer_id)')
    .eq('id', user.id).single()

  const customerId = (userData?.tenant as any)?.stripe_customer_id
  if (!customerId) return NextResponse.redirect(new URL('/dashboard/settings/billing', request.url))

  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${origin}/dashboard/settings/billing`,
  })

  return NextResponse.redirect(session.url)
}
