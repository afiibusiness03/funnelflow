import 'server-only'

// Opt in only after Resend and a verified sender are ready. Never expose this
// switch as a client-supplied field or a NEXT_PUBLIC environment variable.
export function rewardEmailEnabled() {
  return process.env.REWARD_EMAIL_ENABLED === 'true'
}

export const emailDeliveryPaused = {
  success: true,
  delivered: false,
  deliveryStatus: 'paused',
  message: 'Email delivery is temporarily paused. This claim has not been emailed.',
}

export function isPausedEmailClaim(claim: any) {
  const delivery = Array.isArray(claim.delivery) ? claim.delivery[0] : claim.delivery
  const promotion = Array.isArray(claim.promotion) ? claim.promotion[0] : claim.promotion
  const type = delivery?.type ?? promotion?.type
  return !rewardEmailEnabled() && claim.claim_status !== 'delivered' && ['coupon_code', 'digital_download'].includes(type)
}
