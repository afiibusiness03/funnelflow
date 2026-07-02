'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function BillingSuccessPage() {
  const router  = useRouter()
  const [dots, setDots] = useState('.')

  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 500)

    // Give the Stripe webhook ~3 seconds to update the DB, then redirect
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 3500)

    return () => {
      clearInterval(dotsInterval)
      clearTimeout(timer)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">

        {/* Success icon */}
        <div className="w-24 h-24 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          Payment Successful! 🎉
        </h1>
        <p className="text-slate-400 mb-8">
          Your account has been upgraded. Welcome to FunnelFlow!
        </p>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-3 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Activating your account{dots}</span>
        </div>

        <p className="text-slate-600 text-xs mt-6">
          You will be redirected automatically in a few seconds.
        </p>

        {/* Manual fallback */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 text-purple-400 hover:text-purple-300 text-sm underline transition"
        >
          Go to Dashboard now →
        </button>
      </div>
    </div>
  )
}
