import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'
import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'

function getTrialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const msLeft = new Date(trialEndsAt).getTime() - Date.now()
  return Math.ceil(msLeft / (1000 * 60 * 60 * 24))
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user record with tenant
  const { data: userData } = await supabase
    .from('users')
    .select('*, tenant:tenants(*)')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant) redirect('/login')

  const tenant = userData.tenant as {
    id: string
    name: string
    logo_url: string | null
    plan_status: string
    trial_ends_at: string | null
    brand_color: string | null
  }

  // ── Trial / plan access check ──────────────────────────────────
  const planStatus  = tenant.plan_status   // 'trialing' | 'active' | 'canceled' | 'past_due' | null
  const isActive    = planStatus === 'active' || planStatus === 'past_due'
  const isTrialing  = planStatus === 'trialing'
  const daysLeft    = getTrialDaysLeft(tenant.trial_ends_at)

  // Trial expired: status is 'trialing' AND trial_ends_at has passed
  const isTrialExpired = isTrialing && daysLeft !== null && daysLeft <= 0

  // Canceled accounts are locked out
  const isCanceled = planStatus === 'canceled'

  // No plan at all (null/unknown) + no active trial = lock out
  const hasNoAccess = !isActive && !isTrialing

  if (isTrialExpired || isCanceled || hasNoAccess) redirect('/pricing?expired=true')
  // ──────────────────────────────────────────────────────────────

  // Get pending claims count for sidebar badge
  const { count: pendingClaims } = await supabase
    .from('funnel_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('claim_status', 'pending')

  // Show warning banner when ≤ 5 days left on trial
  const showTrialBanner = isTrialing && daysLeft !== null && daysLeft > 0 && daysLeft <= 5

  const brandColor = tenant.brand_color ?? '#f97316' // default to orange

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '249, 115, 22'
  }

  const darkenColor = (hex: string, percent: number): string => {
    let num = parseInt(hex.replace("#",""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
  }

  const brandColorDark = darkenColor(brandColor, 10)
  const brandColorRgb = hexToRgb(brandColor)

  return (
    <div 
      className="flex h-screen bg-slate-950 overflow-hidden"
      style={{
        '--brand-color': brandColor,
        '--brand-color-dark': brandColorDark,
        '--brand-color-rgb': brandColorRgb,
      } as React.CSSProperties}
    >
      <Sidebar
        tenantName={tenant.name}
        tenantLogo={tenant.logo_url}
        userEmail={userData.email}
        pendingClaims={pendingClaims ?? 0}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />

        {/* Trial expiry banner — only shows when ≤ 5 days left */}
        {showTrialBanner && (
          <div className={`flex items-center justify-between px-6 py-2.5 text-sm font-medium flex-shrink-0 ${
            daysLeft! <= 2
              ? 'bg-red-500/20 border-b border-red-500/40 text-red-300'
              : 'bg-amber-500/20 border-b border-amber-500/40 text-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              {daysLeft! <= 2
                ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                : <Clock className="w-4 h-4 flex-shrink-0" />
              }
              <span>
                {daysLeft === 1
                  ? 'Your free trial expires tomorrow!'
                  : `${daysLeft} days left in your free trial.`}
              </span>
            </div>
            <Link
              href="/pricing"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex-shrink-0"
            >
              Upgrade Now
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
