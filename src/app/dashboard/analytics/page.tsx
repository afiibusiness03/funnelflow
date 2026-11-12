import { getAccount } from '@/lib/security/access'
import { getMetrics, dailyChart } from '@/lib/analytics/metrics'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { conversionRate } from '@/lib/utils/helpers'
import StatsCard from '@/components/dashboard/StatsCard'
import { ScansChart, RatingChart, FunnelDropoffChart } from '@/components/dashboard/Charts'
import { QrCode, Mail, Star, TrendingUp, MessageSquare, Gift } from 'lucide-react'

export default async function AnalyticsPage() {
  const {supabase,profile}=await getAccount()
  const tenantId=profile.tenant_id
  const [metrics,{data:campaigns}]=await Promise.all([
    getMetrics(),supabase.from('campaigns').select('id,name,total_scans,total_completions,total_reviews_requested,status').eq('tenant_id',tenantId).neq('status','archived').order('total_scans',{ascending:false}).limit(10),
  ])
  const {scans30,scansPrev,completions30,completionsPrev,totalEmails}=metrics
  const deliveredClaims=metrics.statuses.delivered ?? 0
  const ratingDist={1:0,2:0,3:0,4:0,5:0,...metrics.ratings}
  const totalRatings=Object.values(ratingDist).reduce((a,b)=>a+b,0)
  const avgRating=totalRatings ? Object.entries(ratingDist).reduce((sum,[rating,count])=>sum+Number(rating)*count,0)/totalRatings : 0
  const scansData=dailyChart(metrics)
  const funnelData=[
    {step:'QR Scanned',count:scans30,rate:100},
    {step:'Claims Submitted',count:completions30,rate:conversionRate(completions30,scans30)},
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
