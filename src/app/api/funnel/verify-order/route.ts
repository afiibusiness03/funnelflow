import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// ─── Order ID Format Rules ────────────────────────────────────────────────────
function validateOrderIdFormat(orderId: string, platform: string): boolean {
  switch (platform.toLowerCase()) {
    case 'amazon':    return /^\d{3}-\d{7}-\d{7}$/.test(orderId)
    case 'ebay':      return /^\d{9,18}$/.test(orderId)
    case 'walmart':   return /^\d{13,14}$/.test(orderId)
    case 'etsy':      return /^\d{10}$/.test(orderId)
    case 'shopify':   return /^#?\d{4,10}$/.test(orderId)
    default:          return orderId.trim().length >= 3
  }
}

// Verify order ID exists for a given platform
export async function POST(request: Request) {
  try {
    const { orderId, platform, campaignId } = await request.json()

    if (!orderId || !campaignId) {
      return NextResponse.json({ error: 'orderId and campaignId are required' }, { status: 400 })
    }

    // ── Server-side format validation ─────────────────────────────────────────
    const platformKey = (platform ?? 'custom').toLowerCase()
    if (!validateOrderIdFormat(orderId, platformKey)) {
      return NextResponse.json({ verified: false, error: 'invalid_format' }, { status: 200 })
    }

    const supabase = createServiceClient()

    // 1. Check this order hasn't already been used for this campaign
    const { count } = await supabase
      .from('funnel_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('order_id', orderId)

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { verified: false, error: 'This order has already been used.' },
        { status: 200 }
      )
    }

    // 2. Fetch the campaign's product marketplace for regional SP-API routing
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('product:products(marketplace)')
      .eq('id', campaignId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marketplace: string = (campaign?.product as any)?.marketplace ?? 'US'

    // 3. Platform-specific verification
    let verified = false

    if (platformKey === 'amazon') {
      const { verifyAmazonOrderId } = await import('@/lib/amazon/verify-order')
      verified = await verifyAmazonOrderId(orderId, marketplace)
    } else {
      // Non-Amazon: accept any correctly-formatted, non-empty order ID
      // Seller can manually reject in Claims Center if fraud is detected
      verified = orderId.trim().length >= 3
    }

    return NextResponse.json({ verified })
  } catch (error) {
    console.error('Order verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
