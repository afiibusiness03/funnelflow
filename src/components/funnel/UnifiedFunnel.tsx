'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/helpers'
import { readApiResponse } from '@/lib/utils/api-response'
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
const makeSchema = (requireVerify: boolean, requiresAddress: boolean, platform: string) =>
  z.object({
    selectedProductIds: z.array(z.string()).min(1, 'Please select at least one product.'),
    rating: z.number().int().min(1, 'Please choose a rating from 1 to 5 stars.').max(5),
    email: z.string().email('Please enter a valid email address'),
    name: z.string().optional(),
    orderId: z.string().optional(),
    feedbackText: z.string().min(10, 'Please write at least 10 characters of feedback to help us improve.').max(4000),
    shippingAddress: z.object({ line1: z.string().trim().max(200), city: z.string().trim().max(100), zip: z.string().trim().max(32), country: z.string().trim().max(64) }).optional(),
  }).superRefine((data, ctx) => {
    if (requiresAddress) {
      for (const field of ['line1', 'city', 'zip', 'country'] as const) {
        if (!data.shippingAddress?.[field]) ctx.addIssue({ code: 'custom', message: 'Required for shipping', path: ['shippingAddress', field] })
      }
    }
    if (requireVerify && (!data.orderId || data.orderId.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter your order ID',
        path: ['orderId'],
      })
    } else if (requireVerify && !validateOrderIdFormat(data.orderId ?? '', platform)) {
      ctx.addIssue({ code: 'custom', message: getOrderIdError(platform), path: ['orderId'] })
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

  const activeProducts = productsList

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any>(null)
  const [couponCopied, setCouponCopied] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const serverErrorRef = useRef<HTMLDivElement>(null)

  const platform = campaign.product?.platform ?? 'amazon'
  const requireVerify = campaign.require_order_verify

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(makeSchema(requireVerify, !!campaign.promotion?.requires_address, platform)),
    shouldFocusError: false,
    defaultValues: {
      feedbackText: '',
      selectedProductIds: [],
      rating: 0,
    },
  })

  const selectedProductIds = useWatch({ control, name: 'selectedProductIds' })
  const rating = useWatch({ control, name: 'rating' })

  function revealError(element: HTMLElement) {
    const input = element.matches('input, textarea') ? element : element.querySelector<HTMLElement>('input, textarea')
    const focusTarget = input ?? element
    focusTarget.focus({ preventScroll: true })
    element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  const onInvalid = (fieldErrors: FieldErrors<FormData>) => {
    // Follow visual form order, including custom product/rating groups.
    requestAnimationFrame(() => {
      const fields = formRef.current?.querySelectorAll<HTMLElement>('[data-error-field]') ?? []
      for (const element of fields) {
        const path = element.dataset.errorField!.split('.')
        const error = path.reduce<any>((value, key) => value?.[key], fieldErrors)
        if (error) { revealError(element); break }
      }
    })
  }

  useEffect(() => {
    if (serverError && serverErrorRef.current) revealError(serverErrorRef.current)
  }, [serverError])

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

    setSubmitting(true)

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
          platform: campaign.product?.platform,
          marketplace: campaign.product?.marketplace,
          rating: data.rating,
          feedbackText: data.feedbackText,
          promotionId: campaign.promotion?.id,
          shippingAddress: campaign.promotion?.requires_address ? data.shippingAddress : undefined,
          selectedProductIds: data.selectedProductIds,
        }),
      })

      const json = await readApiResponse(res)
      if (json.success !== true) throw new Error('Submission was not confirmed. Please contact the seller before trying again.')

      setSubmissionResult({
        ...json,
        couponCode: json.coupon_code ?? json.data?.coupon_code ?? null,
        feedbackText: data.feedbackText,
        email: data.email,
      })
      setCompleted(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
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
          if (url?.startsWith('https://') && !reviewUrls.includes(url)) reviewUrls.push(url)
        }
      })
    } else if (campaign.review_url && /^https:\/\//i.test(campaign.review_url)) {
      reviewUrls.push(campaign.review_url)
    }

    if (reviewUrls.length > 0) {
      reviewUrls.forEach(url => window.open(url, '_blank', 'noopener,noreferrer'))
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

        {submissionResult?.manualReview && (
          <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Your claim has been saved. The seller will review your order and arrange any approved reward.
          </p>
        )}

        {submissionResult?.deliveryStatus === 'failed' && (
          <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Your claim has been saved, but we could not confirm that your reward email was sent. Please contact the seller; you do not need to submit another claim.
          </p>
        )}

        {submissionResult?.deliveryStatus === 'paused' && (
          <p role="status" className="mb-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            Your claim has been saved. Reward emails are temporarily paused, so no reward email has been sent. You do not need to submit again.
          </p>
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
          * Offer valid with eligible purchases. Proof of purchase required. Offer not dependent on feedback sentiment. Subject to availability.
        </p>
      </div>
    )
  }

  return (
      <form ref={formRef} noValidate onSubmit={event => { void handleSubmit(onSubmit, onInvalid)(event) }} className="space-y-5">
        <fieldset data-error-field="selectedProductIds" tabIndex={-1} className="min-w-0 scroll-mt-6" aria-describedby="product-selection-help product-selection-error">
          <legend className="text-slate-900 font-bold text-base">What did you purchase? <span className="text-red-500">*</span></legend>
          <p id="product-selection-help" className="mt-1 text-slate-500 text-xs leading-relaxed">Choose one or more products to include in your review.</p>
          <div className="flex flex-wrap items-center justify-between gap-2 my-3">
            <span aria-live="polite" className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{selectedProductIds.length} selected</span>
            <button type="button" disabled={!selectedProductIds.length} onClick={() => setValue('selectedProductIds', [], { shouldValidate: true })} className="min-h-11 text-xs text-slate-500 underline underline-offset-4 disabled:opacity-40">Clear selection</button>
          </div>
          <div className="grid grid-cols-2 min-[375px]:grid-cols-3 gap-2 sm:gap-3">
            {activeProducts.map((prod) => {
              const isSelected = selectedProductIds.includes(prod.id)
              return (
                <label key={prod.id} className={cn(
                  'relative min-w-0 cursor-pointer rounded-xl border p-2 transition focus-within:ring-2 focus-within:ring-indigo-400 focus-within:ring-offset-2',
                  isSelected ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-400'
                )}>
                  <input type="checkbox" aria-label={prod.name} checked={isSelected}
                    aria-invalid={!!errors.selectedProductIds} aria-describedby="product-selection-error"
                    onChange={(event) => setValue('selectedProductIds', event.target.checked ? [...selectedProductIds, prod.id] : selectedProductIds.filter(id => id !== prod.id), { shouldValidate: true })}
                    className="absolute right-3 top-3 z-10 h-5 w-5 cursor-pointer accent-indigo-600" />
                  <span className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-50 p-2">
                    {prod.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.image_url} alt="" width={160} height={160} loading="lazy" className="h-full w-full object-contain" />
                    ) : <Package aria-hidden="true" className="h-10 w-10 text-slate-400" />}
                  </span>
                  <span className="mt-2 block break-words text-xs font-semibold leading-relaxed text-slate-900">{prod.name}</span>
                </label>
              )
            })}
          </div>
          {!activeProducts.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No products are available for this campaign. Please contact the seller.</p>}
          {errors.selectedProductIds && <p id="product-selection-error" role="alert" className="mt-2 text-xs font-medium text-red-600">{errors.selectedProductIds.message}</p>}
        </fieldset>
        {serverError && (
          <div ref={serverErrorRef} tabIndex={-1} role="alert" className="scroll-mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">
            {serverError}
          </div>
        )}

        {/* 2. Customer Details */}
        <div className="space-y-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
          <h3 className="text-slate-900 font-extrabold text-sm">1. Customer Information</h3>

          {/* Order ID */}
          {requireVerify && (
            <div data-error-field="orderId" className="scroll-mt-6">
              <label htmlFor="review-order" className="block text-xs font-bold text-slate-700 mb-1">
                Order ID <span className="text-red-500">*</span>
              </label>
              <input
                {...register('orderId')}
                id="review-order"
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
          <div data-error-field="email" className="scroll-mt-6">
            <label htmlFor="review-email" className="block text-xs font-bold text-slate-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              id="review-email"
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
            <label htmlFor="review-name" className="block text-xs font-bold text-slate-700 mb-1">
              Your Name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              {...register('name')}
              id="review-name"
              placeholder="John Smith"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 transition text-sm font-medium"
            />
          </div>
        </div>

        {/* 3. Rating & Review */}
        <div className="space-y-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
          <h3 className="text-slate-900 font-extrabold text-sm">2. Rating & Review</h3>

          {/* Ratings are empty until the customer explicitly chooses one. */}
          <fieldset data-error-field="rating" tabIndex={-1} className="min-w-0 scroll-mt-6" aria-describedby="rating-hint rating-error">
            <legend className="mb-2 text-xs font-bold text-slate-700">Overall Experience <span className="text-red-500">*</span></legend>
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
              {[1, 2, 3, 4, 5].map(star => (
                <label key={star} className="relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg transition hover:bg-amber-50 focus-within:ring-2 focus-within:ring-indigo-400">
                  <input name="rating" type="radio" value={star} checked={rating === star} onChange={() => setValue('rating', star, { shouldValidate: true, shouldDirty: true })} aria-label={star === 1 ? '1 star' : star + ' stars'} className="sr-only" />
                  <Star aria-hidden="true" className={cn('h-7 w-7 sm:h-8 sm:w-8', rating >= star ? 'fill-amber-400 text-amber-400' : 'fill-none text-slate-300')} />
                </label>
              ))}
            </div>
            <p id="rating-hint" aria-live="polite" className="mt-2 text-xs text-slate-500">{rating ? rating + ' of 5 stars selected' : 'No rating yet — choose from 1 to 5 stars.'}</p>
            {errors.rating && <p id="rating-error" role="alert" className="mt-1 text-xs font-medium text-red-600">{errors.rating.message}</p>}
          </fieldset>

          {/* Review Text */}
          <div data-error-field="feedbackText" className="scroll-mt-6">
            <label htmlFor="review-feedback" className="block text-xs font-bold text-slate-700 mb-1">
              Your Review / Feedback <span className="text-red-500">* (Min 10 characters)</span>
            </label>
            <textarea
              {...register('feedbackText')}
              id="review-feedback"
              rows={3}
              placeholder="What stood out? What could be better?"
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

        {campaign.promotion?.requires_address && <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-slate-800">Shipping address</legend>
          <p className="text-xs text-slate-500">Your seller needs this address to send your physical reward.</p>
          {([{ key: 'line1', label: 'Street address', auto: 'address-line1' }, { key: 'city', label: 'City', auto: 'address-level2' }, { key: 'zip', label: 'Postal code', auto: 'postal-code' }, { key: 'country', label: 'Country', auto: 'country-name' }] as const).map(field => <label data-error-field={`shippingAddress.${field.key}`} key={field.key} className="block scroll-mt-6 text-xs font-bold text-slate-700">
            {field.label}
            <input {...register(`shippingAddress.${field.key}`)} autoComplete={field.auto} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900" />
            {errors.shippingAddress?.[field.key] && <span className="text-red-500">{errors.shippingAddress[field.key]?.message}</span>}
          </label>)}
        </fieldset>}

        {/* 4. Single Submit Button */}
        <button
          type="submit"
          disabled={submitting || !activeProducts.length}
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
  )
}
