'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/helpers'
import { Check, Loader2, Package, Gift, Settings, QrCode, ChevronRight, Search, Trash2 } from 'lucide-react'
import type { Product, Promotion } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

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

  const [localProducts, setLocalProducts] = useState<Product[]>(products)
  const [localPromotions, setLocalPromotions] = useState<Promotion[]>(promotions)

  const [showNewProductModal, setShowNewProductModal] = useState(false)
  const [showNewPromoModal, setShowNewPromoModal] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [savingPromo, setSavingPromo] = useState(false)

  const [newProduct, setNewProduct] = useState({
    name: '',
    platform: 'amazon',
    marketplace: 'US',
    asin: '',
    review_url: '',
    image_url: '',
  })

  const [newPromo, setNewPromo] = useState({
    name: '',
    type: 'coupon_code',
    coupon_code: '',
    download_url: '',
    delivery_message: '',
  })

  const handleCreateProduct = async () => {
    if (!newProduct.name) return
    setSavingProduct(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error ?? 'Failed to create product')
      } else if (json.data) {
        const createdProd = json.data as unknown as Product
        setLocalProducts(prev => [...prev, createdProd])
        setSelectedProductIds(prev => [...prev, createdProd.id])
        setValue('product_id', createdProd.id)
        setShowNewProductModal(false)
        setNewProduct({ name: '', platform: 'amazon', marketplace: 'US', asin: '', review_url: '', image_url: '' })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingProduct(false)
    }
  }

  const handleCreatePromo = async () => {
    if (!newPromo.name) return
    setSavingPromo(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      if (!userData?.tenant_id) return

      const { data, error } = await supabase
        .from('promotions')
        .insert({
          tenant_id: userData.tenant_id,
          name: newPromo.name,
          type: newPromo.type,
          coupon_code: newPromo.type === 'coupon_code' ? newPromo.coupon_code || null : null,
          download_url: newPromo.type === 'digital_download' ? newPromo.download_url || null : null,
          delivery_message: newPromo.delivery_message || null,
        })
        .select()
        .single()

      if (error) {
        alert(error.message)
      } else if (data) {
        setLocalPromotions(prev => [...prev, data as unknown as Promotion])
        setValue('promotion_id', data.id)
        setShowNewPromoModal(false)
        setNewPromo({ name: '', type: 'coupon_code', coupon_code: '', download_url: '', delivery_message: '' })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingPromo(false)
    }
  }

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

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    return products && products.length > 0 ? [products[0].id] : []
  })
  const [showSelectProductModal, setShowSelectProductModal] = useState(false)
  const [tempModalSelectedIds, setTempModalSelectedIds] = useState<string[]>([])
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [productWizardError, setProductWizardError] = useState<string | null>(null)

  const selectedProductId   = watch('product_id') || selectedProductIds[0]
  const selectedPromotionId = watch('promotion_id')
  const smartRouting        = watch('smart_routing')
  const threshold           = watch('smart_routing_threshold')

  const selectedProduct   = localProducts.find(p => p.id === selectedProductId)
  const selectedPromotion = localPromotions.find(p => p.id === selectedPromotionId)

  const handleRemoveWizardProduct = (id: string) => {
    setProductWizardError(null)
    if (selectedProductIds.length <= 1) {
      setProductWizardError('A campaign must have at least 1 product selected.')
      setTimeout(() => setProductWizardError(null), 4000)
      return
    }
    const next = selectedProductIds.filter(pid => pid !== id)
    setSelectedProductIds(next)
    setValue('product_id', next[0])
  }

  const handleOpenWizardSelectModal = () => {
    setTempModalSelectedIds([...selectedProductIds])
    setModalSearchQuery('')
    setShowSelectProductModal(true)
  }

  const toggleWizardModalProductCheck = (pid: string) => {
    if (tempModalSelectedIds.includes(pid)) {
      tempModalSelectedIds.length > 1 && setTempModalSelectedIds(tempModalSelectedIds.filter(id => id !== pid))
    } else {
      setTempModalSelectedIds([...tempModalSelectedIds, pid])
    }
  }

  const handleSaveWizardModalSelection = () => {
    if (tempModalSelectedIds.length === 0) {
      alert('Please select at least 1 product.')
      return
    }
    setSelectedProductIds([...tempModalSelectedIds])
    setValue('product_id', tempModalSelectedIds[0])
    setShowSelectProductModal(false)
  }

  const nextStep = async () => {
    let fields: (keyof FormData)[] = []
    if (step === 1) fields = ['name']
    const valid = await trigger(fields)
    if (selectedProductIds.length === 0) {
      alert('Please select at least one product')
      return
    }
    if (valid) setStep(s => Math.min(s + 1, 4))
  }

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        product_id: selectedProductIds[0] || data.product_id,
        product_ids: selectedProductIds,
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
                <p className="text-slate-400 text-sm">Choose one or more products and give this campaign a name.</p>
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

              <div className="space-y-4 p-5 bg-slate-900 rounded-xl border border-slate-700/80 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="block text-sm font-bold text-white">
                        Campaign Product(s) <span className="text-red-400">*</span>
                      </label>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30 whitespace-nowrap flex-shrink-0">
                        {selectedProductIds.length} Included
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Only selected products will appear in this campaign's customer funnel.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenWizardSelectModal}
                      className="text-xs text-purple-300 hover:text-white font-bold bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 px-3 py-1.5 rounded-lg transition"
                    >
                      + Select from Catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewProductModal(true)}
                      className="text-xs text-slate-300 hover:text-white font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg transition"
                    >
                      + Create Product
                    </button>
                  </div>
                </div>

                {productWizardError && (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg px-3 py-2 text-xs font-semibold">
                    ⚠️ {productWizardError}
                  </div>
                )}

                {/* List of Attached Products */}
                <div className="space-y-2.5">
                  {localProducts
                    .filter((prod) => selectedProductIds.includes(prod.id))
                    .map((prod) => (
                      <div
                        key={prod.id}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-purple-500/60 shadow-sm transition"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {prod.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-white font-bold text-sm block truncate">{prod.name}</span>
                          <span className="text-slate-300 font-medium text-xs block mt-0.5">
                            <span className="text-purple-400 capitalize">{prod.platform}</span> · {prod.marketplace}
                            {prod.asin ? ` · ASIN: ${prod.asin}` : ''}
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 bg-purple-600 text-white rounded-md shadow-xs">
                          Included
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWizardProduct(prod.id)}
                          title="Remove product from campaign"
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
                {errors.product_id && <p className="text-red-400 text-xs mt-1">{errors.product_id.message}</p>}
              </div>
            </div>
          )}

          {/* ── Step 2: Promotion ────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-white font-semibold text-lg mb-1">Choose a promotion</h2>
                  <p className="text-slate-400 text-sm">What will you offer customers after they complete the funnel?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewPromoModal(true)}
                  className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-500/20 transition flex-shrink-0"
                >
                  + Add New Promotion
                </button>
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

                {localPromotions.map((promo) => (
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

                {localPromotions.length === 0 && (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
                    <p className="text-slate-400 text-sm mb-1">No promotions yet.</p>
                    <button
                      type="button"
                      onClick={() => setShowNewPromoModal(true)}
                      className="text-purple-400 text-sm hover:underline font-medium"
                    >
                      Create a promotion →
                    </button>
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

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mt-5">
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

      {/* New Product Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-white font-semibold text-lg mb-4">Add New Product</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Yoga Mat Premium"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Platform</label>
                  <select
                    value={newProduct.platform}
                    onChange={(e) => setNewProduct({ ...newProduct, platform: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  >
                    <option value="amazon">Amazon</option>
                    <option value="shopify">Shopify</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Marketplace</label>
                  <input
                    type="text"
                    placeholder="US, UK, DE, etc."
                    value={newProduct.marketplace}
                    onChange={(e) => setNewProduct({ ...newProduct, marketplace: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">ASIN / Product ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. B00XXXXXX"
                  value={newProduct.asin}
                  onChange={(e) => setNewProduct({ ...newProduct, asin: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amazon Direct Review Link <span className="text-purple-400 font-normal">(recommended)</span></label>
                <p className="text-slate-400 text-[11px] mb-1">Directs happy buyers straight to this product's Amazon review page.</p>
                <input
                  type="url"
                  placeholder="https://www.amazon.com/review/create-review?asin=..."
                  value={newProduct.review_url}
                  onChange={(e) => setNewProduct({ ...newProduct, review_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={newProduct.image_url}
                  onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowNewProductModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingProduct || !newProduct.name}
                onClick={handleCreateProduct}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-sm px-4 py-2 rounded-lg transition"
              >
                {savingProduct && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Promotion Modal */}
      {showNewPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-white font-semibold text-lg mb-4">Add New Promotion</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Promotion Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 20% Off Coupon"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                <select
                  value={newPromo.type}
                  onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                >
                  <option value="coupon_code">Coupon Code</option>
                  <option value="digital_download">Digital Download</option>
                </select>
              </div>
              {newPromo.type === 'coupon_code' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Coupon Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. SUMMER20"
                    value={newPromo.coupon_code}
                    onChange={(e) => setNewPromo({ ...newPromo, coupon_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Download URL *</label>
                  <input
                    type="text"
                    placeholder="https://example.com/ebook.pdf"
                    value={newPromo.download_url}
                    onChange={(e) => setNewPromo({ ...newPromo, download_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Delivery Message (Optional)</label>
                <textarea
                  placeholder="e.g. Here is your code! Thank you for the support."
                  value={newPromo.delivery_message}
                  onChange={(e) => setNewPromo({ ...newPromo, delivery_message: e.target.value })}
                  className="w-full h-20 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowNewPromoModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPromo || !newPromo.name || (newPromo.type === 'coupon_code' ? !newPromo.coupon_code : !newPromo.download_url)}
                onClick={handleCreatePromo}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-sm px-4 py-2 rounded-lg transition"
              >
                {savingPromo && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Products from Catalog Popup Modal */}
      {showSelectProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/90 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Add Products to Campaign</h3>
                  <p className="text-slate-400 text-xs">Select products from your catalog to include in this campaign</p>
                </div>
              </div>
              {tempModalSelectedIds.length > 0 && (
                <span className="text-xs font-bold px-3 py-1 bg-purple-600 text-white rounded-full shadow-xs whitespace-nowrap flex-shrink-0">
                  {tempModalSelectedIds.length} Selected
                </span>
              )}
            </div>

            {/* Live Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                placeholder="Search product name, ASIN, SKU..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
              />
            </div>

            {/* Products List with Checkboxes (Showing ONLY unadded products) */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(() => {
                const unaddedProducts = localProducts.filter((prod) => !selectedProductIds.includes(prod.id))
                const filtered = unaddedProducts.filter((prod) => {
                  const q = modalSearchQuery.toLowerCase().trim()
                  return (
                    !q ||
                    prod.name.toLowerCase().includes(q) ||
                    (prod.asin && prod.asin.toLowerCase().includes(q)) ||
                    (prod.sku && prod.sku.toLowerCase().includes(q))
                  )
                })

                if (unaddedProducts.length === 0) {
                  return (
                    <div className="py-8 px-4 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                      <p className="text-slate-300 font-medium text-sm">
                        🎉 All products in your catalog are already added to this campaign!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSelectProductModal(false)
                          setShowNewProductModal(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/20"
                      >
                        + Create a Brand New Product
                      </button>
                    </div>
                  )
                }

                if (filtered.length === 0) {
                  return (
                    <div className="py-6 text-center text-slate-400 text-xs font-medium">
                      No matching unadded products found for "{modalSearchQuery}".
                    </div>
                  )
                }

                return filtered.map((prod) => {
                  const isChecked = tempModalSelectedIds.includes(prod.id)
                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleWizardModalProductCheck(prod.id)}
                      className={cn(
                        'flex items-center gap-3.5 p-3.5 rounded-xl border transition cursor-pointer',
                        isChecked
                          ? 'bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-900/20'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="w-4.5 h-4.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {prod.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-purple-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-white font-bold text-sm block truncate">{prod.name}</span>
                        <span className="text-slate-300 font-semibold text-xs block mt-0.5">
                          <span className="text-purple-400 font-bold capitalize">{prod.platform}</span> · {prod.marketplace}
                          {prod.asin ? ` · ASIN: ${prod.asin}` : ''}
                        </span>
                      </div>
                      {isChecked && (
                        <span className="text-xs font-bold px-2.5 py-1 bg-purple-600 text-white rounded-md shadow-xs">
                          Selected
                        </span>
                      )}
                    </div>
                  )
                })
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowSelectProductModal(false)
                  setShowNewProductModal(true)
                }}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition"
              >
                + Create New Product
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSelectProductModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={tempModalSelectedIds.length === 0}
                  onClick={handleSaveWizardModalSelection}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition shadow-lg shadow-purple-600/20"
                >
                  Add Selected Products ({tempModalSelectedIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
