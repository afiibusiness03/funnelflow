'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'
import { ArrowLeft, Loader2, Tag, Download, CreditCard, MapPin, Mail, Gift } from 'lucide-react'

const schema = z.object({
  name:             z.string().min(2, 'Name is required'),
  type:             z.enum(['coupon_code','digital_download','gift_card','physical_gift','email_only']),
  coupon_code:      z.string().optional(),
  discount_type:    z.enum(['percentage','fixed_value']).default('percentage'),
  discount_value:   z.string().optional(),
  discount_currency: z.string().default('USD'),
  download_url:     z.string().url('Must be a valid URL').optional().or(z.literal('')),
  download_expires_hours: z.number().min(1).max(8760).default(48),
  gift_card_value:  z.string().optional(),
  gift_card_currency: z.string().default('USD'),
  requires_address: z.boolean().default(false),
  auto_deliver:     z.boolean().default(true),
  delivery_message: z.string().optional(),
  max_redemptions:  z.string().optional(),
})

type FormData = z.infer<typeof schema>

const TYPE_OPTIONS = [
  { value: 'coupon_code',      label: 'Coupon Code',      icon: Tag,       desc: 'Share a discount code after purchase' },
  { value: 'digital_download', label: 'Digital Download', icon: Download,  desc: 'PDF guide, warranty card, or ebook' },
  { value: 'gift_card',        label: 'Gift Card',        icon: CreditCard,desc: 'Amazon or Visa gift card value' },
  { value: 'physical_gift',    label: 'Physical Gift',    icon: MapPin,    desc: 'Collect shipping address and mail a gift' },
  { value: 'email_only',       label: 'Email Only',       icon: Mail,      desc: 'Collect email without offering a promotion' },
]

