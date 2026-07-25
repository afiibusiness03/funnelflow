'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils/helpers'
import { Loader2, ShieldCheck, Package } from 'lucide-react'

// ─── Platform-specific Order ID format rules ───────────────────────────────────
const PLATFORM_ORDER_RULES: Record<string, {
  regex:       RegExp
  placeholder: string
  errorMsg:    string
}> = {
  amazon:  {
    regex:       /^\d{3}-\d{7}-\d{7}$/,
    placeholder: '114-1234567-1234567',
    errorMsg:    'Please enter a valid Amazon order ID (e.g. 114-1234567-1234567)',
  },
  ebay:    {
    regex:       /^\d{9,18}$/,
    placeholder: '123456789012',
    errorMsg:    'Please enter a valid eBay order number (9-18 digits)',
  },
  walmart: {
    regex:       /^\d{13,14}$/,
    placeholder: '1234567890123',
    errorMsg:    'Please enter a valid Walmart order number (13-14 digits)',
  },
  etsy:    {
    regex:       /^\d{10}$/,
    placeholder: '1234567890',
    errorMsg:    'Please enter a valid Etsy order number (10 digits)',
  },
  shopify: {
    regex:       /^#?\d{4,10}$/,
    placeholder: '#1234',
    errorMsg:    'Please enter a valid Shopify order number',
  },
}

function validateOrderIdFormat(orderId: string, platform: string): boolean {
  const rule = PLATFORM_ORDER_RULES[platform.toLowerCase()]
  if (!rule) return orderId.trim().length >= 3 // custom / unknown platforms
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
const baseSchema = z.object({
  email:   z.string().email('Please enter a valid email'),
  orderId: z.string().optional(),
  name:    z.string().optional(),
})

const makeSchema = (requireVerify: boolean) =>
  baseSchema.superRefine((data, ctx) => {
    if (requireVerify && (!data.orderId || data.orderId.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter your order ID',
        path: ['orderId'],
      })
    }
  })

type FormData = z.infer<typeof baseSchema>

// ─── Props ────────────────────────────────────────────────────────────────────
interface StepOrderVerifyProps {
  campaignId:    string
  platform:      string
  brandColor:    string
  productName:   string
  productImage:  string | null
  products?:     Array<{ id: string; name: string; image_url: string | null }>
  requireVerify: boolean
  onComplete: (data: { email: string; name?: string; orderId: string; verified: boolean; selectedProductIds?: string[] }) => void
}

export default function StepOrderVerify({
  campaignId, platform, brandColor, productName, productImage, products, requireVerify, onComplete,
}: StepOrderVerifyProps) {
  const [verifying,   setVerifying]   = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    products && products.length > 0 ? products.map((p) => p.id) : []
  )

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(makeSchema(requireVerify)),
  })

  const onSubmit = async (data: FormData) => {
    setVerifyError(null)

    if (requireVerify) {
      const orderId = data.orderId?.trim() ?? ''

      // ── Client-side format validation — no API call if invalid ────────────
      if (!validateOrderIdFormat(orderId, platform)) {
        setVerifyError(getOrderIdError(platform))
        return
      }

      // ── Remote verification ────────────────────────────────────────────────
      setVerifying(true)
      try {
        const res  = await fetch('/api/funnel/verify-order', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ orderId, platform, campaignId }),
        })
        const json = await res.json()

        if (!json.verified) {
          if (json.error === 'invalid_format') {
            setVerifyError(getOrderIdError(platform))
          } else {
            setVerifyError(json.error ?? "We couldn't verify this order. Please check your order ID.")
          }
          return
        }
      } finally {
        setVerifying(false)
      }
    }

    // Track step completion
    await fetch('/api/funnel/event', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ campaignId, eventType: 'step_1_complete', stepNumber: 1 }),
    })

    onComplete({ email: data.email, name: data.name, orderId: data.orderId ?? '', verified: true, selectedProductIds })
  }

  return (
    <div>
      {/* Product info / Multi-product Selection */}
      {products && products.length > 1 ? (
        <div className="mb-6 space-y-3">
          <p className="text-slate-800 font-bold text-sm">Select the product(s) you purchased:</p>
          <div className="space-y-2">
            {products.map((prod) => {
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
                    'flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer',
                    isSelected ? 'bg-indigo-50/70 border-indigo-500 shadow-sm' : 'bg-slate-50 border-slate-200'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {prod.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <span className="text-slate-800 font-semibold text-sm flex-1">{prod.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-xl">
          <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {productImage
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={productImage} alt={productName} className="w-full h-full object-cover" />
              : <Package className="w-6 h-6 text-slate-400" />
            }
          </div>
          <div>
            <p className="text-slate-500 text-xs">You purchased</p>
            <p className="text-slate-800 font-medium text-sm">{productName}</p>
          </div>
        </div>
      )}

      <h2 className="text-slate-800 font-bold text-xl mb-1">Get your reward 🎁</h2>
      <p className="text-slate-500 text-sm mb-6">
        {requireVerify
          ? 'Enter your order details to claim your exclusive offer.'
          : 'Enter your email to claim your exclusive offer.'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Your name <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            {...register('name')}
            placeholder="John Smith"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition text-sm"
            style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Email address <span className="text-red-400">*</span>
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className={cn(
              'w-full px-4 py-2.5 rounded-xl border text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition text-sm',
              errors.email ? 'border-red-300' : 'border-slate-200'
            )}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* Order ID */}
        {requireVerify && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Order ID <span className="text-red-400">*</span>
            </label>
            <input
              {...register('orderId')}
              placeholder={getOrderIdPlaceholder(platform)}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl border text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition text-sm font-mono',
                errors.orderId ? 'border-red-300' : 'border-slate-200'
              )}
            />
            {errors.orderId && <p className="text-red-500 text-xs mt-1">{errors.orderId.message}</p>}
            <p className="text-slate-400 text-xs mt-1">
              {platform === 'amazon'
                ? 'Find it in Your Orders on Amazon'
                : 'Find it in your order confirmation email'}
            </p>
          </div>
        )}

        {verifyError && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            {verifyError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || verifying}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: brandColor }}
        >
          {(isSubmitting || verifying) && <Loader2 className="w-4 h-4 animate-spin" />}
          {verifying ? 'Verifying…' : 'Continue →'}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Your info is safe and will never be shared</span>
        </div>
      </form>
    </div>
  )
}
