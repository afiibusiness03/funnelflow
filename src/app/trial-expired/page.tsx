import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, ShieldCheck, ArrowRight, QrCode, LogOut } from 'lucide-react'

export const metadata = {
  title: 'Trial Expired — FunnelFlow',
}

const FEATURES = [
  'Unlimited campaigns & promotions',
  'Unlimited QR scans',
  'Full claims & analytics dashboard',
  'Amazon, Shopify, eBay & more',
  'Auto-delivery of coupons & rewards',
  'Priority support',
]

export default async function TrialExpiredPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*, tenant:tenants(name, trial_ends_at, plan_status)')
    .eq('id', user.id)
    .single()

  const tenant = userData?.tenant as { name: string; trial_ends_at: string | null; plan_status: string } | null

  // If trial is still active or user has paid plan — send them back to dashboard
  if (tenant?.plan_status === 'active') redirect('/dashboard')
  if (tenant?.trial_ends_at && new Date(tenant.trial_ends_at) > new Date()) {
    redirect('/dashboard')
  }

  const expiredDate = tenant?.trial_ends_at
    ? new Date(tenant.trial_ends_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">FunnelFlow</span>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">

          {/* Icon */}
          <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-white mb-3">
            Your free trial has ended
          </h1>
          {expiredDate && (
            <p className="text-slate-400 mb-2">
              Your 14-day trial expired on <span className="text-slate-300 font-medium">{expiredDate}</span>.
            </p>
          )}
          <p className="text-slate-400 mb-8">
            Your data is safe — upgrade to regain full access.
          </p>

          {/* Primary CTA — choose a plan first, then pay */}
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition w-full justify-center mb-4"
          >
            🚀 Upgrade Now
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-slate-500 text-sm mb-10">
            Have questions?{' '}
            <a href="mailto:support@funnelflow.io" className="text-purple-400 hover:underline">
              Contact support
            </a>
          </p>

          {/* What you get */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">
              What you get when you upgrade
            </p>
            <ul className="space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                  </div>
                  <span className="text-slate-300 text-sm">{f}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}