export default function NewPromotionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'coupon_code', auto_deliver: true, download_expires_hours: 48, gift_card_currency: 'USD', discount_type: 'percentage', discount_currency: 'USD' },
  })

  const selectedType   = watch('type')
  const discountType   = watch('discount_type')
  const discountValue  = watch('discount_value')
  const couponCode     = watch('coupon_code')

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: userData } = await supabase
      .from('users').select('tenant_id').eq('id', user.id).single()
    if (!userData) return

    const { error } = await supabase.from('promotions').insert({
      tenant_id:        userData.tenant_id,
      name:             data.name,
      type:             data.type,
      coupon_code:      data.coupon_code        || null,
      discount_type:    data.type === 'coupon_code' ? data.discount_type : null,
      discount_value:   data.discount_value ? parseFloat(data.discount_value) : null,
      discount_currency: data.type === 'coupon_code' && data.discount_type === 'fixed_value' ? data.discount_currency : null,
      download_url:     data.download_url        || null,
      download_expires_hours: data.download_expires_hours,
      gift_card_value:  data.gift_card_value ? parseFloat(data.gift_card_value) : null,
      gift_card_currency: data.gift_card_currency,
      requires_address: data.requires_address,
      auto_deliver:     data.auto_deliver,
      delivery_message: data.delivery_message    || null,
      max_redemptions:  data.max_redemptions ? parseInt(data.max_redemptions) : null,
      is_active:        true,
    })

    if (error) { setServerError(error.message); return }
    router.push('/dashboard/promotions')
    router.refresh()
  }

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
            <h2 className="text-white font-semibold">Create Promotion</h2>
            <p className="text-slate-400 text-xs">What will you offer customers after they scan your QR?</p>
          </div>
        </div>

        {serverError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg px-4 py-3 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Promotion Name <span className="text-red-400">*</span>
            </label>
            <input
              {...register('name')}
              placeholder="e.g. 10% Off Next Purchase"
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                errors.name ? 'border-red-500' : 'border-slate-600'
              )}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Promotion Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const selected = selectedType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('type', opt.value as FormData['type'])}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition',
                      selected
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 flex-shrink-0', selected ? 'text-purple-400' : 'text-slate-400')} />
                    <div>
                      <p className={cn('text-sm font-medium', selected ? 'text-white' : 'text-slate-300')}>{opt.label}</p>
                      <p className="text-slate-500 text-xs">{opt.desc}</p>
                    </div>
                    <div className={cn(
                      'ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0',
                      selected ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                    )} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Coupon Code fields */}
          {selectedType === 'coupon_code' && (
            <div className="space-y-4">
              {/* Discount type toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Discount Type</label>
                <div className="flex rounded-lg overflow-hidden border border-slate-600">
                  <button
                    type="button"
                    onClick={() => setValue('discount_type', 'percentage')}
                    className={cn(
                      'flex-1 py-2.5 text-sm font-medium transition flex items-center justify-center gap-1.5',
                      discountType === 'percentage'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    )}
                  >
                    <span className="text-base font-bold">%</span> Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('discount_type', 'fixed_value')}
                    className={cn(
                      'flex-1 py-2.5 text-sm font-medium transition flex items-center justify-center gap-1.5',
                      discountType === 'fixed_value'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    )}
                  >
                    <span className="text-base font-bold">$</span> Fixed Value
                  </button>
                </div>
              </div>

              {/* Discount amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {discountType === 'percentage' ? 'Discount %' : 'Discount Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                      {discountType === 'percentage' ? '%' : '$'}
                    </span>
                    <input
                      {...register('discount_value')}
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? '100' : undefined}
                      step={discountType === 'percentage' ? '1' : '0.01'}
                      placeholder={discountType === 'percentage' ? '10' : '5.00'}
                      className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>

                {discountType === 'fixed_value' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Currency</label>
                    <select
                      {...register('discount_currency')}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="SAR">SAR (﷼)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Live preview */}
              {discountValue && (
                <div className="bg-slate-900 border border-purple-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Tag className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Customer will see</p>
                    <p className="text-white font-semibold text-sm">
                      {discountType === 'percentage'
                        ? `Get ${discountValue}% Off`
                        : `Get $${discountValue} Off`}
                    </p>
                  </div>
                </div>
              )}

              {/* Coupon code input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Coupon Code</label>
                <input
                  {...register('coupon_code')}
                  placeholder="e.g. THANKYOU10"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono uppercase"
                />
                {couponCode && (
                  <p className="text-slate-500 text-xs mt-1">This code will be sent in the reward email</p>
                )}
              </div>
            </div>
          )}

          {/* Digital Download fields */}
          {selectedType === 'digital_download' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Download URL</label>
                <input
                  {...register('download_url')}
                  placeholder="https://..."
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                    errors.download_url ? 'border-red-500' : 'border-slate-600'
                  )}
                />
                {errors.download_url && <p className="text-red-400 text-xs mt-1">{errors.download_url.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Link expires after (hours)</label>
                <input
                  {...register('download_expires_hours', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={8760}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>
            </div>
          )}

          {/* Gift Card fields */}
          {selectedType === 'gift_card' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Value ($)</label>
                <input
                  {...register('gift_card_value')}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Currency</label>
                <select
                  {...register('gift_card_currency')}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>
          )}

          {/* Physical Gift */}
          {selectedType === 'physical_gift' && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-300 text-sm">
                We&apos;ll collect the customer&apos;s shipping address during the funnel. You&apos;ll receive it in the Claims Center.
              </p>
            </div>
          )}

          {/* Delivery Message */}
          {selectedType !== 'email_only' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Delivery Message <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                {...register('delivery_message')}
                rows={3}
                placeholder="Thank you for your purchase! Here's your exclusive discount..."
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none"
              />
            </div>
          )}

          {/* Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <h3 className="text-slate-300 text-sm font-medium">Settings</h3>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-slate-300 text-sm">Auto-deliver</p>
                <p className="text-slate-500 text-xs">Send promotion automatically after funnel completes</p>
              </div>
              <input type="checkbox" {...register('auto_deliver')} className="sr-only peer" />
              <div className="w-10 h-5 bg-slate-700 peer-checked:bg-purple-600 rounded-full relative transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition peer-checked:after:translate-x-5" />
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Max Redemptions <span className="text-slate-500 font-normal">(leave blank for unlimited)</span>
              </label>
              <input
                {...register('max_redemptions')}
                type="number"
                min="1"
                placeholder="Unlimited"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/dashboard/promotions" className="px-4 py-2 text-slate-400 hover:text-white text-sm transition">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Saving…' : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
