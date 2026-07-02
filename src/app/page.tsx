import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { 
  QrCode, ArrowRight, Zap, Check, Shield, Star, 
  RefreshCw, BarChart3, Inbox, Smartphone, Lock 
} from 'lucide-react'

// Default fallback site settings if DB table isn't created or seeded yet
const DEFAULTS = {
  hero_title: 'Turn Every Package Into a Review Machine 🎁',
  hero_subtitle: 'QR-powered post-purchase funnels for Amazon, Shopify & more. Verify purchases, collect private feedback, and deliver rewards automatically.',
  step1_title: 'Create Your Campaign',
  step1_desc: 'Set up your product, rating threshold, and rewards (coupons, downloads, gift cards).',
  step2_title: 'Generate & Print QR Codes',
  step2_desc: 'Get custom, scan-ready QR codes for packaging inserts or thank-you cards.',
  step3_title: 'Customer Scans & Verifies',
  step3_desc: 'Customers scan the code, enter their order ID (verified via SP-API), and leave feedback.',
  step4_title: 'Auto-Deliver Rewards',
  step4_desc: 'Verified submissions instantly receive rewards via email, while high-rating users are prompted to review.',
  features_json: [
    { title: 'Multi-Platform Support', desc: 'Native validation rules for Amazon, Shopify, eBay, Walmart, and Etsy.' },
    { title: 'Fraud Detection', desc: 'Blocks temp mails, duplicate order IDs, and duplicate IP submissions.' },
    { title: 'Smart Routing', desc: 'Guide happy customers directly to your public listing, and capture negative reviews privately.' },
    { title: 'Instant Upgrades', desc: 'Seamless transition to Stripe billing.' }
  ]
}

export default async function MarketingLandingPage() {
  const supabase = await createClient()
  
  // Get active session dynamically to update header controls
  const { data: { user } } = await supabase.auth.getUser()

  // Load customizable content from site_settings (falls back to DEFAULTS if empty)
  let settings = DEFAULTS
  try {
    const { data: siteDb } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single()

    if (siteDb) {
      settings = {
        hero_title:    siteDb.hero_title    || DEFAULTS.hero_title,
        hero_subtitle: siteDb.hero_subtitle || DEFAULTS.hero_subtitle,
        step1_title:   siteDb.step1_title   || DEFAULTS.step1_title,
        step1_desc:    siteDb.step1_desc    || DEFAULTS.step1_desc,
        step2_title:   siteDb.step2_title   || DEFAULTS.step2_title,
        step2_desc:    siteDb.step2_desc    || DEFAULTS.step2_desc,
        step3_title:   siteDb.step3_title   || DEFAULTS.step3_title,
        step3_desc:    siteDb.step3_desc    || DEFAULTS.step3_desc,
        step4_title:   siteDb.step4_title   || DEFAULTS.step4_title,
        step4_desc:    siteDb.step4_desc    || DEFAULTS.step4_desc,
        features_json: Array.isArray(siteDb.features_json) 
          ? siteDb.features_json 
          : DEFAULTS.features_json
      }
    }
  } catch (err) {
    // Fail open safely using DEFAULTS
    console.error('Could not load site settings from DB:', err)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-600 selection:text-white flex flex-col justify-between">
      
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">FunnelFlow</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-slate-400 hover:text-white text-sm font-medium transition">
              Pricing
            </Link>
            {user ? (
              <Link 
                href="/dashboard" 
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-slate-400 hover:text-white text-sm font-medium transition">
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 px-6 max-w-6xl mx-auto w-full">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-full">
              <Zap className="w-3.5 h-3.5" />
              Maximize Amazon & Shopify reviews
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-purple-400 bg-clip-text text-transparent">
              {settings.hero_title}
            </h1>
            <p className="text-slate-400 text-lg md:text-xl leading-relaxed">
              {settings.hero_subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/register" 
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-base shadow-lg shadow-purple-500/20"
              >
                Start Your 14-Day Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/pricing" 
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold px-6 py-3.5 rounded-xl transition flex items-center justify-center text-base"
              >
                View Plans
              </Link>
            </div>
          </div>

          {/* Interactive Mockup Preview */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-900">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-500 text-xxs font-semibold uppercase">Customer Funnel Preview</p>
                  <p className="text-white text-xs font-bold">Post-Purchase Claim Flow</p>
                </div>
              </div>

              {/* Mock Screen 1: Order verify */}
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Step 1: Order Verification</span>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </div>
                <div className="h-9 bg-slate-900 border border-slate-800 rounded-xl px-3 flex items-center justify-between">
                  <span className="text-slate-300 text-xs font-mono">114-4820593-9481948</span>
                  <span className="text-xxs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">Verified by API</span>
                </div>
              </div>

              {/* Mock Screen 2: Feedback & Routing */}
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Step 2: Rating & Routing</span>
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                </div>
                <div className="flex gap-2 justify-center py-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      className={`w-6 h-6 ${s === 5 ? 'text-yellow-400 fill-current scale-110' : 'text-slate-700'}`} 
                    />
                  ))}
                </div>
                <div className="text-center text-xxs text-purple-400 font-bold bg-purple-500/10 py-1.5 rounded-lg border border-purple-500/20">
                  🚀 Directed to Amazon Product Review Link
                </div>
              </div>

              {/* Mock Screen 3: Reward delivery */}
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Step 3: Instant Coupon Delivery</span>
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="h-10 bg-slate-900 rounded-xl flex items-center justify-center font-bold text-sm tracking-widest text-purple-300 border border-dashed border-purple-500/40">
                  SAVE25PCT
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ───────────────────────────────────────── */}
      <section className="bg-slate-900/30 border-y border-slate-900 py-20 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">How FunnelFlow Works</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Automate customer post-purchase engagement in 4 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl text-left space-y-4 relative">
              <span className="absolute top-4 right-4 text-4xl font-black text-slate-800">01</span>
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-lg">{settings.step1_title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{settings.step1_desc}</p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl text-left space-y-4 relative">
              <span className="absolute top-4 right-4 text-4xl font-black text-slate-800">02</span>
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <QrCode className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-lg">{settings.step2_title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{settings.step2_desc}</p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl text-left space-y-4 relative">
              <span className="absolute top-4 right-4 text-4xl font-black text-slate-800">03</span>
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-lg">{settings.step3_title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{settings.step3_desc}</p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl text-left space-y-4 relative">
              <span className="absolute top-4 right-4 text-4xl font-black text-slate-800">04</span>
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Check className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-lg">{settings.step4_title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{settings.step4_desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full text-center space-y-12">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Packed With Professional Features</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            A comprehensive suite of tools built to protect your listings and scale operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {settings.features_json.map((f, i) => (
            <div key={i} className="bg-slate-900/30 border border-slate-800/80 p-5 rounded-2xl text-left space-y-3">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-purple-400" />
              </div>
              <h4 className="text-white font-semibold text-base">{f.title}</h4>
              <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-4xl mx-auto w-full text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 md:p-12 space-y-6 relative z-10">
          <h3 className="text-2xl md:text-4xl font-bold text-white">Ready to automate your review funnel?</h3>
          <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            Join growing brands utilizing FunnelFlow to collect product feedback and secure higher margins.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/register" 
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/pricing" 
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-6 py-3 rounded-lg transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-center">
        <p className="text-slate-500 text-xs">
          &copy; {new Date().getFullYear()} FunnelFlow. All rights reserved.
        </p>
      </footer>

    </div>
  )
}
