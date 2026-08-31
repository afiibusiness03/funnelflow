'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QrCode, ArrowRight, Zap, Check, Lock, Star, Mail, Loader2, Sparkles, Shield } from 'lucide-react'

interface PrivateWaitlistHeroProps {
  isAdmin: boolean
}

export default function PrivateWaitlistHero({ isAdmin }: PrivateWaitlistHeroProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitted(true)
      } else {
        setErrorMsg(data.error || 'Failed to submit. Please try again.')
      }
    } catch (err) {
      setErrorMsg('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-page-root min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-[#6366f1] selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6366f1] to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Amazin<span className="text-[#6366f1]">Review</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center space-y-8 flex-1">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Private Beta & Early Access Mode</span>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Turn Every Package Into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Review Machine</span> 🎁
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
            AmazinReview helps e-commerce sellers automate post-purchase QR funnels, capture verified customer reviews, and deliver instant rewards.
          </p>
        </div>

        {/* Waitlist Access Form */}
        <div className="max-w-md mx-auto bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4">
          {submitted ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-5 text-center space-y-2">
              <Check className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-lg text-white">Access Request Received! 🎉</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Thank you for your interest. We will notify you as soon as early access invitations open up.
              </p>
            </div>
          ) : (
            <>
              <div className="text-left space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Request Access or Demo
                </h3>
                <p className="text-slate-400 text-xs">
                  Public signups are currently by invite only. Enter your business email below to request early access.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {errorMsg && (
                  <p className="text-red-400 text-xs font-medium text-left">{errorMsg}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-3 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-60 text-white font-bold text-sm transition flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-indigo-500/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Request Access <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-8 max-w-4xl mx-auto text-left">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">QR Package Inserts</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Generate custom, high-res QR codes for packaging inserts to engage customers immediately after unboxing.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Smart Routing</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Route 5-star buyers directly to Amazon/Shopify while handling feedback privately to boost seller rating.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Instant Email Rewards</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Auto-deliver coupon codes and digital downloads instantly to verified buyers upon feedback completion.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} AmazinReview. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-300 transition">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
