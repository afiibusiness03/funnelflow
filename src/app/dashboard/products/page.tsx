import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus } from 'lucide-react'
import ProductList from '@/components/products/ProductList'


export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('tenant_id, tenant:tenants(max_products, plan)')
    .eq('id', user.id).single()
  if (!userData) redirect('/login')

  const { data: products, count } = await supabase
    .from('products')
    .select('*, campaigns(count)', { count: 'exact' })
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = (userData.tenant as unknown) as { max_products: number; plan: string } | null
  const maxProducts = tenant?.max_products ?? 1
  const atLimit = (count ?? 0) >= maxProducts

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">
            {count ?? 0} of {maxProducts === 999999 ? 'unlimited' : maxProducts} products
          </p>
        </div>
        {atLimit && (
          <div className="bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs px-3 py-1.5 rounded-lg">
            Plan limit reached —{' '}
            <Link href="/dashboard/settings/billing" className="underline">Upgrade</Link>
          </div>
        )}
      </div>

      {/* Empty state */}
      {(!products || products.length === 0) && (
        <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-white font-semibold mb-1">No products yet</h3>
          <p className="text-slate-400 text-sm mb-5 max-w-xs mx-auto">
            Add your first product to start creating campaigns with QR codes.
          </p>
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      )}

      {/* Products Grid */}
      {products && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ProductList products={products as any} />

          {/* Add new card */}
          {!atLimit && (
            <Link
              href="/dashboard/products/new"
              className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all min-h-[160px] group"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-700 group-hover:bg-purple-500/20 flex items-center justify-center transition">
                <Plus className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition" />
              </div>
              <span className="text-slate-400 group-hover:text-slate-300 text-sm font-medium transition">Add Product</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
