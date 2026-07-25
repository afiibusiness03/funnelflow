'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/helpers'
import { Loader2, Package, Star, CheckCircle, Mail } from 'lucide-react'

// ─── Platform Order ID Rules ──────────────────────────────────────────────
const PLATFORM_ORDER_RULES: Record<string, { regex: RegExp; placeholder: string; errorMsg: string }> = {
  amazon:  { regex: /^\d{3}-\d{7}-\d{7}$/, placeholder: '114-1234567-1234567', errorMsg: 'Please enter a valid Amazon order ID (e.g. 114-1234567-1234567)' },
  ebay:    { regex: /^\d{9,18}$/, placeholder: '123456789012', errorMsg: 'Please enter a valid eBay order number (9-18 digits)' },
  walmart: { regex: /^\d{13,14}$/, placeholder: '1234567890123', errorMsg: 'Please enter a valid Walmart order number (13-14 digits)' },
  etsy:    { regex: /^\d{10}$/, placeholder: '1234567890', errorMsg: 'Please enter a valid Etsy order number (10 digits)' },
  shopify: { regex: /^#?\d{4,10}$/, placeholder: '#1234', errorMsg: 'Please enter a valid Shopify order number' },
}

function validateOrderIdFormat(orderId: string, platform: string): boolean {
  const rule = PLATFORM_ORDER_RULES[platform.toLowerCase()]
  if (!rule) return orderId.trim().length >= 3
  return rule.regex.test(orderId.trim())
}

function getOrderIdPlaceholder(platform: string): string {
  return PLATFORM_ORDER_RULES[platform.toLowerCase()]?.placeholder ?? 'Your order ID'
}

function getOrderIdError(platform: string): string {
  return (
    PLATFORM_ORDER_RULES[platform.toLowerCase()]?.errorMsg ??
    'Please enter a valid order ID (minimum 3 characters)'
  )
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const makeSchema = (requireVerify: boolean) =>
  z.object({
    email: z.string().email('Please enter a valid email address'),
    name: z.string().optional(),
    orderId: z.string().optional(),
    feedbackText: z.string().min(10, 'Please write at least 10 characters of feedback to help us improve.'),
  }).superRefine((data, ctx) => {
    if (requireVerify && (!data.orderId || data.orderId.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter your order ID',
        path: ['orderId'],
      })
    }
  })

type FormData = z.infer<ReturnType<typeof makeSchema>>

interface ProductItem {
  id: string
  name: string
  image_url: string | null
  platform?: string
  marketplace?: string
  review_url?: string | null
}

interface UnifiedFunnelProps {
  campaign: {
    id: string
    name: string
    require_order_verify: boolean
    smart_routing: boolean
    smart_routing_threshold: number
    custom_thank_you_msg: string | null
    review_url: string | null
    product: ProductItem | null
    products?: ProductItem[]
    promotion: { id: string; type: string; delivery_message: string | null; requires_address: boolean; auto_deliver: boolean } | null
    tenant: { name: string; logo_url: string | null; brand_color: string } | null
  }
  brandColor: string
}

export default function UnifiedFunnel({ campaign, brandColor }: UnifiedFunnelProps) {
  const productsList = (campaign.products && campaign.products.length > 0)
    ? campaign.products
    : (campaign.product ? [campaign.product] : [])

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    productsList.map(p => p.id)
  )

  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any>(null)
  const [couponCopied, setCouponCopied] = useState(false)

  const platform = campaign.product?.platform ?? 'amazon'
  const requireVerify = campaign.require_order_verify

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(makeSchema(requireVerify)),
    defaultValues: {
      feedbackText: '',
    },
  })

  // Confetti effect when completed
  useEffect(() => {
    if (!completed) return
    const colors = [brandColor, '#a855f7', '#22d3ee', '#f59e0b', '#6366f1']
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: -10,
      r: Math.random() * 6 + 2,
      d: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
    }))

    let frame = 0
    let rafId: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let active = false
      particles.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        p.y += p.d
        p.x += Math.sin(frame * 0.05 + p.tilt) * 1.5
        if (p.y < canvas.height) active = true
      })
      frame++
      if (active) {
        rafId = requestAnimationFrame(animate)
      } else if (document.body.contains(canvas)) {
        try { document.body.removeChild(canvas) } catch (_) {}
      }
    }
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      if (document.body.contains(canvas)) {
        try { document.body.removeChild(canvas) } catch (_) {}
      }
    }
  }, [completed, brandColor])

  const onSubmit = async (data: FormData) => {
    setServerError(null)

    // 1. Verify Order ID format if required
    if (requireVerify) {
      const orderId = data.orderId?.trim() ?? ''
      if (!validateOrderIdFormat(orderId, platform)) {
        setServerError(getOrderIdError(platform))
        return
      }

      // Remote order verify call
      setSubmitting(true)
      try {
        const verifyRes = await fetch('/api/funnel/verify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, platform, campaignId: campaign.id }),
        })
        const verifyJson = await verifyRes.json()
        if (!verifyJson.verified) {
          setServerError(verifyJson.error ?? "We couldn't verify this order. Please check your order ID.")
          setSubmitting(false)
          return
        }
      } catch (err) {
        setServerError('Verification failed. Please try again.')
        setSubmitting(false)
        return
      }
    } else {
      setSubmitting(true)
    }

    try {
      // 2. Submit Funnel Submission
      const res = await fetch('/api/funnel/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          customerEmail: data.email,
          customerName: data.name,
          orderId: data.orderId ?? '',
          orderVerified: true,
          platform: campaign.product?.platform,
          marketplace: campaign.product?.marketplace,
          rating,
          feedbackText: data.feedbackText,
          promotionId: campaign.promotion?.id,
          selectedProductIds,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setServerError(json.error ?? 'Submission failed')
        return
      }

      setSubmissionResult({
        ...json,
        couponCode: json.coupon_code ?? json.data?.coupon_code ?? null,
        feedbackText: data.feedbackText,
        email: data.email,
      })
      setCompleted(true)
    } catch (err) {
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Multi-product Amazon review link copy & multi-tab opening
  const handleCopyAndRedirect = () => {
    if (submissionResult?.feedbackText) {
      navigator.clipboard.writeText(submissionResult.feedbackText)
    }

    const reviewUrls: string[] = []
    if (productsList.length > 0 && selectedProductIds.length > 0) {
      productsList.forEach(p => {
        if (selectedProductIds.includes(p.id)) {
          const url = p.review_url || campaign.review_url
          if (url && !reviewUrls.includes(url)) reviewUrls.push(url)
        }
      })
    } else if (campaign.review_url) {
      reviewUrls.push(campaign.review_url)
    }

    if (reviewUrls.length > 0) {
      reviewUrls.forEach(url => window.open(url, '_blank'))
    }
  }

  const showReviewRedirect = campaign.smart_routing
    ? rating >= campaign.smart_routing_threshold
    : true

  if (completed) {
    return (
      <div className="text-center py-6 animate-in fade-in duration-300">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md"
          style={{ backgroundColor: `${brandColor}20` }}
        >
          <CheckCircle className="w-8 h-8" style={{ color: brandColor }} />
        </div>

        <h2 className="text-slate-900 font-extrabold text-2xl mb-2 tracking-tight">
          {campaign.custom_thank_you_msg ?? "Thank you! 🎉"}
        </h2>

        {submissionResult?.couponCode && (
          <div className="bg-white border-2 border-dashed border-indigo-300 rounded-2xl px-6 py-5 mb-5 text-center shadow-sm">
            <p className="text-slate-500 text-xs mb-1.5 uppercase tracking-wider font-semibold">
              Your Reward Coupon Code
            </p>
            <p className="text-3xl font-black tracking-widest text-slate-900 font-mono mb-3">
              {submissionResult.couponCode}
            </p>
            <button
              onClick={() => {
                if (submissionResult.couponCode) {
                  navigator.clipboard.writeText(submissionResult.couponCode)
                  setCouponCopied(true)
                  setTimeout(() => setCouponCopied(false), 2000)
                }
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 mx-auto bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition"
            >
              {couponCopied ? '✓ Copied to clipboard!' : '📋 Copy code'}
            </button>
          </div>
        )}

        {showReviewRedirect && (
          <div className="mb-6 mt-3 space-y-2">
            <button
              onClick={handleCopyAndRedirect}
              className="w-full flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold py-4 px-6 rounded-2xl transition shadow-lg shadow-indigo-500/25 text-base"
            >
              📋 Copy Review & Continue to Amazon
            </button>
            <p className="text-xs text-slate-500 leading-relaxed px-2">
              Clicking this button copies your feedback to your clipboard and opens Amazon in a new tab so you can easily paste it!
            </p>
          </div>
        )}

        {submissionResult?.promotionDelivered && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-2.5 text-left">
            <Mail className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm font-medium">
              Your reward details have also been sent to <strong>{submissionResult.email}</strong>.
            </p>
          </div>
        )}

        <p className="text-slate-500 text-xs mt-6 leading-relaxed border-t border-slate-200 pt-4">
          * Limit one free item per household or customer. Offer valid with eligible purchases. Proof of purchase required. Offer not dependent on feedback sentiment. Subject to availability.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Multi-Product or Single Product Display */}
      {productsList.length > 1 ? (
        <div className="space-y-2.5">
          <label className="block text-slate-900 font-extrabold text-sm">
            Select the product(s) you purchased <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {productsList.map((prod) => {
              const isSelected = selectedProductIds.includes(prod.id)
              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    if (isSelected) {
                      if (selectedProductIds.length > 1) {
                        setSelectedProductIds(selectedProductIds.filter((id) => id !== prod.id))
                      }
                    } else {
                      setSelectedProductIds([...selectedProductIds, prod.id])
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl border transition cursor-pointer',
                    isSelected ? 'bg-indigo-50/80 border-[#6366f1] shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-4 h-4 rounded text-[#6366f1] focus:ring-[#6366f1] cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-300/60">
                    {prod.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <span className="text-slate-900 font-bold text-sm flex-1 truncate">{prod.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : productsList.length === 1 ? (
        <div className="flex items-center gap-3 p-3 bg-slate-100/80 rounded-2xl border border-slate-200/80">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs">
            {productsList[0].image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productsList[0].image_url} alt={productsList[0].name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-500 text-xs font-medium">Product Purchased</p>
            <p className="text-slate-900 font-bold text-sm truncate">{productsList[0].name}</p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
            {serverError}
          </div>
        )}

        {/* 2. Customer Details */}
        <div className="space-y-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
          <h3 className="text-slate-900 font-extrabold text-sm">1. Customer Information</h3>

          {/* Order ID */}
          {requireVerify && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Order ID <span className="text-red-500">*</span>
              </label>
              <input
                {...register('orderId')}
                placeholder={getOrderIdPlaceholder(platform)}
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 transition text-sm font-medium',
                  errors.orderId ? 'border-red-400' : 'border-slate-300'
                )}
              />
              {errors.orderId && <p className="text-red-500 text-xs mt-1 font-medium">{errors.orderId.message}</p>}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 transition text-sm font-medium',
                errors.email ? 'border-red-400' : 'border-slate-300'
              )}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Your Name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              {...register('name')}
              placeholder="John Smith"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 transition text-sm font-medium"
            />
          </div>
        </div>

        {/* 3. Rating & Review */}
        <div className="space-y-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
          <h3 className="text-slate-900 font-extrabold text-sm">2. Rating & Review</h3>

          {/* Star Rating */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Overall Experience</label>
            <div className="flex items-center gap-2 justify-center py-2 bg-white rounded-xl border border-slate-200">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition transform active:scale-125"
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition',
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'fill-slate-100 text-slate-300'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Your Review / Feedback <span className="text-red-500">* (Min 10 characters)</span>
            </label>
            <textarea
              {...register('feedbackText')}
              rows={3}
              placeholder="Tell us what you liked about your purchase..."
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 transition text-sm font-medium',
                errors.feedbackText ? 'border-red-400' : 'border-slate-300'
              )}
            />
            {errors.feedbackText && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.feedbackText.message}</p>
            )}
          </div>
        </div>

        {/* 4. Single Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold py-4 px-6 rounded-2xl transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-base tracking-wide"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Processing...</span>
            </>
          ) : (
            <span>Claim My Reward 🎁</span>
          )}
        </button>
      </form>
    </div>
  )
}
