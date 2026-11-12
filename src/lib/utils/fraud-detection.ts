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
