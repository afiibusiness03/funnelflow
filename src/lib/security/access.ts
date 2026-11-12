import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { HttpError } from './http'

export function hasAccess(tenant: { plan_status: string; trial_ends_at: string | null }) {
  return tenant.plan_status === 'active' || (tenant.plan_status === 'trialing' && !!tenant.trial_ends_at && new Date(tenant.trial_ends_at).getTime() > Date.now())
}

export const getAccount = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new HttpError(401, 'Unauthorized')
  const { data, error: profileError } = await supabase.from('users').select('id, tenant_id, email, role, tenant:tenants(*)').eq('id', user.id).single()
  if (profileError || !data?.tenant) throw new HttpError(403, 'Account unavailable')
  return { supabase, user, profile: data, tenant: data.tenant as any }
})

export async function requireAccount({ write = false, billing = false } = {}) {
  const account = await getAccount()
  if (write && !['owner', 'admin'].includes(account.profile.role)) throw new HttpError(403, 'Administrator access required')
  if (!billing && !hasAccess(account.tenant)) throw new HttpError(403, 'An active subscription is required')
  return account
}
