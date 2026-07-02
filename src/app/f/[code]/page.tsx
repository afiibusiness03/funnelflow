'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import FunnelLayout from '@/components/funnel/FunnelLayout'
import StepOrderVerify from '@/components/funnel/StepOrderVerify'
import StepFeedback from '@/components/funnel/StepFeedback'
import StepReviewRequest from '@/components/funnel/StepReviewRequest'
import StepComplete from '@/components/funnel/StepComplete'
import { Loader2 } from 'lucide-react'

type Campaign = {
  id: string; name: string; language: string
  require_order_verify: boolean; smart_routing: boolean
  smart_routing_threshold: number; custom_logo_url: string | null
  custom_color: string | null; custom_thank_you_msg: string | null
  review_url: string | null; qr_short_code: string
  product: { id: string; name: string; image_url: string | null; platform: string; marketplace: string } | null
  promotion: { id: string; type: string; delivery_message: string | null; requires_address: boolean; auto_deliver: boolean } | null
  tenant: { name: string; logo_url: string | null; brand_color: string } | null
}

type CustomerData = {
  email: string; name?: string; orderId: string; verified: boolean
}

type FunnelResult = {
  reviewRequested: boolean; reviewUrl: string | null
  thankYouMessage: string | null; promotionDelivered: boolean
  couponCode?: string | null
}

export default function FunnelPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [step, setStep]         = useState(1)

  // Collected data
  const [customer, setCustomer]       = useState<CustomerData | null>(null)
  const [feedbackData, setFeedbackData] = useState<{ rating: number; feedbackText?: string } | null>(null)
  const [result, setResult]           = useState<FunnelResult | null>(null)

  // Load campaign
  useEffect(() => {
    fetch(`/api/funnel/${code}`)
      .then(r => r.json())
      .then(({ data, error: err }) => {
        if (err || !data) { setError('This offer is no longer available.'); return }
        setCampaign(data)
        // Track QR scan
        fetch('/api/funnel/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: data.id, eventType: 'qr_scan', stepNumber: 0 }),
        })
      })
      .catch(() => setError('Something went wrong. Please try again.'))
      .finally(() => setLoading(false))
  }, [code])

  const brandColor  = campaign?.custom_color ?? campaign?.tenant?.brand_color ?? '#6366f1'
  const logoUrl     = campaign?.custom_logo_url ?? campaign?.tenant?.logo_url
  const tenantName  = campaign?.tenant?.name ?? ''

  // Step 1 complete → go to feedback
  const handleOrderVerified = useCallback((data: CustomerData) => {
    setCustomer(data)
    setStep(2)
  }, [])

  // Step 2 complete → smart routing
  const handleFeedbackDone = useCallback(async (data: { rating: number; feedbackText?: string }) => {
    if (!campaign || !customer) return
    setFeedbackData(data)

    const shouldAskReview =
      campaign.smart_routing
        ? data.rating >= campaign.smart_routing_threshold
        : true

    // Submit the funnel
    const res = await fetch('/api/funnel/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId:    campaign.id,
        customerEmail: customer.email,
        customerName:  customer.name,
        orderId:       customer.orderId,
        orderVerified: customer.verified,
        platform:      campaign.product?.platform,
        marketplace:   campaign.product?.marketplace,
        rating:        data.rating,
        feedbackText:  data.feedbackText,
        promotionId:   campaign.promotion?.id,
      }),
    })
    const json = await res.json()
    setResult({
      ...json,
      couponCode: json.coupon_code ?? json.data?.coupon_code ?? null,
    })

    // Smart routing decision
    if (shouldAskReview && campaign.review_url) {
      setStep(3)
    } else {
      setStep(4)
    }
  }, [campaign, customer])

  // Step 3 complete
  const handleReviewDone = useCallback((_clicked: boolean) => {
    setStep(4)
  }, [])

  // Loading
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
    </div>
  )

  // Error
  if (error || !campaign) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-xs">
        <p className="text-2xl mb-2">😔</p>
        <h2 className="text-slate-800 font-semibold mb-1">Offer Unavailable</h2>
        <p className="text-slate-500 text-sm">{error ?? 'This link is no longer active.'}</p>
      </div>
    </div>
  )

  const totalSteps = (campaign.smart_routing && campaign.review_url) ? 4 : 3

  return (
    <FunnelLayout
      brandColor={brandColor}
      logoUrl={logoUrl}
      tenantName={tenantName}
      step={step < 4 ? step : undefined}
      totalSteps={totalSteps}
    >
      {step === 1 && (
        <StepOrderVerify
          campaignId={campaign.id}
          platform={campaign.product?.platform ?? 'amazon'}
          brandColor={brandColor}
          productName={campaign.product?.name ?? 'Your Product'}
          productImage={campaign.product?.image_url ?? null}
          requireVerify={campaign.require_order_verify}
          onComplete={handleOrderVerified}
        />
      )}

      {step === 2 && (
        <StepFeedback
          campaignId={campaign.id}
          brandColor={brandColor}
          onComplete={handleFeedbackDone}
        />
      )}

      {step === 3 && (
        <StepReviewRequest
          campaignId={campaign.id}
          reviewUrl={campaign.review_url}
          brandColor={brandColor}
          onComplete={handleReviewDone}
        />
      )}

      {step === 4 && customer && (
        <StepComplete
          brandColor={brandColor}
          thankYouMessage={campaign.custom_thank_you_msg}
          promotionDelivered={result?.promotionDelivered ?? false}
          couponCode={result?.couponCode ?? null}
          customerEmail={customer.email}
          tenantName={tenantName}
        />
      )}
    </FunnelLayout>
  )
}
