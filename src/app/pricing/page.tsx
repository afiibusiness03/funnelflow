'use client'

import { useState, useEffect } from 'react'
import NextLink from 'next/link'
import { QrCode, Check, ArrowRight, Zap, Shield, BarChart3, LogOut, Loader2 } from 'lucide-react'

// ─── Plans — prices MUST match the Stripe price IDs in .env.local ─────────────
const PLANS = [
  {
    id:        'starter',
    name:      'Starter',
    monthly:   19,   // matches STRIPE_PRICE_STARTER_MONTHLY ($1900)
    annual:    14,   // matches STRIPE_PRICE_STARTER_ANNUAL  ($1400)
    desc:      'For sellers just getting started',
    highlight: false,
    features: [
      '5 campaigns',
      '5 promotions',
      '1 product',
      'All platforms',
      'Email delivery',
      'Claims dashboard',
    ],
  },
  {
    id:        'growth',
    name:      'Growth',
    monthly:   49,   // matches STRIPE_PRICE_GROWTH_MONTHLY ($4900)
    annual:    37,   // matches STRIPE_PRICE_GROWTH_ANNUAL  ($3700)
    desc:      'For growing Amazon & Shopify sellers',
    highlight: true,
    badge:     'Most Popular',
    features: [
      'Unlimited campaigns',
      'Unlimited promotions',
      'Up to 10 products',
      'All platforms',
      'Smart routing',
      'Custom branding',
      'Analytics & charts',
      'Priority support',
    ],
  },
  {
    id:        'pro',
    name:      'Pro',
    monthly:   99,   // matches STRIPE_PRICE_PRO_MONTHLY ($9900)
    annual:    74,   // matches STRIPE_PRICE_PRO_ANNUAL  ($7400)
    desc:      'For high-volume sellers & agencies',
    highlight: false,
    features: [
      'Everything in Growth',
      'Unlimited products',
      'White-label funnels',
      'API access',
      'Multi-user accounts',
      'Dedicated support',
    ],
  },
]

export default function PricingPage() {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('annual')
  const [isExpired, setIsExpired] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const annualSavings = interval === 'annual'

  useEffect(() => {
    // Parse params manually to avoid NextJS Suspense de-optimization warnings
    const params = new URLSearchParams(window.location.search)
    if (params.get('expired') === 'true') {
      setIsExpired(true)
    }
    if (params.get('error') === 'checkout_failed') {
      setHasError(true)
    }

    const checkUserStatus = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (authUser) {
          setUser(authUser)
          const { data: userData } = await supabase
            .from('users')
            .select('*, tenant:tenants(*)')
            .eq('id', authUser.id)
            .single()

          if (userData?.tenant) {
            const tenant = userData.tenant
            const planStatus = tenant.plan_status
            const isActive = planStatus === 'active' || planStatus === 'past_due'
            const isTrialing = planStatus === 'trialing'

            let expired = false
            if (tenant.trial_ends_at) {
              const msLeft = new Date(tenant.trial_ends_at).getTime() - Date.now()
              const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
              if (isTrialing && daysLeft <= 0) expired = true
            }
            const isCanceled = planStatus === 'canceled'
            const hasNoAccess = !isActive && !isTrialing

            if (expired || isCanceled || hasNoAccess) {
              setIsExpired(true)
            }
          }
        }
      } catch (err) {
        console.error('Error loading user status:', err)
      } finally {
        setLoading(false)
      }
    }

    checkUserStatus()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
      <div>
        {/* Dynamic Expiration Banner */}
        {isExpired && (
          <div className="bg-red-500/25 border-b border-red-500/40 text-red-200 px-6 py-3.5 text-center text-sm font-medium">
            ⚠️ Your trial or plan has expired. Please select a plan below to restore access to your account.
          </div>
        )}
        {hasError && (
          <div className="bg-red-500/25 border-b border-red-500/40 text-red-200 px-6 py-3.5 text-center text-sm font-medium">
            ❌ Checkout failed. Please try again or contact support if the issue persists.
          </div>
        )}

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 max-w-6xl mx-auto w-full">
          <NextLink href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">FunnelFlow</span>
          </NextLink>

          <div>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : isExpired && user ? (
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            ) : (
              <NextLink href="/dashboard" className="text-slate-400 hover:text-white text-sm transition">
                ← Back to Dashboard
              </NextLink>
            )}
          </div>
        </header>

        {/* Hero */}
        <div className="text-center py-14 px-4">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose your plan
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-8">
            Start with a 14-day free trial. No credit card required. Upgrade whenever you&apos;re ready.
          </p>

          {/* ── Monthly / Annual toggle ───────────────────────────────────── */}
          <div className="inline-flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                interval === 'monthly'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                interval === 'annual'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Annual
              <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                Save 25%
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="max-w-5xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const price = interval === 'annual' ? plan.annual : plan.monthly
              const checkoutUrl = `/api/billing/checkout?plan=${plan.id}&interval=${interval}`

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 flex flex-col ${
                    plan.highlight
                      ? 'bg-purple-600 border-2 border-purple-400 shadow-2xl shadow-purple-500/20'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-6">
                    <p className={`text-sm font-semibold mb-1 ${plan.highlight ? 'text-purple-200' : 'text-slate-400'}`}>
                      {plan.name}
                    </p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-bold text-white">
                        ${price}
                      </span>
                      <span className={`text-sm pb-1 ${plan.highlight ? 'text-purple-200' : 'text-slate-500'}`}>
                        /month
                      </span>
                    </div>
                    {annualSavings && (
                      <p className={`text-xs mb-1 ${plan.highlight ? 'text-purple-200' : 'text-green-400'}`}>
                        Billed annually · ${plan.monthly - plan.annual}/mo saved
                      </p>
                    )}
                    <p className={`text-sm ${plan.highlight ? 'text-purple-200' : 'text-slate-400'}`}>
                      {plan.desc}
                    </p>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          plan.highlight ? 'bg-white/20' : 'bg-purple-500/20'
                        }`}>
                          <Check className={`w-2.5 h-2.5 ${plan.highlight ? 'text-white' : 'text-purple-400'}`} />
                        </div>
                        <span className={`text-sm ${plan.highlight ? 'text-white' : 'text-slate-300'}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={checkoutUrl}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                      plan.highlight
                        ? 'bg-white text-purple-700 hover:bg-purple-50'
                        : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                    }`}
                  >
                    Get started
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              )
            })}
          </div>

          {/* Reassurance */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {[
              { icon: Shield,    title: 'Your data is safe',  desc: 'We never delete your data. Upgrade anytime to regain access.' },
              { icon: Zap,       title: 'Instant activation', desc: 'Your account unlocks immediately after payment.' },
              { icon: BarChart3, title: 'No hidden fees',     desc: 'What you see is what you pay. Cancel anytime.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-white font-semibold text-sm mb-1">{title}</p>
                <p className="text-slate-400 text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-slate-500 text-sm">
        Need a custom plan?{' '}
        <a href="mailto:support@funnelflow.io" className="text-purple-400 hover:underline">
          Contact us
        </a>
      </footer>
    </div>
  )
}
