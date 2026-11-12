import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { syncInvoice, syncSubscription } from '@/lib/stripe/sync'
export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({error:'Webhook unavailable'},{status:503})
  const signature=request.headers.get('stripe-signature')
  if(!signature)return NextResponse.json({error:'Missing signature'},{status:400})
  let event: Stripe.Event
  try { event=stripe.webhooks.constructEvent(await request.text(),signature,process.env.STRIPE_WEBHOOK_SECRET) }
  catch {return NextResponse.json({error:'Invalid signature'},{status:400})}
  try {
    switch(event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': await syncSubscription((event.data.object as Stripe.Subscription).id); break
      case 'invoice.paid':
      case 'invoice.payment_failed': await syncInvoice(event.data.object as Stripe.Invoice); break
    }
    return NextResponse.json({received:true})
  } catch {return NextResponse.json({error:'Billing update failed; please retry'},{status:503})}
}
