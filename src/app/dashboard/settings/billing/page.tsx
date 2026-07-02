import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { stripe, PLANS } from '@/lib/stripe/client'
import Link from 'next/link'
import { Check, Zap, ArrowRight, CreditCard, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/helpers'

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['1 product', '1 active campaign', 'Unlimited scans', 'Email delivery', 'All platforms', 'Multi-language'],
  growth:  ['10 products', 'Unlimited campaigns', '5 promotions', 'Everything in Starter', 'A/B testing'],
  pro:     ['50 products', 'Unlimited campaigns', '20 promotions', 'Everything in Growth', 'API access', 'Priority support'],
  agency:  ['Unlimited products', 'Unlimited campaigns', 'Unlimited promotions', 'Everything in Pro', 'White-label', 'Custom domain'],
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, tenant:tenants(*, subscriptions(*))')
    .eq('id', user.id)
    .single()
  if (!userData) redirect('/login')

  const tenant     = userData.tenant as any
  const currentPlan = tenant?.plan ?? 'starter'
  const planStatus  = tenant?.plan_status ?? 'trialing'
  const isTrialing  = planStatus === 'trialing'
  const trialDaysLeft = tenant?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  // Get invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Create Stripe checkout session helper
  const createCheckoutUrl = async (priceId: string) => {
    'use server'
    // This would be handled by a dedicated API route in production
    return `/api/billing/checkout?price=${priceId}`
  }

  const plans = [
    { id: 'starter', name: 'Starter',  monthly: 1900, annual: 1400 },
    { id: 'growth',  name: 'Growth',   monthly: 4900, annual: 3700 },
    { id: 'pro',     name: 'Pro',      monthly: 9900, annual: 7400 },
    { id: 'agency',  name: 'Agency',   monthly: 24900, annual: 18700 },
  ]

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Current plan banner */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Current Plan</p>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-xl capitalize">{currentPlan}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                planStatus === 'active'   ? 'bg-green-500/20 text-green-400'  :
                planStatus === 'trialing' ? 'bg-purple-500/20 text-purple-400' :
                planStatus === 'past_due' ? 'bg-red-500/20 text-red-400'      :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {isTrialing ? `Trial · ${trialDaysLeft} days left` : planStatus}
              </span>
            </div>
          </div>
          {tenant?.stripe_subscription_id && (
            <a
              href="/api/billing/portal"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition border border-slate-600 hover:border-slate-500 px-3 py-2 rounded-lg"
            >
              <CreditCard className="w-4 h-4" /> Manage Billing
            </a>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div>
        <h3 className="text-white font-semibold mb-4">Choose a Plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id
            const features      = PLAN_FEATURES[plan.id] ?? []
            const isPopular     = plan.id === 'growth'

            return (
              <div
                key={plan.id}
                className={`relative bg-slate-800/50 border rounded-xl p-5 flex flex-col ${
                  isCurrentPlan ? 'border-purple-500' :
                  isPopular     ? 'border-purple-500/40' :
                  'border-slate-700/50'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-white font-bold text-base">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-white">
                      ${(plan.annual / 100).toFixed(0)}
                    </span>
                    <span className="text-slate-400 text-xs">/mo billed annually</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    or ${(plan.monthly / 100).toFixed(0)}/mo monthly
                  </p>
                </div>

                <ul className="space-y-2 flex-1 mb-5">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="text-center py-2 text-purple-400 text-sm font-medium">
                    Current plan ✓
                  </div>
                ) : (
                  <a
                    href={`/api/billing/checkout?plan=${plan.id}&interval=annual`}
                    className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2.5 rounded-lg transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {currentPlan === 'starter' && plan.id !== 'starter' ? 'Upgrade' : 'Switch'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Invoices */}
      {invoices && invoices.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-3">Billing History</h3>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            {invoices.map((inv, idx) => (
              <div
                key={inv.id}
                className={`flex items-center justify-between px-5 py-3 ${idx < invoices.length - 1 ? 'border-b border-slate-700/50' : ''}`}
              >
                <div>
                  <p className="text-white text-sm">{formatCurrency(inv.amount_paid, inv.currency)}</p>
                  <p className="text-slate-500 text-xs">{formatDate(inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                    {inv.status}
                  </span>
                  {inv.invoice_pdf_url && (
                    <a
                      href={inv.invoice_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white transition"
                    >
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
