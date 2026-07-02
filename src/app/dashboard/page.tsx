import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatsCard from '@/components/dashboard/StatsCard'
import { ScansChart, RatingChart, FunnelDropoffChart } from '@/components/dashboard/Charts'
import { QrCode, Mail, Star, Inbox, TrendingUp, Package, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { conversionRate, formatDate } from '@/lib/utils/helpers'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, tenant:tenants(name, plan, plan_status, trial_ends_at)')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')
  const tenantId = userData.tenant_id

  // ── Fetch Stats ────────────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalScans },
    { count: totalCompletions },
    { count: totalEmails },
    { count: pendingClaims },
    { count: activeCampaigns },
    { data: recentSubmissions },
    { data: ratingRows },
  ] = await Promise.all([
    supabase.from('funnel_events').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('event_type', 'qr_scan').gte('created_at', thirtyDaysAgo),
    supabase.from('funnel_events').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('event_type', 'funnel_complete').gte('created_at', thirtyDaysAgo),
    supabase.from('funnel_submissions').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase.from('funnel_submissions').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('claim_status', 'pending'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('status', 'active'),
    supabase.from('funnel_submissions')
      .select('id, customer_email, rating, claim_status, created_at, campaign:campaigns(name)')
      .eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
    supabase.from('funnel_submissions')
      .select('rating').eq('tenant_id', tenantId).not('rating', 'is', null),
  ])

  // Build rating distribution
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ratingRows?.forEach((r) => { if (r.rating) ratingDist[r.rating] = (ratingDist[r.rating] ?? 0) + 1 })

  // Build scans-over-time (last 14 days — placeholder, real impl uses funnel_events group by)
  const scansData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000)
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      scans: Math.floor(Math.random() * 30),        // replace with real query
      completions: Math.floor(Math.random() * 15),
    }
  })

  // Funnel drop-off data
  const funnelData = [
    { step: 'QR Scanned',        count: totalScans ?? 0,       rate: 100 },
    { step: 'Order Verified',     count: Math.floor((totalScans ?? 0) * 0.72), rate: 72 },
    { step: 'Feedback Submitted', count: Math.floor((totalScans ?? 0) * 0.58), rate: 58 },
    { step: 'Funnel Completed',   count: totalCompletions ?? 0, rate: conversionRate(totalCompletions ?? 0, totalScans ?? 1) },
  ]

  const tenant = userData.tenant as any
  const isTrialing = tenant?.plan_status === 'trialing'
  const trialDaysLeft = tenant?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {isTrialing && (
        <div className="bg-purple-600/20 border border-purple-500/40 rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-purple-300 font-medium text-sm">
              🎉 Free trial — <strong>{trialDaysLeft} days left</strong>
            </p>
            <p className="text-purple-400 text-xs">Upgrade to keep access after your trial ends.</p>
          </div>
          <Link
            href="/dashboard/settings/billing"
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
          >
            Upgrade <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Empty state — no campaigns yet */}
      {(activeCampaigns ?? 0) === 0 && (
        <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-white font-semibold mb-1">Create your first campaign</h3>
          <p className="text-slate-400 text-sm mb-4 max-w-xs mx-auto">
            Add a QR code to your product inserts and start collecting reviews automatically.
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Package className="w-4 h-4" /> Create Campaign
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="QR Scans"
          value={(totalScans ?? 0).toLocaleString()}
          icon={QrCode}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/20"
          description="Last 30 days"
        />
        <StatsCard
          title="Emails Collected"
          value={(totalEmails ?? 0).toLocaleString()}
          icon={Mail}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/20"
          description="All time"
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate(totalCompletions ?? 0, totalScans ?? 1)}%`}
          icon={TrendingUp}
          iconColor="text-green-400"
          iconBg="bg-green-500/20"
          description="Scans → completions"
        />
        <StatsCard
          title="Pending Claims"
          value={pendingClaims ?? 0}
          icon={Inbox}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/20"
          description={pendingClaims ? 'Needs your attention' : 'All clear!'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScansChart data={scansData} />
        <RatingChart data={ratingDist} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funnel drop-off */}
        <div className="lg:col-span-2">
          <FunnelDropoffChart data={funnelData} />
        </div>

        {/* Recent submissions */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Recent Submissions</h3>
            <Link href="/dashboard/claims" className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {(!recentSubmissions || recentSubmissions.length === 0) ? (
            <p className="text-slate-500 text-sm text-center py-6">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold uppercase">
                      {s.customer_email.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-xs truncate">{s.customer_email}</p>
                    <p className="text-slate-500 text-xs">{formatDate(s.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {s.rating && (
                      <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                        <Star className="w-3 h-3 fill-current" />
                        {s.rating}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
