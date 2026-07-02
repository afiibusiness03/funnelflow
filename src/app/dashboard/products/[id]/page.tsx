'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/helpers'
import { ArrowLeft, Loader2, Save, Package } from 'lucide-react'

const schema = z.object({
  name:        z.string().min(2, 'Product name is required'),
  asin:        z.string().optional(),
  sku:         z.string().optional(),
  product_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  image_url:   z.string().url('Must be a valid URL').optional().or(z.literal('')),
  is_active:   z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading]       = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)
  const [platform, setPlatform]       = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return
        setPlatform(data.platform)
        reset({
          name:        data.name,
          asin:        data.asin ?? '',
          sku:         data.sku ?? '',
          product_url: data.product_url ?? '',
          image_url:   data.image_url ?? '',
          is_active:   data.is_active,
        })
      })
      .finally(() => setLoading(false))
  }, [params.id, reset])

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const res = await fetch(`/api/products/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard/products'), 1000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard/products" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Edit Product</h2>
            <p className="text-slate-400 text-xs capitalize">{platform} product</p>
          </div>
        </div>

        {serverError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg px-4 py-3 text-sm">{serverError}</div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg px-4 py-3 text-sm">✅ Product updated! Redirecting…</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Product Name <span className="text-red-400">*</span>
            </label>
            <input
              {...register('name')}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                errors.name ? 'border-red-500' : 'border-slate-600'
              )}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* ASIN / SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">ASIN <span className="text-slate-500 font-normal">(optional)</span></label>
              <input {...register('asin')} placeholder="B08XYZ..." className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">SKU <span className="text-slate-500 font-normal">(optional)</span></label>
              <input {...register('sku')} placeholder="MY-SKU-001" className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm" />
            </div>
          </div>

          {/* Product URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Product URL <span className="text-slate-500 font-normal">(optional)</span></label>
            <input
              {...register('product_url')}
              placeholder="https://amazon.com/dp/..."
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm',
                errors.product_url ? 'border-red-500' : 'border-slate-600'
              )}
            />
            {errors.product_url && <p className="text-red-400 text-xs mt-1">{errors.product_url.message}</p>}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Image URL <span className="text-slate-500 font-normal">(optional)</span></label>
            <input
              {...register('image_url')}
              placeholder="https://..."
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm',
                errors.image_url ? 'border-red-500' : 'border-slate-600'
              )}
            />
            {errors.image_url && <p className="text-red-400 text-xs mt-1">{errors.image_url.message}</p>}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
            <div>
              <p className="text-slate-200 text-sm font-medium">Active</p>
              <p className="text-slate-500 text-xs mt-0.5">Inactive products cannot be used in new campaigns</p>
            </div>
            <input type="checkbox" {...register('is_active')} className="sr-only peer" id="is_active" />
            <label htmlFor="is_active" className="w-10 h-5 bg-slate-700 peer-checked:bg-green-600 rounded-full relative cursor-pointer transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition peer-checked:after:translate-x-5" />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/dashboard/products" className="px-4 py-2 text-slate-400 hover:text-white text-sm transition">Cancel</Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
