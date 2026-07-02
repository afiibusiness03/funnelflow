'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/helpers'
import { ArrowLeft, Loader2, Save, Gift, Tag } from 'lucide-react'

const schema = z.object({
  name:             z.string().min(2, 'Name is required'),
  coupon_code:      z.string().optional(),
  discount_type:    z.enum(['percentage', 'fixed_value']).optional(),
  discount_value:   z.string().optional(),
  discount_currency: z.string().optional(),
  download_url:     z.string().url('Must be valid URL').optional().or(z.literal('')),
  download_expires_hours: z.number().optional(),
  gift_card_value:  z.string().optional(),
  gift_card_currency: z.string().optional(),
  delivery_message: z.string().optional(),
  auto_deliver:     z.boolean(),
  is_active:        z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function EditPromotionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading]         = useState(true)
  const [serverError, setServerError]   = useState<string | null>(null)
  const [success, setSuccess]           = useState(false)
  const [promoType, setPromoType]       = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const discountType  = watch('discount_type')
  const discountValue = watch('discount_value')

  useEffect(() => {
    fetch(`/api/promotions/${params.id}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return
        setPromoType(data.type)
        reset({
          name:             data.name,
          coupon_code:      data.coupon_code ?? '',
          discount_type:    data.discount_type ?? 'percentage',
          discount_value:   data.discount_value?.toString() ?? '',
          discount_currency: data.discount_currency ?? 'USD',
          download_url:     data.download_url ?? '',
          download_expires_hours: data.download_expires_hours ?? 48,
          gift_card_value:  data.gift_card_value?.toString() ?? '',
          gift_card_currency: data.gift_card_currency ?? 'USD',
          delivery_message: data.delivery_message ?? '',
          auto_deliver:     data.auto_deliver,
          is_active:        data.is_active,
        })
      })
      .finally(() => setLoading(false))
  }, [params.id, reset])

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const res = await fetch(`/api/promotions/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        discount_value: data.discount_value ? parseFloat(data.discount_value) : null,
        gift_card_value: data.gift_card_value ? parseFloat(data.gift_card_value) : null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard/promotions'), 1000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard/promotions" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Back to Promotions
      </Link>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Gift className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Edit Promotion</h2>
            <p className="text-slate-400 text-xs capitalize">{promoType.replace('_', ' ')} promotion</p>
          </div>
        </div>

        {serverError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg px-4 py-3 text-sm">{serverError}</div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg px-4 py-3 text-sm">✅ Promotion updated! Redirecting…</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Promotion Name <span className="text-red-400">*</span></label>
            <input
              {...register('name')}
              className={cn('w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition', errors.name ? 'border-red-500' : 'border-slate-600')}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Coupon code fields */}
          {promoType === 'coupon_code' && (
            <div className="space-y-4">
              {/* Discount type toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Discount Type</label>
                <div className="flex rounded-lg overflow-hidden border border-slate-600">
                  <button type="button" onClick={() => setValue('discount_type', 'percentage')}
                    className={cn('flex-1 py-2.5 text-sm font-medium transition flex items-center justify-center gap-1.5',
                      discountType === 'percentage' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white')}>
                    <span className="font-bold">%</span> Percentage
                  </button>
                  <button type="button" onClick={() => setValue('discount_type', 'fixed_value')}
                    className={cn('flex-1 py-2.5 text-sm font-medium transition flex items-center justify-center gap-1.5',
                      discountType === 'fixed_value' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white')}>
                    <span className="font-bold">$</span> Fixed Value
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {discountType === 'percentage' ? 'Discount %' : 'Discount Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                      {discountType === 'percentage' ? '%' : '$'}
                    </span>
                    <input {...register('discount_value')} type="number" min="0"
                      max={discountType === 'percentage' ? '100' : undefined}
                      step={discountType === 'percentage' ? '1' : '0.01'}
                      className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
                  </div>
                </div>
                {discountType === 'fixed_value' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Currency</label>
                    <select {...register('discount_currency')} className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition">
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="SAR">SAR (﷼)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Preview */}
              {discountValue && (
                <div className="bg-slate-900 border border-purple-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
                  <Tag className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Customer will see</p>
                    <p className="text-white font-semibold text-sm">
                      {discountType === 'percentage' ? `Get ${discountValue}% Off` : `Get $${discountValue} Off`}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Coupon Code</label>
                <input {...register('coupon_code')} placeholder="e.g. THANKYOU10"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono uppercase" />
              </div>
            </div>
          )}

          {/* Digital download */}
          {promoType === 'digital_download' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Download URL</label>
                <input {...register('download_url')} placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Link expires after (hours)</label>
                <input {...register('download_expires_hours', { valueAsNumber: true })} type="number" min={1} max={8760}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
              </div>
            </div>
          )}

          {/* Gift card */}
          {promoType === 'gift_card' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Value ($)</label>
                <input {...register('gift_card_value')} type="number" min="0" step="0.01" placeholder="25.00"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Currency</label>
                <select {...register('gift_card_currency')} className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>
          )}

          {/* Delivery message */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Delivery Message <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea {...register('delivery_message')} rows={3}
              placeholder="Thank you for your purchase! Here's your exclusive reward..."
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none" />
          </div>

          {/* Auto deliver + Active */}
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div>
                <p className="text-slate-200 text-sm font-medium">Auto-deliver</p>
                <p className="text-slate-500 text-xs mt-0.5">Send reward automatically after funnel completes</p>
              </div>
              <input type="checkbox" {...register('auto_deliver')} className="sr-only peer" id="auto_deliver" />
              <label htmlFor="auto_deliver" className="w-10 h-5 bg-slate-700 peer-checked:bg-purple-600 rounded-full relative cursor-pointer transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition peer-checked:after:translate-x-5" />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div>
                <p className="text-slate-200 text-sm font-medium">Active</p>
                <p className="text-slate-500 text-xs mt-0.5">Inactive promotions won't be offered to customers</p>
              </div>
              <input type="checkbox" {...register('is_active')} className="sr-only peer" id="is_active" />
              <label htmlFor="is_active" className="w-10 h-5 bg-slate-700 peer-checked:bg-green-600 rounded-full relative cursor-pointer transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition peer-checked:after:translate-x-5" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/dashboard/promotions" className="px-4 py-2 text-slate-400 hover:text-white text-sm transition">Cancel</Link>
            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition">
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
