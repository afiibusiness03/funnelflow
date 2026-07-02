import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Track funnel events (scans, step completions, drop-offs)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { campaignId, eventType, stepNumber, submissionId, metadata } = body

    if (!campaignId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant_id from campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('tenant_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) return NextResponse.json({ ok: true }) // Fail silently

    await supabase.from('funnel_events').insert({
      campaign_id:   campaignId,
      tenant_id:     campaign.tenant_id,
      submission_id: submissionId ?? null,
      event_type:    eventType,
      step_number:   stepNumber ?? null,
      metadata:      metadata ?? null,
      ip_address:    request.headers.get('x-forwarded-for') ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // Always succeed silently
  }
}
