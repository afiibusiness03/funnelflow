import { requireAccount } from '@/lib/security/access'
import { checkOrigin, apiError, HttpError } from '@/lib/security/http'
import { createServiceClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { NextResponse } from 'next/server'
import { stripe, PLANS } from '@/lib/stripe/client'

export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const { tenant, profile, user } = await requireAccount({ write: true, billing: true })
    const { searchParams, origin } = new URL(request.url)
    const planId = searchParams.get('plan') ?? 'starter'
    const interval = searchParams.get('interval') ?? 'annual'
    if (!Object.hasOwn(PLANS, planId) || !['annual', 'monthly'].includes(interval)) throw new HttpError(400, 'Invalid plan')
    const prices = PLANS[planId as keyof typeof PLANS]
    const priceId = interval === 'annual' ? prices.annual : prices.monthly
    if (!priceId) throw new HttpError(503, 'This plan is not available yet')
    await rateLimit(request, 'billing-checkout', 5)
    let customerId = tenant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: profile.email, name: tenant.name,
        metadata: { tenant_id: profile.tenant_id, user_id: user.id } }, { idempotencyKey: `customer/${profile.tenant_id}` })
      customerId = customer.id
      const { error } = await createServiceClient().from('tenants').update({ stripe_customer_id: customerId }).eq('id', profile.tenant_id)
      if (error) throw new HttpError(503, 'Billing account could not be saved')
    }
    // Manage an existing subscription in Stripe instead of charging for another one.
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })
    if (subscriptions.data.some(s => !['canceled', 'incomplete_expired'].includes(s.status))) {
      const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/pricing` })
      return NextResponse.redirect(portal.url, 303)
    }
    const session = await stripe.checkout.sessions.create({ customer: customerId, mode: 'subscription',
      payment_method_types: ['card'], line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing/success`, cancel_url: `${origin}/pricing`, allow_promotion_codes: true,
      customer_update: { name: 'auto', address: 'auto' }, tax_id_collection: { enabled: true },
    }, { idempotencyKey: `checkout/${profile.tenant_id}/${priceId}/${Math.floor(Date.now() / 1800000)}` })
    if (!session.url) throw new HttpError(503, 'Checkout unavailable')
    return NextResponse.redirect(session.url, 303)
  } catch (error) { return apiError(error) }
}

export async function GET(request: Request) {
  const url = new URL('/billing/confirm', request.url)
  const query = new URL(request.url).searchParams
  url.searchParams.set('plan', query.get('plan') ?? 'starter')
  url.searchParams.set('interval', query.get('interval') ?? 'annual')
  return NextResponse.redirect(url)
}
