'use client'

import { useState } from 'react'
import { Star, ExternalLink } from 'lucide-react'

interface StepReviewRequestProps {
  campaignId:  string
  reviewUrl:   string | null
  brandColor:  string
  onComplete:  (clicked: boolean) => void
}

export default function StepReviewRequest({ campaignId, reviewUrl, brandColor, onComplete }: StepReviewRequestProps) {
  const [clicked, setClicked] = useState(false)

  const handleReviewClick = async () => {
    setClicked(true)
    await fetch('/api/funnel/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, eventType: 'review_clicked', stepNumber: 4 }),
    })
    if (reviewUrl) window.open(reviewUrl, '_blank', 'noopener,noreferrer')
    setTimeout(() => onComplete(true), 800)
  }

  const handleSkip = async () => {
    await fetch('/api/funnel/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, eventType: 'review_skipped', stepNumber: 4 }),
    })
    onComplete(false)
  }

  return (
    <div className="text-center">
      {/* Stars decoration */}
      <div className="flex justify-center gap-1 mb-4">
        {[1,2,3,4,5].map((i) => (
          <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
        ))}
      </div>

      <h2 className="text-slate-800 font-bold text-xl mb-2">
        Glad you loved it! 🎉
      </h2>
      <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
        Would you mind leaving a quick review? It takes less than 60 seconds and helps us a lot.
      </p>

      <button
        onClick={handleReviewClick}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm transition flex items-center justify-center gap-2 mb-3"
        style={{ backgroundColor: brandColor }}
      >
        <ExternalLink className="w-4 h-4" />
        {clicked ? 'Opening review page…' : 'Write a Review'}
      </button>

      <button
        onClick={handleSkip}
        className="w-full py-3 rounded-xl text-slate-400 hover:text-slate-600 text-sm transition"
      >
        Maybe later →
      </button>

      <p className="text-slate-400 text-xs mt-4">
        You&apos;ll still receive your reward either way.
      </p>
    </div>
  )
}
