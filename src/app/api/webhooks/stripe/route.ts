import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body      = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    // ── Subscription created or updated ──────────────────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription
      const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      const priceId = sub.items.data[0]?.price?.id ?? ''

      // Map price ID → plan name
      const planMap: Record<string, string> = {
        [process.env.STRIPE_PRICE_STARTER_MONTHLY!]:  'starter',
        [process.env.STRIPE_PRICE_STARTER_ANNUAL!]:   'starter',
        [process.env.STRIPE_PRICE_GROWTH_MONTHLY!]:   'growth',
        [process.env.STRIPE_PRICE_GROWTH_ANNUAL!]:    'growth',
        [process.env.STRIPE_PRICE_PRO_MONTHLY!]:      'pro',
        [process.env.STRIPE_PRICE_PRO_ANNUAL!]:       'pro',
        [process.env.STRIPE_PRICE_AGENCY_MONTHLY!]:   'agency',
        [process.env.STRIPE_PRICE_AGENCY_ANNUAL!]:    'agency',
      }
      const plan = planMap[priceId] ?? 'starter'

      // Update tenant plan
      await supabase
        .from('tenants')
        .update({
          plan,
          plan_status:            sub.status === 'active' ? 'active' : sub.status,
          stripe_subscription_id: sub.id,
        })
        .eq('stripe_customer_id', custId)

      // Upsert subscription record
      await supabase.from('subscriptions').upsert({
        stripe_subscription_id: sub.id,
        stripe_customer_id:     custId,
        plan,
        status:                 sub.status,
        current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end:     new Date(sub.current_period_end   * 1000).toISOString(),
        cancel_at_period_end:   sub.cancel_at_period_end,
        canceled_at:            sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      }, { onConflict: 'stripe_subscription_id' })

      break
    }

    // ── Subscription deleted ──────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription
      const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      await supabase
        .from('tenants')
        .update({ plan: 'starter', plan_status: 'canceled' })
        .eq('stripe_customer_id', custId)

      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)

      break
    }

    // ── Invoice paid ──────────────────────────────────────────
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const custId  = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? ''

      const { data: tenant } = await supabase
        .from('tenants').select('id').eq('stripe_customer_id', custId).single()

      if (tenant) {
        await supabase.from('invoices').upsert({
          tenant_id:        tenant.id,
          stripe_invoice_id: invoice.id,
          amount_paid:      invoice.amount_paid,
          currency:         invoice.currency,
          status:           invoice.status ?? 'paid',
          invoice_pdf_url:  invoice.invoice_pdf,
          period_start:     invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end:       invoice.period_end   ? new Date(invoice.period_end   * 1000).toISOString() : null,
        }, { onConflict: 'stripe_invoice_id' })
      }
      break
    }

    // ── Payment failed ────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const custId  = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? ''

      await supabase
        .from('tenants')
        .update({ plan_status: 'past_due' })
        .eq('stripe_customer_id', custId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
