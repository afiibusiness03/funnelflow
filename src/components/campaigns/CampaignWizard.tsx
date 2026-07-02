'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/helpers'
import { Check, Loader2, Package, Gift, Settings, QrCode, ChevronRight } from 'lucide-react'
import type { Product, Promotion } from '@/types/database'

const schema = z.object({
  name:                     z.string().min(2, 'Campaign name is required'),
  product_id:               z.string().min(1, 'Please select a product'),
  promotion_id:             z.string().optional(),
  require_order_verify:     z.boolean().default(false),
  smart_routing:            z.boolean().default(true),
  smart_routing_threshold:  z.number().min(1).max(5).default(4),
  language:                 z.enum(['en','ar','fr','de','es','it','ja','zh']).default('en'),
  review_url:               z.string().url('Must be a valid URL').optional().or(z.literal('')),
  custom_thank_you_msg:     z.string().optional(),
})

type FormData = z.infer<typeof schema>

const STEPS = [
  { id: 1, label: 'Product',   icon: Package  },
  { id: 2, label: 'Promotion', icon: Gift     },
  { id: 3, label: 'Settings',  icon: Settings },
  { id: 4, label: 'Launch',    icon: QrCode   },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic (العربية)' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
]

interface CampaignWizardProps {
  products:   Product[]
  promotions: Promotion[]
}

