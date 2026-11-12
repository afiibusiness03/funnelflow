import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { escapeHtml, HttpError, safeUrl } from '@/lib/security/http'
import { resend, FROM } from './client'
export async function deliverReward(submissionId: string, tenantId: string, approve: boolean) {
  const db = createServiceClient()
  const { data: reservation,error } = await db.rpc('reserve_reward',{p_submission:submissionId,p_tenant:tenantId,p_approve:approve})
  if (error || !reservation?.reserved) throw new HttpError(409,'Reward unavailable or awaiting review')
  if (reservation.sent) return true
  const p = reservation.payload
  if (!p || !['coupon_code', 'digital_download'].includes(p.type)) return false
  if (Date.now()-new Date(reservation.reserved_at).getTime()>23*3600000) throw new HttpError(409,'Please reconcile this delivery before retrying')
  const title = String(p.title ?? 'the seller').replace(/[\r\n]/g,' ').slice(0,150)
  let reward = ''
  if (p.type==='coupon_code' && p.coupon_code) reward=`<p>Your coupon: <strong>${escapeHtml(p.coupon_code)}</strong></p>`
  else if (p.type==='digital_download' && safeUrl.safeParse(p.download_url).success) reward=`<p><a href="${escapeHtml(p.download_url)}">Download your reward</a></p>`
  else throw new HttpError(409,'This reward needs manual fulfillment')
  const { data:result,error:sendError } = await resend.emails.send({from:FROM,to:p.customer_email,subject:`Your reward from ${title}`,html:`<h2>Thank you!</h2><p>${escapeHtml(p.delivery_message || 'Your reward is ready.')}</p>${reward}`},{idempotencyKey:`reward/${submissionId}`})
  if (sendError || !result?.id) throw new HttpError(502,'Email delivery failed. Please retry later.')
  const { error:finishError } = await db.rpc('finish_reward',{p_submission:submissionId,p_tenant:tenantId,p_resend_id:result.id})
  if (finishError) throw new HttpError(503,'Delivery confirmation pending. Please retry later.')
  return true
}
