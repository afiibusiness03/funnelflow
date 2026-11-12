'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/helpers'
import { ArrowLeft, Loader2, Save, Package, Gift, Settings, Trash2, Search, Filter, Check } from 'lucide-react'
import QRCodeDisplay from '@/components/campaigns/QRCodeDisplay'

const schema = z.object({
  name:                    z.string().min(2, 'Campaign name is required'),
  require_order_verify:    z.boolean(),
  smart_routing:           z.boolean(),
  smart_routing_threshold: z.number().min(1).max(5),
  language:                z.enum(['en','ar','fr','de','es','it','ja','zh']),
  review_url:              z.string().url('Must be a valid URL').optional().or(z.literal('')),
  custom_thank_you_msg:    z.string().optional(),
})
type FormData = z.infer<typeof schema>

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

export default function EditCampaignPage({ params: routeParams }: { params: Promise<{ id: string }> }) {
  const params = use(routeParams)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [campaignData, setCampaignData] = useState<any>(null)
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.amazinreview.com'

  // Product selection & search & quick add states
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [showSelectProductModal, setShowSelectProductModal] = useState(false)
  const [tempModalSelectedIds, setTempModalSelectedIds] = useState<string[]>([])
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [productError, setProductError] = useState<string | null>(null)
  const [showNewProductModal, setShowNewProductModal] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    platform: 'amazon',
    marketplace: 'US',
    asin: '',
    review_url: '',
    image_url: '',
  })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const smartRouting = useWatch({ control, name: 'smart_routing' })
  const threshold    = useWatch({ control, name: 'smart_routing_threshold' })

  // Load current campaign data + product catalog
  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${params.id}`).then(r => r.json()),
      fetch(`/api/products`).then(r => r.json()),
    ]).then(([{ data: cData }, { data: pList }]) => {
      if (pList) setAllProducts(pList)
      if (!cData) return

      setCampaignData(cData)

      // Calculate initial selected product IDs
      let initialPids: string[] = []
      if (Array.isArray(cData.products) && cData.products.length > 0) {
        initialPids = cData.products.map((p: any) => p.id)
      } else if (cData.product_id) {
        initialPids = [cData.product_id]
      }
      setSelectedProductIds(initialPids)

      reset({
        name:                    cData.name,
        require_order_verify:    cData.require_order_verify,
        smart_routing:           cData.smart_routing,
        smart_routing_threshold: cData.smart_routing_threshold,
        language:                cData.language,
        review_url:              cData.review_url ?? '',
        custom_thank_you_msg:    cData.custom_thank_you_msg ?? '',
      })
    }).finally(() => setLoading(false))
  }, [params.id, reset])

  const handleRemoveProduct = (pid: string) => {
    setProductError(null)
    if (selectedProductIds.length <= 1) {
      setProductError('A campaign must have at least 1 product selected.')
      setTimeout(() => setProductError(null), 4000)
      return
    }
    setSelectedProductIds(selectedProductIds.filter(id => id !== pid))
  }

  const handleOpenSelectModal = () => {
    setTempModalSelectedIds([])
    setModalSearchQuery('')
    setShowSelectProductModal(true)
  }

  const toggleModalProductCheck = (pid: string) => {
    if (tempModalSelectedIds.includes(pid)) {
      setTempModalSelectedIds(tempModalSelectedIds.filter(id => id !== pid))
    } else {
      setTempModalSelectedIds([...tempModalSelectedIds, pid])
    }
  }

  const handleSaveModalSelection = () => {
    if (tempModalSelectedIds.length === 0) {
      setShowSelectProductModal(false)
      return
    }
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...tempModalSelectedIds])))
    setShowSelectProductModal(false)
  }

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
      if (res.ok && json.data) {
        setAllProducts(prev => [json.data, ...prev])
        setSelectedProductIds(prev => [...prev, json.data.id])
        setShowNewProductModal(false)
        setNewProduct({
          name: '',
          platform: 'amazon',
          marketplace: 'US',
          asin: '',
          review_url: '',
          image_url: '',
        })
      } else {
        alert(json.error ?? 'Failed to create product')
      }
    } catch (err) {
      console.error('Create product error:', err)
    } finally {
      setSavingProduct(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    if (selectedProductIds.length === 0) {
      setServerError('Please select at least 1 product for this campaign.')
      return
    }
    setServerError(null)
    const payload = {
      ...data,
      product_ids: selectedProductIds,
    }
    const res = await fetch(`/api/campaigns/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard/campaigns'), 1000)
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleConfirmDeleteCampaign = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShowDeleteModal(false)
        router.push('/dashboard/campaigns')
        router.refresh()
      } else {
        alert('Failed to delete campaign')
      }
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/dashboard/campaigns" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Edit Campaign</h2>
              <p className="text-slate-400 text-xs">Update your campaign settings</p>
            </div>
          </div>

          {serverError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg px-4 py-3 text-sm">
              {serverError}
            </div>
          )}
          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg px-4 py-3 text-sm">
              ✅ Campaign updated! Redirecting…
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Campaign Name <span className="text-red-400">*</span>
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

            {/* Campaign Products Selection */}
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
                    Only selected products will appear in this campaign&apos;s customer funnel.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSelectModal}
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

              {productError && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg px-3 py-2 text-xs font-semibold">
                  ⚠️ {productError}
                </div>
              )}

              {/* List of Attached Products */}
              <div className="space-y-2.5">
                {allProducts
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
                        onClick={() => handleRemoveProduct(prod.id)}
                        title="Remove product from campaign"
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
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
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Campaign Fallback Review URL <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <p className="text-slate-400 text-xs mb-1.5">
                Each product uses its own review link from Products Catalog. This link is used only as a fallback.
              </p>
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
                placeholder="Thank you for your purchase!"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="text-red-400 hover:text-red-300 text-sm font-medium transition"
              >
                Delete Campaign
              </button>
              <div className="flex items-center gap-3">
                <Link href="/dashboard/campaigns" className="px-4 py-2 text-slate-400 hover:text-white text-sm transition">
                  Cancel
                </Link>
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
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          {campaignData && (
            <QRCodeDisplay
              campaignId={campaignData.id}
              shortCode={campaignData.qr_short_code}
              qrCodeUrl={`/api/campaigns/${campaignData.id}/qr?format=png&color=${encodeURIComponent(campaignData.custom_color ?? campaignData.tenant?.brand_color ?? '#6366f1')}`}
              brandColor={campaignData.custom_color ?? campaignData.tenant?.brand_color ?? '#6366f1'}
              funnelUrl={`${origin}/f/${campaignData.qr_short_code}`}
            />
          )}
        </div>
      </div>

      {/* Modern Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-semibold text-white">Delete Campaign</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Are you sure you want to permanently delete this campaign? All associated statistics, QR events, and feedback submissions will be erased permanently.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white font-medium text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDeleteCampaign}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition disabled:opacity-50 shadow-lg shadow-red-600/20"
              >
                {loading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-white font-semibold text-base">Add Product to Catalog</h3>
            </div>
            <div className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Bape Gray Hoodie"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Platform</label>
                  <select
                    value={newProduct.platform}
                    onChange={(e) => setNewProduct({ ...newProduct, platform: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  >
                    <option value="amazon">Amazon</option>
                    <option value="ebay">eBay</option>
                    <option value="shopify">Shopify</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ASIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. B00XXXXXX"
                    value={newProduct.asin}
                    onChange={(e) => setNewProduct({ ...newProduct, asin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Amazon Direct Review Link <span className="text-purple-400 font-normal">(recommended)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.amazon.com/review/create-review?asin=..."
                  value={newProduct.review_url}
                  onChange={(e) => setNewProduct({ ...newProduct, review_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newProduct.image_url}
                  onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
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
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-sm px-4 py-2 rounded-xl transition shadow-md shadow-purple-600/20"
              >
                {savingProduct && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save & Select Product
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
                const unaddedProducts = allProducts.filter((prod) => !selectedProductIds.includes(prod.id))
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
                      No matching unadded products found for &quot;{modalSearchQuery}&quot;.
                    </div>
                  )
                }

                return filtered.map((prod) => {
                  const isChecked = tempModalSelectedIds.includes(prod.id)
                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleModalProductCheck(prod.id)}
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
                  onClick={handleSaveModalSelection}
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
