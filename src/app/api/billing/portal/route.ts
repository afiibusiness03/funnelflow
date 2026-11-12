import { requireAccount } from '@/lib/security/access'
import { checkOrigin, apiError, HttpError } from '@/lib/security/http'
import { rateLimit } from '@/lib/security/rate-limit'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'

export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const { tenant } = await requireAccount({ write: true, billing: true })
    if (!tenant.stripe_customer_id) throw new HttpError(409, 'No billing account yet')
    await rateLimit(request, 'billing-portal', 10)
    const session = await stripe.billingPortal.sessions.create({ customer: tenant.stripe_customer_id,
      return_url: `${new URL(request.url).origin}/pricing` })
    return NextResponse.redirect(session.url, 303)
  } catch (error) { return apiError(error) }
}
export async function GET(request: Request) { return NextResponse.redirect(new URL('/billing/confirm?portal=1', request.url)) }
