'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/helpers'
import {
  LayoutDashboard,
  QrCode,
  Package,
  Gift,
  Inbox,
  PlugZap,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard',              icon: LayoutDashboard },
  { label: 'Campaigns',    href: '/dashboard/campaigns',    icon: QrCode },
  { label: 'Products',     href: '/dashboard/products',     icon: Package },
  { label: 'Promotions',   href: '/dashboard/promotions',   icon: Gift },
  { label: 'Claims',       href: '/dashboard/claims',       icon: Inbox },
  { label: 'Integrations', href: '/dashboard/integrations', icon: PlugZap },
  { label: 'Analytics',    href: '/dashboard/analytics',    icon: BarChart3 },
]

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface SidebarProps {
  tenantName: string
  tenantLogo?: string | null
  userEmail: string
  pendingClaims?: number
}

export default function Sidebar({ tenantName, tenantLogo, userEmail, pendingClaims = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 z-10 transition"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 py-5 border-b border-slate-800', collapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <QrCode className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-semibold text-sm truncate leading-tight">FunnelFlow</p>
            <p className="text-slate-400 text-xs truncate leading-tight">{tenantName}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group',
                active
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', active && 'text-purple-400')} />
              {!collapsed && <span>{item.label}</span>}

              {/* Badge for claims */}
              {item.label === 'Claims' && pendingClaims > 0 && (
                <span className={cn(
                  'bg-purple-600 text-white text-xs rounded-full px-1.5 py-0.5 font-medium leading-none',
                  collapsed ? 'absolute top-1 right-1 min-w-[16px] text-center' : 'ml-auto'
                )}>
                  {pendingClaims > 99 ? '99+' : pendingClaims}
                </span>
              )}

              {/* Tooltip on collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-slate-800 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition group relative',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}

        {/* User + Logout */}
        <div className={cn('flex items-center gap-2 px-3 py-2 mt-1', collapsed && 'justify-center px-0')}>
          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold uppercase">
              {userEmail.charAt(0)}
            </span>
          </div>
          {!collapsed && (
            <>
              <span className="text-slate-400 text-xs truncate flex-1">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-400 transition"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
