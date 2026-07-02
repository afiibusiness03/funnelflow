import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { conversionRate } from '@/lib/utils/helpers'
import { ScansChart, RatingChart, FunnelDropoffChart } from '@/components/dashboard/Charts'
import StatsCard from '@/components/dashboard/StatsCard'
import { QrCode, TrendingUp, Star, Mail } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function CampaignAnalyticsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, product:products(*)')
    .eq('id', params.id)
    .single()

  if (!campaign) notFound()

  const { data: ratingRows } = await supabase
    .from('funnel_submissions')
    .select('rating')
    .eq('campaign_id', params.id)
    .not('rating', 'is', null)

  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ratingRows?.forEach((r) => { if (r.rating) ratingDist[r.rating] = (ratingDist[r.rating] ?? 0) + 1 })

  const scansData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000)
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      scans: 0,
      completions: 0,
    }
  })

  const funnelData = [
    { step: 'QR Scanned',       count: campaign.total_scans,       rate: 100 },
    { step: 'Funnel Completed', count: campaign.total_completions,  rate: conversionRate(campaign.total_completions, campaign.total_scans) },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href={`/dashboard/campaigns/${campaign.id}`} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Back to Campaign
      </Link>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Scans"       value={campaign.total_scans.toLocaleString()}       icon={QrCode}      iconColor="text-purple-400" iconBg="bg-purple-500/20" />
        <StatsCard title="Completions"       value={campaign.total_completions.toLocaleString()}  icon={TrendingUp}  iconColor="text-cyan-400"   iconBg="bg-cyan-500/20" />
        <StatsCard title="Conversion Rate"   value={`${conversionRate(campaign.total_completions, campaign.total_scans)}%`} icon={TrendingUp} iconColor="text-green-400" iconBg="bg-green-500/20" />
        <StatsCard title="Reviews Requested" value={campaign.total_reviews_requested.toLocaleString()} icon={Star} iconColor="text-yellow-400" iconBg="bg-yellow-500/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScansChart data={scansData} />
        <RatingChart data={ratingDist} />
      </div>

      <FunnelDropoffChart data={funnelData} />
    </div>
  )
}