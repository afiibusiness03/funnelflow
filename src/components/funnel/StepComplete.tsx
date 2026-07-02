'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Mail } from 'lucide-react'

interface StepCompleteProps {
  brandColor:         string
  thankYouMessage?:   string | null
  promotionDelivered: boolean
  couponCode?:        string | null
  customerEmail:      string
  tenantName:         string
}

export default function StepComplete({
  brandColor, thankYouMessage, promotionDelivered, couponCode, customerEmail, tenantName,
}: StepCompleteProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Small confetti effect
    const colors = [brandColor, '#a855f7', '#22d3ee', '#f59e0b']
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 80 }, () => ({
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
      if (frame > 120) return          // just stop — cleanup handles removal
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        p.y += p.d
        p.x += Math.sin(frame * 0.05 + p.tilt) * 1.5
      })
      frame++
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      if (document.body.contains(canvas)) document.body.removeChild(canvas)
    }
  }, [brandColor])

  return (
    <div className="text-center py-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: `${brandColor}20` }}
      >
        <CheckCircle className="w-8 h-8" style={{ color: brandColor }} />
      </div>

      <h2 className="text-slate-800 font-bold text-2xl mb-2">
        {thankYouMessage ?? "Thank you! 🎉"}
      </h2>

      {couponCode && (
        <div className="bg-white border-2 border-dashed border-purple-300 rounded-xl px-6 py-5 mb-4 text-center">
          <p className="text-slate-500 text-xs mb-2 uppercase tracking-wide font-medium">
            Your reward code
          </p>
          <p className="text-2xl font-bold tracking-widest text-slate-800 font-mono mb-3">
            {couponCode}
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(couponCode)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 mx-auto"
          >
            {copied ? '✓ Copied!' : '📋 Copy code'}
          </button>
        </div>
      )}

      {promotionDelivered && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-left">
          <Mail className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-green-700 text-sm">
            Your reward has been sent to <strong>{customerEmail}</strong>. Check your inbox!
          </p>
        </div>
      )}

      <p className="text-slate-500 text-sm">
        Your feedback means the world to {tenantName}. Thank you for being an amazing customer! ❤️
      </p>

      <p className="text-slate-400 text-xs mt-6 px-2 leading-relaxed">
        * Limit one free item per household or customer. Offer only valid with 
        full-priced purchases. Proof of purchase required. No additional purchase 
        is necessary. Our offer is not dependent on the quality of feedback that 
        you provide. Offer only valid while supplies last. Subject to change or 
        cancellation at any time.
      </p>
    </div>
  )
}
