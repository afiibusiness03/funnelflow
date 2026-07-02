import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import type Stripe from 'stripe'

// Price ID → plan name map
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '']: 'starter',
  [process.env.STRIPE_PRICE_STARTER_ANNUAL  ?? '']: 'starter',
  [process.env.STRIPE_PRICE_GROWTH_MONTHLY  ?? '']: 'growth',
  [process.env.STRIPE_PRICE_GROWTH_ANNUAL   ?? '']: 'growth',
  [process.env.STRIPE_PRICE_PRO_MONTHLY     ?? '']: 'pro',
  [process.env.STRIPE_PRICE_PRO_ANNUAL      ?? '']: 'pro',
  [process.env.STRIPE_PRICE_AGENCY_MONTHLY  ?? '']: 'agency',
  [process.env.STRIPE_PRICE_AGENCY_ANNUAL   ?? '']: 'agency',
}

// Called by /billing/success immediately after Stripe redirects back.
// Reads the completed session directly from Stripe and activates the tenant
// without waiting for the webhook (which may arrive after the page redirect).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 1. Retrieve session (with expanded subscription)
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    // Not paid yet — redirect to dashboard anyway (webhook will handle it)
    if (session.status !== 'complete') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const sub     = session.subscription as Stripe.Subscription | null
    const custId  = typeof session.customer === 'string'
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id ?? null

    const priceId = sub?.items?.data[0]?.price?.id ?? ''
    const plan    = PRICE_TO_PLAN[priceId] ?? 'starter'

    // 2. Immediately write active status to DB — no webhook delay
    if (custId) {
      const supabase = createServiceClient()
      await supabase
        .from('tenants')
        .update({
          plan,
          plan_status:            'active',
          stripe_subscription_id: sub?.id ?? null,
        })
        .eq('stripe_customer_id', custId)
    }

    // 3. Go straight to dashboard — plan is now active
    return NextResponse.redirect(new URL('/dashboard?upgraded=1', request.url))
  } catch (error) {
    console.error('[billing/activate] Error:', error)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}
