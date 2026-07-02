'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/helpers'
import { Star } from 'lucide-react'

interface StepFeedbackProps {
  campaignId:  string
  brandColor:  string
  onComplete:  (data: { rating: number; feedbackText?: string }) => void
}

export default function StepFeedback({ campaignId, brandColor, onComplete }: StepFeedbackProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const RATING_LABELS: Record<number, string> = {
    1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent',
  }

  const handleSubmit = async () => {
    if (!rating) return
    setSubmitting(true)

    await fetch('/api/funnel/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, eventType: 'step_3_complete', stepNumber: 3 }),
    })

    onComplete({ rating, feedbackText: feedbackText.trim() || undefined })
    setSubmitting(false)
  }

  return (
    <div>
      <h2 className="text-slate-800 font-bold text-xl mb-1">How was your experience?</h2>
      <p className="text-slate-500 text-sm mb-8">
        Your feedback helps us improve. It only takes a second!
      </p>

      {/* Star Rating */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={cn(
                'w-10 h-10 transition-colors',
                (hovered || rating) >= star
                  ? 'fill-current text-yellow-400'
                  : 'text-slate-200 fill-current'
              )}
            />
          </button>
        ))}
      </div>

      {/* Rating label */}
      <div className="text-center mb-6 h-5">
        {(hovered || rating) > 0 && (
          <p className="text-slate-600 text-sm font-medium">
            {RATING_LABELS[hovered || rating]}
          </p>
        )}
      </div>

      {/* Feedback text — show if rated 3 or below */}
      {rating > 0 && rating <= 3 && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Tell us more <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={3}
            placeholder="What could we improve?"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition text-sm resize-none"
          />
        </div>
      )}

      {/* Optional praise — show if rated 4 or 5 */}
      {rating >= 4 && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            What did you love? <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={2}
            placeholder="Great quality, fast shipping…"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition text-sm resize-none"
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!rating || submitting}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-40"
        style={{ backgroundColor: brandColor }}
      >
        {submitting ? 'Saving…' : 'Continue →'}
      </button>
    </div>
  )
}
