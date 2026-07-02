import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PLANS } from '@/lib/stripe/client'

function getTrialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const msLeft = new Date(trialEndsAt).getTime() - Date.now()
  return Math.ceil(msLeft / (1000 * 60 * 60 * 24))
}

export async function GET(request: Request) {
  let isUserExpired = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const { searchParams, origin } = new URL(request.url)
    const planId   = (searchParams.get('plan') ?? 'starter') as keyof typeof PLANS
    const interval = searchParams.get('interval') ?? 'annual'

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id, email, tenant:tenants(stripe_customer_id, name, plan_status, trial_ends_at)')
      .eq('id', user.id)
      .single()

    if (!userData) return NextResponse.redirect(new URL('/dashboard', request.url))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant = (userData.tenant as unknown) as { 
      stripe_customer_id: string | null
      name: string
      plan_status: string
      trial_ends_at: string | null
    } | null

    // Determine access/expiration status
    if (tenant) {
      const planStatus = tenant.plan_status
      const isActive   = planStatus === 'active' || planStatus === 'past_due'
      const isTrialing = planStatus === 'trialing'
      const daysLeft   = getTrialDaysLeft(tenant.trial_ends_at)

      const isTrialExpired = isTrialing && daysLeft !== null && daysLeft <= 0
      const isCanceled     = planStatus === 'canceled'
      const hasNoAccess    = !isActive && !isTrialing

      if (isTrialExpired || isCanceled || hasNoAccess) {
        isUserExpired = true
      }
    }

    // Get or create Stripe customer
    let customerId = tenant?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    userData.email,
        name:     tenant?.name,
        metadata: { tenant_id: userData.tenant_id, user_id: user.id },
      })
      customerId = customer.id
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', userData.tenant_id)
    }

    const planConfig = PLANS[planId]
    if (!planConfig) {
      const dest = isUserExpired ? '/pricing?expired=true' : '/dashboard/settings/billing'
      return NextResponse.redirect(new URL(dest, request.url))
    }

    const priceId = interval === 'annual' ? planConfig.annual : planConfig.monthly

    if (!priceId) {
      console.error(`No price ID found for plan=${planId} interval=${interval}`)
      const dest = isUserExpired ? '/pricing?expired=true' : '/dashboard/settings/billing'
      return NextResponse.redirect(new URL(dest, request.url))
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // After payment, activate immediately (don't wait for webhook)
      success_url: `${origin}/api/billing/activate?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  isUserExpired ? `${origin}/pricing?expired=true` : `${origin}/pricing`,
      allow_promotion_codes: true,
      customer_update: { name: 'auto', address: 'auto' },
      tax_id_collection: { enabled: true },
    })

    return NextResponse.redirect(session.url!)
  } catch (error) {
    console.error('[billing/checkout] Error:', error)
    const dest = isUserExpired
      ? '/pricing?expired=true&error=checkout_failed'
      : '/dashboard/settings/billing?error=checkout_failed'
    return NextResponse.redirect(new URL(dest, request.url))
  }
}
