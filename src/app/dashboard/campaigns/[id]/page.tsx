'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/helpers'
import { ArrowLeft, Loader2, Save, Package, Gift, Settings } from 'lucide-react'
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

export default function EditCampaignPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [campaignData, setCampaignData] = useState<any>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const smartRouting = watch('smart_routing')
  const threshold    = watch('smart_routing_threshold')

  // Load current campaign data
  useEffect(() => {
    fetch(`/api/campaigns/${params.id}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return
        setCampaignData(data)
        reset({
          name:                    data.name,
          require_order_verify:    data.require_order_verify,
          smart_routing:           data.smart_routing,
          smart_routing_threshold: data.smart_routing_threshold,
          language:                data.language,
          review_url:              data.review_url ?? '',
          custom_thank_you_msg:    data.custom_thank_you_msg ?? '',
        })
      })
      .finally(() => setLoading(false))
  }, [params.id, reset])

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const res = await fetch(`/api/campaigns/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setServerError(json.error ?? 'Something went wrong'); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard/campaigns'), 1000)
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
                placeholder="Thank you for your purchase!"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
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
    </div>
  )
}