export default function CampaignWizard({ products, promotions }: CampaignWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      require_order_verify: false,
      smart_routing: true,
      smart_routing_threshold: 4,
      language: 'en',
    },
  })

  const selectedProductId   = watch('product_id')
  const selectedPromotionId = watch('promotion_id')
  const smartRouting        = watch('smart_routing')
  const threshold           = watch('smart_routing_threshold')

  const selectedProduct   = products.find(p => p.id === selectedProductId)
  const selectedPromotion = promotions.find(p => p.id === selectedPromotionId)

  const nextStep = async () => {
    let fields: (keyof FormData)[] = []
    if (step === 1) fields = ['name', 'product_id']
    const valid = await trigger(fields)
    if (valid) setStep(s => Math.min(s + 1, 4))
  }

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
      router.push(`/dashboard/campaigns/${json.data.id}`)
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, idx) => {
          const Icon = s.icon
          const done    = step > s.id
          const current = step === s.id
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                  done    && 'bg-purple-600 border-purple-600',
                  current && 'bg-purple-600/20 border-purple-500',
                  !done && !current && 'bg-slate-800 border-slate-600'
                )}>
                  {done
                    ? <Check className="w-4 h-4 text-white" />
                    : <Icon className={cn('w-4 h-4', current ? 'text-purple-400' : 'text-slate-500')} />
                  }
                </div>
                <span className={cn('text-xs', current ? 'text-white' : 'text-slate-500')}>{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn('flex-1 h-px mx-2 mb-4', step > s.id ? 'bg-purple-600' : 'bg-slate-700')} />
              )}
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">

          {serverError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">
              {serverError}
            </div>
          )}

          {/* ── Step 1: Product ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-semibold text-lg mb-1">Name your campaign</h2>
                <p className="text-slate-400 text-sm">Choose a product and give this campaign a name.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Campaign Name <span className="text-red-400">*</span>
                </label>
                <input
                  {...register('name')}
                  placeholder="e.g. Yoga Mat — Summer 2025"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                    errors.name ? 'border-red-500' : 'border-slate-600'
                  )}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Product <span className="text-red-400">*</span>
                </label>
                {products.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
                    <p className="text-slate-400 text-sm mb-2">No products yet.</p>
                    <a href="/dashboard/products/new" className="text-purple-400 text-sm hover:underline">
                      Add a product first →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setValue('product_id', product.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition',
                          selectedProductId === product.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                        )}
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.image_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            : <Package className="w-4 h-4 text-slate-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium truncate', selectedProductId === product.id ? 'text-white' : 'text-slate-300')}>
                            {product.name}
                          </p>
                          <p className="text-slate-500 text-xs capitalize">
                            {product.platform} · {product.marketplace}
                            {product.asin ? ` · ${product.asin}` : ''}
                          </p>
                        </div>
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 flex-shrink-0',
                          selectedProductId === product.id ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                        )} />
                      </button>
                    ))}
                  </div>
                )}
                {errors.product_id && <p className="text-red-400 text-xs mt-1">{errors.product_id.message}</p>}
              </div>
            </div>
          )}

          {/* ── Step 2: Promotion ────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-semibold text-lg mb-1">Choose a promotion</h2>
                <p className="text-slate-400 text-sm">What will you offer customers after they complete the funnel?</p>
              </div>

              <div className="space-y-2">
                {/* No promotion option */}
                <button
                  type="button"
                  onClick={() => setValue('promotion_id', '')}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition',
                    !selectedPromotionId
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className={cn('text-sm font-medium', !selectedPromotionId ? 'text-white' : 'text-slate-300')}>
                      No promotion
                    </p>
                    <p className="text-slate-500 text-xs">Collect emails and feedback only</p>
                  </div>
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 ml-auto flex-shrink-0',
                    !selectedPromotionId ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                  )} />
                </button>

                {promotions.map((promo) => (
                  <button
                    key={promo.id}
                    type="button"
                    onClick={() => setValue('promotion_id', promo.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition',
                      selectedPromotionId === promo.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', selectedPromotionId === promo.id ? 'text-white' : 'text-slate-300')}>
                        {promo.name}
                      </p>
                      <p className="text-slate-500 text-xs capitalize">{promo.type.replace('_', ' ')}</p>
                    </div>
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex-shrink-0',
                      selectedPromotionId === promo.id ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                    )} />
                  </button>
                ))}

                {promotions.length === 0 && (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
                    <p className="text-slate-400 text-sm mb-1">No promotions yet.</p>
                    <a href="/dashboard/promotions/new" target="_blank" className="text-purple-400 text-sm hover:underline">
                      Create a promotion →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Settings ─────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-semibold text-lg mb-1">Funnel settings</h2>
                <p className="text-slate-400 text-sm">Configure how your funnel behaves.</p>
              </div>

              {/* Order Verification */}
              <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div>
                  <p className="text-slate-200 text-sm font-medium">Require order verification</p>
                  <p className="text-slate-500 text-xs mt-0.5">Customer must enter their order ID to proceed</p>
                </div>
                <input type="checkbox" {...register('require_order_verify')} className="sr-only peer" id="order_verify" />
                <label htmlFor="order_verify" className="w-10 h-5 bg-slate-700 peer-checked:bg-purple-600 rounded-full relative cursor-pointer transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition peer-checked:after:translate-x-5" />
              </div>

              {/* Smart Routing */}
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-200 text-sm font-medium">Smart routing</p>
                    <p className="text-slate-500 text-xs mt-0.5">Only ask happy customers for a review</p>
                  </div>
                  <input type="checkbox" {...register('smart_routing')} className="sr-only peer" id="smart_routing" />
                  <label htmlFor="smart_routing" className="w-10 h-5 bg-slate-700 peer-checked:bg-purple-600 rounded-full relative cursor-pointer transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition peer-checked:after:translate-x-5" />
                </div>

                {smartRouting && (
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Ask for review if rating is ≥</p>
                    <div className="flex gap-2">
                      {[3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setValue('smart_routing_threshold', val)}
                          className={cn(
                            'px-4 py-1.5 rounded-lg text-sm font-medium border transition',
                            threshold === val
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                          )}
                        >
                          {val}★+
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Review URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Review page URL <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  {...register('review_url')}
                  placeholder="https://amazon.com/review/create-review?asin=..."
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-sm',
                    errors.review_url ? 'border-red-500' : 'border-slate-600'
                  )}
                />
                {errors.review_url && <p className="text-red-400 text-xs mt-1">{errors.review_url.message}</p>}
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Funnel language</label>
                <select
                  {...register('language')}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              {/* Thank you message */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Thank you message <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <textarea
                  {...register('custom_thank_you_msg')}
                  rows={2}
                  placeholder="Thank you for your purchase! We hope you love your product."
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none text-sm"
                />
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Launch ──────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-white font-semibold text-lg mb-1">Review & Launch</h2>
                <p className="text-slate-400 text-sm">Everything looks good? Launch your campaign.</p>
              </div>

              <div className="space-y-3">
                {/* Product */}
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-400 text-sm">Product</span>
                  </div>
                  <span className="text-white text-sm font-medium truncate max-w-[200px]">
                    {selectedProduct?.name ?? '—'}
                  </span>
                </div>

                {/* Promotion */}
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-400 text-sm">Promotion</span>
                  </div>
                  <span className="text-white text-sm font-medium">
                    {selectedPromotion?.name ?? 'None'}
                  </span>
                </div>

                {/* Smart routing */}
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-400 text-sm">Smart routing</span>
                  </div>
                  <span className="text-white text-sm font-medium">
                    {watch('smart_routing') ? `Ask if rating ≥ ${threshold}★` : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-purple-300 text-sm">
                  🚀 Your QR code will be generated instantly. Print it on your insert cards and start collecting reviews!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(s - 1, 1))}
            className={cn(
              'px-4 py-2 text-slate-400 hover:text-white text-sm transition',
              step === 1 && 'invisible'
            )}
          >
            ← Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Launching…' : '🚀 Launch Campaign'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
