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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

        {/* Left — Perks */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">FunnelFlow</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
            Turn every package into a review machine
          </h2>
          <p className="text-slate-400 mb-8">
            Add a QR code to your product inserts and collect reviews, emails, and feedback — automatically.
          </p>
          <div className="space-y-3">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-500/30 border border-purple-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-purple-400" />
                </div>
                <span className="text-slate-300 text-sm">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form */}
        <div>
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-6 md:hidden">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">FunnelFlow</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
            <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-slate-400 mb-6 text-sm">Start your 14-day free trial</p>

            {serverError && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg px-4 py-3 mb-5 text-sm">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
                <input
                  {...register('fullName')}
                  placeholder="John Smith"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg bg-white/10 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                    errors.fullName ? 'border-red-500' : 'border-white/20'
                  )}
                />
                {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Business name</label>
                <input
                  {...register('businessName')}
                  placeholder="Acme Store"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg bg-white/10 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                    errors.businessName ? 'border-red-500' : 'border-white/20'
                  )}
                />
                {errors.businessName && <p className="text-red-400 text-xs mt-1">{errors.businessName.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg bg-white/10 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                    errors.email ? 'border-red-500' : 'border-white/20'
                  )}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    className={cn(
                      'w-full px-4 py-2.5 pr-11 rounded-lg bg-white/10 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                      errors.password ? 'border-red-500' : 'border-white/20'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Creating account…' : 'Start free trial'}
              </button>

              <p className="text-center text-slate-500 text-xs">
                By signing up you agree to our{' '}
                <Link href="/terms" className="text-purple-400 hover:underline">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>
              </p>
            </form>
          </div>

          <p className="text-center text-slate-400 text-sm mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
