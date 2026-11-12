import 'server-only'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { PLANS, stripe } from './client'

export function subscriptionStatus(status: string) {
  if (status === 'active') return 'active'
  if (status === 'trialing') return 'trialing'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  return 'canceled'
}

export async function syncSubscription(subscriptionId: string) {
  // Fetch current Stripe state instead of applying stale/out-of-order event payloads.
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const db = createServiceClient()
  const { data: tenant, error } = await db.from('tenants').select('id,stripe_subscription_id').eq('stripe_customer_id',customerId).single()
  if (error || !tenant) throw new Error('Billing account unavailable')
  // An old subscription event must never overwrite a replacement subscription.
  if (tenant.stripe_subscription_id && tenant.stripe_subscription_id !== sub.id) {
    const current = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)
    if (current.created > sub.created) return
  }
  const price = sub.items.data[0]?.price.id
  const plan = Object.entries(PLANS).find(([,prices]) => !!price && Object.values(prices).includes(price))?.[0]
  if (!plan) throw new Error('Unrecognized subscription price')
  const { error: subscriptionError } = await db.from('subscriptions').upsert({
    tenant_id:tenant.id,stripe_subscription_id:sub.id,stripe_customer_id:customerId,plan,status:sub.status,
    current_period_start:new Date(sub.current_period_start*1000).toISOString(),current_period_end:new Date(sub.current_period_end*1000).toISOString(),
    cancel_at_period_end:sub.cancel_at_period_end,canceled_at:sub.canceled_at?new Date(sub.canceled_at*1000).toISOString():null,
  },{onConflict:'stripe_subscription_id'})
  if (subscriptionError) throw subscriptionError
  const { error: tenantError } = await db.from('tenants').update({plan,plan_status:subscriptionStatus(sub.status),stripe_subscription_id:sub.id,
    trial_ends_at:sub.trial_end?new Date(sub.trial_end*1000).toISOString():null}).eq('id',tenant.id)
  if (tenantError) throw tenantError
}

export async function syncInvoice(invoice: Stripe.Invoice) {
  const customerId=typeof invoice.customer==='string'?invoice.customer:invoice.customer?.id
  const db=createServiceClient()
  const {data:tenant,error}=await db.from('tenants').select('id').eq('stripe_customer_id',customerId).single()
  if(error || !tenant)throw new Error('Billing account unavailable')
  const {error:writeError}=await db.from('invoices').upsert({tenant_id:tenant.id,stripe_invoice_id:invoice.id,amount_paid:invoice.amount_paid,
    currency:invoice.currency,status:invoice.status ?? 'unknown',invoice_pdf_url:invoice.invoice_pdf,
    period_start:new Date(invoice.period_start*1000).toISOString(),period_end:new Date(invoice.period_end*1000).toISOString()},{onConflict:'stripe_invoice_id'})
  if(writeError)throw writeError
  const subscription=typeof invoice.subscription==='string'?invoice.subscription:invoice.subscription?.id
  if(subscription)await syncSubscription(subscription)
}
