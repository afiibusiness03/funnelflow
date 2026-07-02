import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (!data?.email_id) return NextResponse.json({ ok: true })

    const supabase = createServiceClient()
    const statusMap: Record<string, string> = {
      'email.sent':      'sent',
      'email.delivered': 'delivered',
      'email.bounced':   'bounced',
      'email.failed':    'failed',
    }

    const status = statusMap[type]
    if (!status) return NextResponse.json({ ok: true })

    await supabase
      .from('email_deliveries')
      .update({
        status,
        ...(type === 'email.delivered' && { opened_at: new Date().toISOString() }),
      })
      .eq('resend_id', data.email_id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
