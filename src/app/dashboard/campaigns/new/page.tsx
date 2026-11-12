import { getAccount } from '@/lib/security/access'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CampaignWizard from '@/components/campaigns/CampaignWizard'

export default async function NewCampaignPage() {
  const {supabase,profile:userData}=await getAccount()

  const [{ data: products }, { data: promotions }] = await Promise.all([
    supabase.from('products').select('*').eq('tenant_id', userData.tenant_id).eq('is_active', true),
    supabase.from('promotions').select('*').eq('tenant_id', userData.tenant_id).eq('is_active', true),
  ])

  return (
    <div className="space-y-6">
      <Link href="/dashboard/campaigns" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>
      <CampaignWizard products={products ?? []} promotions={promotions ?? []} />
    </div>
  )
}
