'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import FunnelLayout from '@/components/funnel/FunnelLayout'
import StepOrderVerify from '@/components/funnel/StepOrderVerify'
import StepFeedback from '@/components/funnel/StepFeedback'
import StepReviewRequest from '@/components/funnel/StepReviewRequest'
import StepComplete from '@/components/funnel/StepComplete'
import UnifiedFunnel from '@/components/funnel/UnifiedFunnel'
import { Loader2 } from 'lucide-react'

export default function FunnelPage() {
  const { code } = useParams<{ code: string }>()
  const [campaign, setCampaign] = useState<any | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

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

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '99, 102, 241'
  }

  const darkenColor = (hex: string, percent: number): string => {
    let num = parseInt(hex.replace("#",""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
  }

  // Loading
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
    </div>
  )

  // Error
  if (error || !campaign) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-slate-100">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 font-semibold text-lg">!</div>
        <p className="text-slate-700 font-medium text-sm">{error ?? 'Campaign not found'}</p>
      </div>
    </div>
  )

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60"
      style={{
        '--brand-color': brandColor,
        '--brand-color-rgb': hexToRgb(brandColor),
        '--brand-color-dark': darkenColor(brandColor, 15),
      } as React.CSSProperties}
    >
      <FunnelLayout
        brandColor={brandColor}
        logoUrl={logoUrl}
        tenantName={tenantName}
      >
        <UnifiedFunnel campaign={campaign} brandColor={brandColor} />
      </FunnelLayout>
    </div>
  )
}
