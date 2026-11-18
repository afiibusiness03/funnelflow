import 'server-only'
import { Resend } from 'resend'
import { HttpError } from '@/lib/security/http'

// Construct inside the route's error boundary, not while importing the module.
export function getResend() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new HttpError(503, 'Email delivery is not configured. Set RESEND_API_KEY in Vercel and redeploy.')
  return new Resend(apiKey)
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@amazinreview.com'
export const FROM_NAME  = process.env.RESEND_FROM_NAME  ?? 'AmazinReview'
export const FROM       = `${FROM_NAME} <${FROM_EMAIL}>`
