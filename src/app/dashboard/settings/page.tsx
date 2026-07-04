'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'
import { Loader2, Save, Building2, Globe, Palette, Shield, Sparkles, Settings2, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  name:         z.string().min(2, 'Business name is required'),
  brand_color:  z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  custom_domain: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#1e293b',
]

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName]   = useState('')

  // ─── Site Customizer Admin States ────────────────────────────
  const [siteSettings, setSiteSettings] = useState<any>({
    hero_title: '',
    hero_subtitle: '',
    step1_title: '',
    step1_desc: '',
    step2_title: '',
    step2_desc: '',
    step3_title: '',
    step3_desc: '',
    step4_title: '',
    step4_desc: '',
  })
  const [feat1Title, setFeat1Title] = useState('')
  const [feat1Desc, setFeat1Desc] = useState('')
  const [feat2Title, setFeat2Title] = useState('')
  const [feat2Desc, setFeat2Desc] = useState('')
  const [feat3Title, setFeat3Title] = useState('')
  const [feat3Desc, setFeat3Desc] = useState('')
  const [feat4Title, setFeat4Title] = useState('')
  const [feat4Desc, setFeat4Desc] = useState('')

  const [savingSite, setSavingSite] = useState(false)
  const [siteSaved, setSiteSaved] = useState(false)

  const isPlatformAdmin = userEmail === 'omaromran2091@gmail.com' || userEmail === 'afiibusiness03@gmail.com'

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { brand_color: '#f97316' },
  })

  const brandColor = watch('brand_color')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const email = user.email ?? ''
      setUserEmail(email)

      const { data: userData } = await supabase
        .from('users')
        .select('full_name, tenant_id, tenant:tenants(name, brand_color, custom_domain)')
        .eq('id', user.id).single()

      if (!userData) return
      setTenantId(userData.tenant_id)
      setUserName(userData.full_name ?? '')

      const tenant = userData.tenant as any
      reset({
        name:          tenant?.name ?? '',
        brand_color:   tenant?.brand_color ?? '#f97316',
        custom_domain: tenant?.custom_domain ?? '',
      })

      // Load marketing page customization settings if email matches admin
      if (email === 'omaromran2091@gmail.com' || email === 'afiibusiness03@gmail.com') {
        const { data: siteDb } = await supabase
          .from('site_settings')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .single()

        if (siteDb) {
          setSiteSettings({
            hero_title:    siteDb.hero_title    || '',
            hero_subtitle: siteDb.hero_subtitle || '',
            step1_title:   siteDb.step1_title   || '',
            step1_desc:    siteDb.step1_desc    || '',
            step2_title:   siteDb.step2_title   || '',
            step2_desc:    siteDb.step2_desc    || '',
            step3_title:   siteDb.step3_title   || '',
            step3_desc:    siteDb.step3_desc    || '',
            step4_title:   siteDb.step4_title   || '',
            step4_desc:    siteDb.step4_desc    || '',
          })
          const feats = Array.isArray(siteDb.features_json) ? siteDb.features_json : []
          setFeat1Title(feats[0]?.title ?? '')
          setFeat1Desc(feats[0]?.desc   ?? '')
          setFeat2Title(feats[1]?.title ?? '')
          setFeat2Desc(feats[1]?.desc   ?? '')
          setFeat3Title(feats[2]?.title ?? '')
          setFeat3Desc(feats[2]?.desc   ?? '')
          setFeat4Title(feats[3]?.title ?? '')
          setFeat4Desc(feats[3]?.desc   ?? '')
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  const onSubmit = async (data: FormData) => {
    if (!tenantId) return
    setSaving(true)
    setSaved(false)
    try {
      await supabase.from('tenants').update({
        name:          data.name,
        brand_color:   data.brand_color,
        custom_domain: data.custom_domain || null,
      }).eq('id', tenantId)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSite(true)
    setSiteSaved(false)
    try {
      const features = [
        { title: feat1Title, desc: feat1Desc },
        { title: feat2Title, desc: feat2Desc },
        { title: feat3Title, desc: feat3Desc },
        { title: feat4Title, desc: feat4Desc },
      ]

      await supabase.from('site_settings').upsert({
        id:            '00000000-0000-0000-0000-000000000000',
        hero_title:    siteSettings.hero_title,
        hero_subtitle: siteSettings.hero_subtitle,
        step1_title:   siteSettings.step1_title,
        step1_desc:    siteSettings.step1_desc,
        step2_title:   siteSettings.step2_title,
        step2_desc:    siteSettings.step2_desc,
        step3_title:   siteSettings.step3_title,
        step3_desc:    siteSettings.step3_desc,
        step4_title:   siteSettings.step4_title,
        step4_desc:    siteSettings.step4_desc,
        features_json: features,
        updated_at:    new Date().toISOString()
      }, { onConflict: 'id' })

      setSiteSaved(true)
      setTimeout(() => setSiteSaved(false), 2000)
    } catch (err) {
      console.error('Error saving site settings:', err)
    } finally {
      setSavingSite(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-8 pb-12">

      {/* Brand settings */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Brand Settings</h3>
            <p className="text-slate-400 text-xs">Customize how your funnel looks to customers</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Business name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Name</label>
            <input
              {...register('name')}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg bg-slate-900 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                errors.name ? 'border-red-500' : 'border-slate-600'
              )}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Brand color */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Brand Color
            </label>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg border-2 border-white/20 flex-shrink-0"
                style={{ backgroundColor: brandColor }}
              />
              <input
                {...register('brand_color')}
                placeholder="#6366f1"
                className={cn(
                  'w-36 px-3 py-2 rounded-lg bg-slate-900 border text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition',
                  errors.brand_color ? 'border-red-500' : 'border-slate-600'
                )}
              />
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setValue('brand_color', e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-600 bg-slate-900 cursor-pointer p-0.5"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('brand_color', c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition hover:scale-110',
                    brandColor === c ? 'border-white' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {errors.brand_color && <p className="text-red-400 text-xs mt-1">{errors.brand_color.message}</p>}
          </div>

          {/* Custom domain */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Custom Domain <span className="text-slate-500 font-normal">(optional — Pro+)</span>
            </label>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                {...register('custom_domain')}
                placeholder="funnel.yourbrand.com"
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>
            <p className="text-slate-500 text-xs mt-1.5">
              Point a CNAME record to <code className="text-purple-400">cname.funnelflow.com</code> then enter your domain here.
            </p>
          </div>

          {/* Funnel preview */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-xs mb-3">Funnel preview</p>
            <div className="bg-white rounded-lg p-3 max-w-xs">
              <div className="h-1 rounded-full mb-2" style={{ backgroundColor: brandColor, width: '60%' }} />
              <div className="h-2 bg-slate-100 rounded w-3/4 mb-1.5" />
              <div className="h-2 bg-slate-100 rounded w-1/2 mb-3" />
              <div className="h-7 rounded-lg text-center text-white text-xs flex items-center justify-center font-medium" style={{ backgroundColor: brandColor }}>
                Continue →
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved! ✓' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* ─── PLATFORM ADMIN: MARKETING PAGE CUSTOMIZER ─────────────────── */}
      {isPlatformAdmin && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Landing Page Customizer</h3>
              <p className="text-slate-400 text-xs">Only visible to platform owners. Edit marketing copy dynamically.</p>
            </div>
          </div>

          <form onSubmit={handleSaveSiteSettings} className="space-y-6">
            {/* Hero Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Hero Headline</label>
              <input
                type="text"
                value={siteSettings.hero_title}
                onChange={(e) => setSiteSettings({ ...siteSettings, hero_title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            {/* Hero Subtitle */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Hero Subheading</label>
              <textarea
                rows={3}
                value={siteSettings.hero_subtitle}
                onChange={(e) => setSiteSettings({ ...siteSettings, hero_subtitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm leading-relaxed"
              />
            </div>

            <div className="border-t border-slate-700/50 my-6" />

            {/* How it Works steps */}
            <div className="flex items-center gap-2 mb-3 text-slate-200 font-bold text-sm">
              <Settings2 className="w-4 h-4 text-purple-400" />
              <span>Step-by-Step Flow Customizer</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1 */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xxs font-bold text-purple-400">Step 01</span>
                <input
                  type="text"
                  placeholder="Step 1 Title"
                  value={siteSettings.step1_title}
                  onChange={(e) => setSiteSettings({ ...siteSettings, step1_title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                />
                <textarea
                  rows={2}
                  placeholder="Step 1 Description"
                  value={siteSettings.step1_desc}
                  onChange={(e) => setSiteSettings({ ...siteSettings, step1_desc: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              {/* Step 2 */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xxs font-bold text-purple-400">Step 02</span>
                <input
                  type="text"
                  placeholder="Step 2 Title"
                  value={siteSettings.step2_title}
                  onChange={(e) => setSiteSettings({ ...siteSettings, step2_title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                />
                <textarea
                  rows={2}
                  placeholder="Step 2 Description"
                  value={siteSettings.step2_desc}
                  onChange={(e) => setSiteSettings({ ...siteSettings, step2_desc: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              {/* Step 3 */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xxs font-bold text-purple-400">Step 03</span>
                <input
                  type="text"
                  placeholder="Step 3 Title"
                  value={siteSettings.step3_title}
                  onChange={(e) => setSiteSettings({ ...siteSettings, step3_title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                />
                <textarea
                  rows={2}
                  placeholder="Step 3 Description"
                  value={siteSettings.step3_desc}
                  onChange={(e) => setSiteSettings({ ...siteSettings, step3_desc: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              {/* Step 4 */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xxs font-bold text-purple-400">Step 04</span>
                <input
                  type="text"
                  placeholder="Step 4 Title"
                  value={siteSettings.step4_title}
                  onChange={(e) => setSiteSettings({ ...siteSettings, step4_title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                />
                <textarea
                  rows={2}
                  placeholder="Step 4 Description"
                  value={siteSettings.step4_desc}
                  onChange={(e) => setSiteSettings({ ...siteSettings, step4_desc: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            <div className="border-t border-slate-700/50 my-6" />

            {/* Features lists */}
            <div className="flex items-center gap-2 mb-3 text-slate-200 font-bold text-sm">
              <LayoutGrid className="w-4 h-4 text-purple-400" />
              <span>Features List Editor</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Feature 1 */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xxs font-bold text-purple-400">Feature 1</span>
                <input
                  type="text"
                  placeholder="Title"
                  value={feat1Title}
                  onChange={(e) => setFeat1Title(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                />
                <textarea
                  rows={2}
                  placeholder="Description"
                  value={feat1Desc}
                  onChange={(e) => setFeat1Desc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              {/* Feature 2 */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xxs font-bold text-purple-400">Feature 2</span>
                <input
                  type="text"
                  placeholder="Title"
                  value={feat2Title}
                  onChange={(e) => setFeat2Title(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                />
                <textarea
                  rows={2}
                  placeholder="Description"
                  value={feat2Desc}
                  onChange={(e) => setFeat2Desc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              {/* Feature 3 */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xxs font-bold text-purple-400">Feature 3</span>
                <input
                  type="text"
                  placeholder="Title"
                  value={feat3Title}
                  onChange={(e) => setFeat3Title(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                />
                <textarea
                  rows={2}
                  placeholder="Description"
                  value={feat3Desc}
                  onChange={(e) => setFeat3Desc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>

              {/* Feature 4 */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xxs font-bold text-purple-400">Feature 4</span>
                <input
                  type="text"
                  placeholder="Title"
                  value={feat4Title}
                  onChange={(e) => setFeat4Title(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                />
                <textarea
                  rows={2}
                  placeholder="Description"
                  value={feat4Desc}
                  onChange={(e) => setFeat4Desc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSite}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              {savingSite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {siteSaved ? 'Marketing Page Customizations Saved! ✓' : savingSite ? 'Saving…' : 'Save Marketing Page Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Account info */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Account</h3>
            <p className="text-slate-400 text-xs">Your login details</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-700">
            <span className="text-slate-400 text-sm">Email</span>
            <span className="text-white text-sm">{userEmail}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-700">
            <span className="text-slate-400 text-sm">Name</span>
            <span className="text-white text-sm">{userName || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400 text-sm">Password</span>
            <button className="text-purple-400 hover:text-purple-300 text-sm transition">
              Change password →
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
        <h3 className="text-red-400 font-semibold text-sm mb-1">Danger Zone</h3>
        <p className="text-slate-400 text-xs mb-4">These actions are permanent and cannot be undone.</p>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings/billing"
            className="text-slate-400 hover:text-white text-sm border border-slate-600 hover:border-slate-500 px-3 py-2 rounded-lg transition"
          >
            Cancel subscription
          </Link>
          <button className="text-red-400 hover:text-red-300 text-sm border border-red-500/30 hover:border-red-500/50 px-3 py-2 rounded-lg transition">
            Delete account
          </button>
        </div>
      </div>
    </div>
  )
}
