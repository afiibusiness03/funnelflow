import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { QrCode, Plus } from 'lucide-react'
import CampaignCard from '@/components/campaigns/CampaignCard'

export default async function CampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) redirect('/login')

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, product:products(*), promotion:promotions(*)')
    .eq('tenant_id', userData.tenant_id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {(!campaigns || campaigns.length === 0) && (
        <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-white font-semibold mb-1">No campaigns yet</h3>
          <p className="text-slate-400 text-sm mb-5 max-w-xs mx-auto">
            Create your first campaign to generate a QR code and start collecting reviews.
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Create Campaign
          </Link>
        </div>
      )}

      {campaigns && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign as any} />
          ))}
          <Link
            href="/dashboard/campaigns/new"
            className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all min-h-[200px] group"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-700 group-hover:bg-purple-500/20 flex items-center justify-center transition">
              <Plus className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition" />
            </div>
            <span className="text-slate-400 group-hover:text-slate-300 text-sm font-medium transition">New Campaign</span>
          </Link>
        </div>
      )}
    </div>
  )
}
