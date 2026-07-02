import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { conversionRate } from '@/lib/utils/helpers'
import StatsCard from '@/components/dashboard/StatsCard'
import { ScansChart, RatingChart, FunnelDropoffChart } from '@/components/dashboard/Charts'
import { QrCode, Mail, Star, TrendingUp, MessageSquare, Gift } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) redirect('/login')

  const tenantId = userData.tenant_id

  // ── Date ranges ───────────────────────────────────────────
  const now          = new Date()
  const last30       = new Date(now.getTime() - 30 * 86400000).toISOString()
  const last30Prev   = new Date(now.getTime() - 60 * 86400000).toISOString()

  // ── Parallel queries ──────────────────────────────────────
  const [
    { count: scans30 },
    { count: scansPrev },
    { count: completions30 },
    { count: completionsPrev },
    { count: totalEmails },
    { count: pendingClaims },
    { count: deliveredClaims },
    { data: ratingRows },
    { data: campaigns },
    { data: recentEvents },
  ] = await Promise.all([
    supabase.from('funnel_events').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('event_type', 'qr_scan').gte('created_at', last30),
    supabase.from('funnel_events').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('event_type', 'qr_scan')
      .gte('created_at', last30Prev).lt('created_at', last30),
    supabase.from('funnel_events').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('event_type', 'funnel_complete').gte('created_at', last30),
    supabase.from('funnel_events').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('event_type', 'funnel_complete')
      .gte('created_at', last30Prev).lt('created_at', last30),
    supabase.from('funnel_submissions').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase.from('funnel_submissions').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('claim_status', 'pending'),
    supabase.from('funnel_submissions').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('claim_status', 'delivered'),
    supabase.from('funnel_submissions').select('rating')
      .eq('tenant_id', tenantId).not('rating', 'is', null),
    supabase.from('campaigns').select('id, name, total_scans, total_completions, total_reviews_requested, status')
      .eq('tenant_id', tenantId).neq('status', 'archived').order('total_scans', { ascending: false }).limit(10),
    supabase.from('funnel_events').select('event_type, created_at')
      .eq('tenant_id', tenantId).gte('created_at', last30).order('created_at', { ascending: true }),
  ])

  // ── Rating distribution ───────────────────────────────────
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ratingRows?.forEach((r) => { if (r.rating) ratingDist[r.rating] = (ratingDist[r.rating] ?? 0) + 1 })
  const totalRatings = Object.values(ratingDist).reduce((a, b) => a + b, 0)
  const avgRating = totalRatings === 0 ? 0
    : Object.entries(ratingDist).reduce((sum, [s, c]) => sum + Number(s) * c, 0) / totalRatings

  // ── Scans over time (last 14 days) ────────────────────────
  const scansMap: Record<string, { scans: number; completions: number }> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    scansMap[key] = { scans: 0, completions: 0 }
  }
  recentEvents?.forEach((e) => {
    const key = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!scansMap[key]) return
    if (e.event_type === 'qr_scan')        scansMap[key].scans++
    if (e.event_type === 'funnel_complete') scansMap[key].completions++
  })
  const scansData = Object.entries(scansMap).map(([date, v]) => ({ date, ...v }))

  // ── Funnel drop-off ───────────────────────────────────────
  const stepCounts = { qr_scan: 0, step_1_complete: 0, step_3_complete: 0, funnel_complete: 0 }
  recentEvents?.forEach((e) => {
    if (e.event_type in stepCounts) stepCounts[e.event_type as keyof typeof stepCounts]++
  })
  const base = stepCounts.qr_scan || 1
  const funnelData = [
    { step: '1. QR Scanned',         count: stepCounts.qr_scan,          rate: 100 },
    { step: '2. Order Verified',      count: stepCounts.step_1_complete,  rate: Math.round(stepCounts.step_1_complete / base * 100) },
    { step: '3. Feedback Submitted',  count: stepCounts.step_3_complete,  rate: Math.round(stepCounts.step_3_complete / base * 100) },
    { step: '4. Funnel Completed',    count: stepCounts.funnel_complete,  rate: Math.round(stepCounts.funnel_complete / base * 100) },
  ]

  // ── Period-over-period changes ────────────────────────────
  const scanChange = scansPrev ? Math.round(((scans30 ?? 0) - (scansPrev ?? 0)) / (scansPrev ?? 1) * 100) : 0
  const convChange = completionsPrev
    ? conversionRate(completions30 ?? 0, scans30 ?? 1) - conversionRate(completionsPrev ?? 0, scansPrev ?? 1)
    : 0

  return (
    <div className="space-y-6">

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard title="Scans (30d)"      value={(scans30 ?? 0).toLocaleString()} icon={QrCode}        iconColor="text-purple-400" iconBg="bg-purple-500/20" change={scanChange} />
        <StatsCard title="Completions (30d)" value={(completions30 ?? 0).toLocaleString()} icon={TrendingUp}  iconColor="text-cyan-400"   iconBg="bg-cyan-500/20"   change={convChange} />
        <StatsCard title="Conv. Rate"        value={`${conversionRate(completions30 ?? 0, scans30 ?? 1)}%`} icon={TrendingUp}  iconColor="text-green-400"  iconBg="bg-green-500/20"  description="Last 30 days" />
        <StatsCard title="Emails Collected"  value={(totalEmails ?? 0).toLocaleString()} icon={Mail}         iconColor="text-blue-400"   iconBg="bg-blue-500/20"   description="All time" />
        <StatsCard title="Avg Rating"        value={avgRating.toFixed(1)} icon={Star}         iconColor="text-yellow-400" iconBg="bg-yellow-500/20" description={`${totalRatings} ratings`} />
        <StatsCard title="Delivered Promos"  value={(deliveredClaims ?? 0).toLocaleString()} icon={Gift}         iconColor="text-pink-400"   iconBg="bg-pink-500/20"   description="All time" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScansChart data={scansData} />
        <RatingChart data={ratingDist} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelDropoffChart data={funnelData} />

        {/* Campaign performance table */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Campaign Performance</h3>
          {(!campaigns || campaigns.length === 0) ? (
            <p className="text-slate-500 text-sm text-center py-8">No campaigns yet</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => {
                const rate = conversionRate(c.total_completions, c.total_scans)
                return (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-xs font-medium truncate">{c.name}</p>
                      <p className="text-slate-500 text-xs">{c.total_scans} scans · {rate}% conv.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                      <span className="text-slate-400">{c.total_completions} done</span>
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Feedback samples */}
      <FeedbackSamples tenantId={tenantId} supabase={supabase} />
    </div>
  )
}

async function FeedbackSamples({ tenantId, supabase }: any) {
  const { data: samples } = await supabase
    .from('funnel_submissions')
    .select('id, customer_email, rating, feedback_text, created_at')
    .eq('tenant_id', tenantId)
    .not('feedback_text', 'is', null)
    .neq('feedback_text', '')
    .order('created_at', { ascending: false })
    .limit(6)

  if (!samples?.length) return null

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-purple-400" /> Recent Feedback
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {samples.map((s: any) => (
          <div key={s.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${(s.rating ?? 0) >= star ? 'text-yellow-400 fill-current' : 'text-slate-600 fill-current'}`}
                  />
                ))}
              </div>
              <span className="text-slate-500 text-xs">{s.customer_email.split('@')[0]}</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{s.feedback_text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
