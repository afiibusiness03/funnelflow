import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Gift, Plus } from 'lucide-react'
import PromotionList from '@/components/promotions/PromotionList'


export default async function PromotionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('tenant_id, tenant:tenants(max_promotions)')
    .eq('id', user.id).single()
  if (!userData) redirect('/login')

  const { data: promotions, count } = await supabase
    .from('promotions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = userData.tenant as { max_promotions: number } | null
  const maxPromos = tenant?.max_promotions ?? 1
  const atLimit = (count ?? 0) >= maxPromos

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          {count ?? 0} of {maxPromos === 999999 ? 'unlimited' : maxPromos} promotions
        </p>
        {atLimit && (
          <div className="bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs px-3 py-1.5 rounded-lg">
            Plan limit reached — <Link href="/dashboard/settings/billing" className="underline">Upgrade</Link>
          </div>
        )}
      </div>

      {/* Empty state */}
      {(!promotions || promotions.length === 0) && (
        <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Gift className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-white font-semibold mb-1">No promotions yet</h3>
          <p className="text-slate-400 text-sm mb-5 max-w-xs mx-auto">
            Create a promotion to offer customers coupons, downloads, or gifts via your funnel.
          </p>
          <Link
            href="/dashboard/promotions/new"
            className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Create Promotion
          </Link>
        </div>
      )}

      {/* Promotions list */}
      {promotions && promotions.length > 0 && (
        <div className="space-y-4">
          <PromotionList promotions={promotions as any} />
          {!atLimit && (
            <Link
              href="/dashboard/promotions/new"
              className="flex items-center gap-2 px-5 py-4 bg-slate-800/30 border border-dashed border-slate-700 rounded-xl hover:border-purple-500/50 text-slate-400 hover:text-slate-300 transition text-sm"
            >
              <Plus className="w-4 h-4" /> Add Another Promotion
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
