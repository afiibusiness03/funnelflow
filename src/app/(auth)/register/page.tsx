'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'
import { Loader2, QrCode, Eye, EyeOff, Check } from 'lucide-react'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
})

type FormData = z.infer<typeof schema>

const PERKS = [
  '14-day free trial — no credit card required',
  'Unlimited QR scans on all plans',
  'Amazon, eBay, Shopify & more',
  'Cancel anytime',
]

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)

    // 1. Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          business_name: data.businessName,
        },
      },
    })

    if (authError) {
      setServerError(authError.message)
      return
    }

    if (!authData.user) {
      setServerError('Something went wrong. Please try again.')
      return
    }

    // 2. Create tenant via API
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.businessName,
        userId: authData.user.id,
        email: data.email,
        fullName: data.fullName,
      }),
    })

    if (!res.ok) {
      setServerError('Failed to create your account. Please contact support.')
      return
    }

    // If email confirmation needed
    if (!authData.session) {
      setSuccess(true)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-slate-400">
            We sent a confirmation link to your email address. Click it to activate your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page-root min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6366f1]/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">

        {/* Left — Perks */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-[#6366f1] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">AmazinReview</span>
          </div>
          <h2 className="text-3xl font-black text-white mb-3 leading-tight tracking-tight">
            Turn every package into a review machine 🎁
          </h2>
          <p className="text-slate-300 mb-8 text-base leading-relaxed">
            Add a QR code to your product inserts and collect reviews, emails, and feedback — automatically.
          </p>
          <div className="space-y-3.5">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#818cf8]" />
                </div>
                <span className="text-slate-200 text-sm font-medium">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form */}
        <div>
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-6 md:hidden">
            <div className="w-9 h-9 bg-[#6366f1] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">AmazinReview</span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h1 className="text-2xl font-extrabold text-white mb-1 tracking-tight">Create your account</h1>
            <p className="text-slate-300 mb-6 text-sm">Start your 14-day free trial</p>

            {serverError && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-xl px-4 py-3 mb-5 text-sm font-medium">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Full name</label>
                <input
                  {...register('fullName')}
                  placeholder="John Smith"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl bg-slate-950/80 border text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1] transition font-medium',
                    errors.fullName ? 'border-red-500' : 'border-slate-800'
                  )}
                />
                {errors.fullName && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.fullName.message}</p>}
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Business name</label>
                <input
                  {...register('businessName')}
                  placeholder="Acme Store"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl bg-slate-950/80 border text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1] transition font-medium',
                    errors.businessName ? 'border-red-500' : 'border-slate-800'
                  )}
                />
                {errors.businessName && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.businessName.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Email address</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl bg-slate-950/80 border text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1] transition font-medium',
                    errors.email ? 'border-red-500' : 'border-slate-800'
                  )}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    className={cn(
                      'w-full px-4 py-3 pr-11 rounded-xl bg-slate-950/80 border text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1] transition font-medium',
                      errors.password ? 'border-red-500' : 'border-slate-800'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-lg shadow-indigo-500/30 text-base"
              >
                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin text-white" />}
                {isSubmitting ? 'Creating account…' : 'Start free trial'}
              </button>

              <p className="text-center text-slate-400 text-xs">
                By signing up you agree to our{' '}
                <Link href="/terms" className="text-indigo-400 hover:underline">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>
              </p>
            </form>
          </div>

          <p className="text-center text-slate-300 text-sm mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold underline decoration-indigo-500/40">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
