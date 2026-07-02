import { createServiceClient } from '@/lib/supabase/server'

// ─── Disposable / Temporary Email Domains ────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'mailinator.com',
  'throwawaymail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'yopmail.com',
  'trashmail.com',
  'fakeinbox.com',
  'maildrop.cc',
  'dispostable.com',
  'spamgourmet.com',
  'getairmail.com',
  'filzmail.com',
  'tempr.email',
  'discard.email',
  'spamhereplease.com',
  'spamthisplease.com',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  return DISPOSABLE_DOMAINS.has(domain)
}

// ─── Fraud Check Input/Output ─────────────────────────────────────────────────
interface FraudCheckInput {
  campaignId:    string
  customerEmail: string
  orderId?:      string
  ipAddress?:    string
}

interface FraudResult {
  isFlagged: boolean
  reason?:   string
}

export async function checkFraud({
  campaignId,
  customerEmail,
  orderId,
  ipAddress,
}: FraudCheckInput): Promise<FraudResult> {

  // 0. Disposable / throwaway email — fastest check, no DB needed
  if (isDisposableEmail(customerEmail)) {
    return { isFlagged: true, reason: 'disposable_email' }
  }

  const supabase = createServiceClient()

  // 1. Same email submitted more than once for same campaign
  const { count: emailCount } = await supabase
    .from('funnel_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('customer_email', customerEmail)

  if ((emailCount ?? 0) >= 1) {
    return { isFlagged: true, reason: 'duplicate_email' }
  }

  // 2. Same order ID used more than once
  if (orderId) {
    const { count: orderCount } = await supabase
      .from('funnel_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)

    if ((orderCount ?? 0) >= 1) {
      return { isFlagged: true, reason: 'duplicate_order' }
    }
  }

  // 3. Same IP submitted more than 3 times today
  if (ipAddress) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: ipCount } = await supabase
      .from('funnel_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', today.toISOString())

    if ((ipCount ?? 0) >= 3) {
      return { isFlagged: true, reason: 'ip_rate_limit' }
    }
  }

  return { isFlagged: false }
}
