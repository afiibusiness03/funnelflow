'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'
import { ArrowLeft, Loader2, Package } from 'lucide-react'

const schema = z.object({
  name:        z.string().min(2, 'Product name is required'),
  platform:    z.enum(['amazon','ebay','walmart','etsy','shopify','woocommerce','bigcommerce','custom']),
  marketplace: z.string().default('US'),
  asin:        z.string().optional(),
  sku:         z.string().optional(),
  product_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  image_url:   z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

const PLATFORMS = [
  { value: 'amazon',      label: 'Amazon' },
  { value: 'ebay',        label: 'eBay' },
  { value: 'walmart',     label: 'Walmart' },
  { value: 'etsy',        label: 'Etsy' },
  { value: 'shopify',     label: 'Shopify' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'bigcommerce', label: 'BigCommerce' },
  { value: 'custom',      label: 'Custom / Other' },
]

const MARKETPLACES = ['US','UK','CA','DE','FR','IT','ES','JP','AU','MX','IN','AE','SA']

export default function NewProductPage() {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { platform: 'amazon', marketplace: 'US' },
  })

  const platform = watch('platform')

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: userData } = await supabase
      .from('users').select('tenant_id').eq('id', user.id).single()
    if (!userData) return

    const { error } = await supabase.from('products').insert({
      tenant_id:   userData.tenant_id,
      name:        data.name,
      platform:    data.platform,
      marketplace: data.marketplace,
      asin:        data.asin || null,
      sku:         data.sku  || null,
      product_url: data.product_url || null,
      image_url:   data.image_url   || null,
      is_active:   true,
    })

    if (error) { setServerError(error.message); return }
    router.push('/dashboard/products')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/dashboard/products" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Add New Product</h2>
            <p className="text-slate-400 text-xs">Fill in the details for your product</p>
          </div>
        </div>

        {serverError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              {...register('name')}
              placeholder="e.g. Premium Yoga Mat - Blue"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                errors.name ? 'border-red-500' : 'border-slate-600'
              )}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Platform + Marketplace */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Platform <span className="text-red-400">*</span>
              </label>
              <select
                {...register('platform')}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Marketplace</label>
              <select
                {...register('marketplace')}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              >
                {MARKETPLACES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ASIN (Amazon only) */}
          {platform === 'amazon' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                ASIN
                <span className="text-slate-500 font-normal ml-1">(Amazon Standard Identification Number)</span>
              </label>
              <input
                {...register('asin')}
                placeholder="e.g. B08N5WRWNW"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>
          )}

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              SKU <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              {...register('sku')}
              placeholder="e.g. YM-BLUE-L"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
          </div>

          {/* Product URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Product Listing URL <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              {...register('product_url')}
              placeholder="https://amazon.com/dp/..."
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                errors.product_url ? 'border-red-500' : 'border-slate-600'
              )}
            />
            {errors.product_url && <p className="text-red-400 text-xs mt-1">{errors.product_url.message}</p>}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Product Image URL <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              {...register('image_url')}
              placeholder="https://..."
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                errors.image_url ? 'border-red-500' : 'border-slate-600'
              )}
            />
            {errors.image_url && <p className="text-red-400 text-xs mt-1">{errors.image_url.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard/products"
              className="px-4 py-2 text-slate-400 hover:text-white text-sm transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
