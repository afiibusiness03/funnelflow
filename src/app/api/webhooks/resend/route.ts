import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend } from '@/lib/resend/client'
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret || !process.env.RESEND_API_KEY?.trim()) return NextResponse.json({error:'Webhook unavailable'},{status:503})
  let event
  try {
    event = getResend().webhooks.verify({payload:await request.text(),headers:{id:request.headers.get('svix-id') ?? '',timestamp:request.headers.get('svix-timestamp') ?? '',signature:request.headers.get('svix-signature') ?? ''},webhookSecret:secret})
  } catch { return NextResponse.json({error:'Invalid signature'},{status:400}) }
  const status: Record<string,string> = {'email.sent':'sent','email.delivered':'delivered','email.bounced':'bounced','email.failed':'failed'}
  const db=createServiceClient()
  if ('email_id' in event.data && (status[event.type] || ['email.opened','email.clicked'].includes(event.type))) {
    const { data: delivery, error } = await db.from('email_deliveries').select('id').eq('resend_id',event.data.email_id).single()
    // Provider events can arrive before the sending request commits its delivery log.
    if (error || !delivery) return NextResponse.json({error:'Delivery not recorded yet; please retry'},{status:503})
  }
  if (status[event.type] && 'email_id' in event.data) {
    let query=db.from('email_deliveries').update({status:status[event.type]}).eq('resend_id',event.data.email_id)
    if (event.type==='email.sent') query=query.in('status',['queued','sent'])
    if (event.type==='email.delivered') query=query.in('status',['queued','sent','delivered'])
    const {error}=await query
    if(error)return NextResponse.json({error:'Please retry'},{status:503})
  } else if (event.type==='email.opened' || event.type==='email.clicked') {
    const field=event.type==='email.opened'?'opened_at':'clicked_at'
    const {error}=await db.from('email_deliveries').update({[field]:new Date().toISOString()}).eq('resend_id',event.data.email_id).is(field,null)
    if(error)return NextResponse.json({error:'Please retry'},{status:503})
  }
  return NextResponse.json({ok:true})
}
