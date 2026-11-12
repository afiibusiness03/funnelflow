'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSyncExternalStore, type ReactNode } from 'react'
import { Bell, Plus, Search, Sun, Moon } from 'lucide-react'

const PAGE_TITLES: Record<string, { title: string; description: string; action?: { label: string; href: string } }> = {
  '/dashboard':               { title: 'Dashboard',    description: 'Overview of your account' },
  '/dashboard/campaigns':     { title: 'Campaigns',    description: 'Manage your QR funnels',        action: { label: 'New Campaign',   href: '/dashboard/campaigns/new' } },
  '/dashboard/products':      { title: 'Products',     description: 'Your product catalog',           action: { label: 'Add Product',    href: '/dashboard/products/new' } },
  '/dashboard/promotions':    { title: 'Promotions',   description: 'Coupons, gifts & downloads',     action: { label: 'New Promotion',  href: '/dashboard/promotions/new' } },
  '/dashboard/claims':        { title: 'Claims',       description: 'Review and deliver promotions' },
  '/dashboard/integrations':  { title: 'Integrations', description: 'Connect your platforms' },
  '/dashboard/analytics':     { title: 'Analytics',    description: 'Performance & insights' },
  '/dashboard/settings':      { title: 'Settings',     description: 'Account & billing' },
}

function getPageMeta(pathname: string) {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Prefix match (e.g. /dashboard/campaigns/new)
  const match = Object.keys(PAGE_TITLES)
    .filter((k) => pathname.startsWith(k) && k !== '/dashboard')
    .sort((a, b) => b.length - a.length)[0]
  return PAGE_TITLES[match] ?? { title: 'AmazinReview', description: '' }
}

interface HeaderProps {
  notifications?: number
  menuButton?: ReactNode
}

function themeSnapshot() { return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light' }
function subscribeTheme(callback: () => void) {
  const sync = () => { document.documentElement.classList.toggle('light', themeSnapshot() === 'light'); callback() }
  sync()
  window.addEventListener('storage', sync)
  window.addEventListener('theme-change', sync)
  return () => { window.removeEventListener('storage', sync); window.removeEventListener('theme-change', sync) }
}

export default function Header({ notifications = 0, menuButton }: HeaderProps) {
  const pathname = usePathname()
  const meta = getPageMeta(pathname)
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, () => 'light')

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', next)
    window.dispatchEvent(new Event('theme-change'))
    if (next === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  return (
    <header className="min-h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between gap-2 px-2 py-2 sm:px-6 flex-shrink-0">
      {/* Left — Page title */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        {menuButton}
        <div className="min-w-0">
        <h1 className="truncate text-white font-semibold text-base leading-tight">{meta.title}</h1>
        {meta.description && (
          <p className="hidden text-slate-400 text-xs leading-tight sm:block">{meta.description}</p>
        )}
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Search (future) */}
        <button aria-label="Search" className="hidden w-11 h-11 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 sm:flex items-center justify-center transition">
          <Search className="w-4 h-4" />
        </button>

        {/* Light/Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-11 h-11 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button aria-label="Notifications" className="hidden relative w-11 h-11 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 sm:flex items-center justify-center transition">
          <Bell className="w-4 h-4" />
          {notifications > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" />
          )}
        </button>

        {/* CTA button */}
        {meta.action && (
          <Link
            href={meta.action.href}
            aria-label={meta.action.label}
            title={meta.action.label}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{meta.action.label}</span>
          </Link>
        )}
      </div>
    </header>
  )
}
