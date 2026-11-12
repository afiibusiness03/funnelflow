'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import Sidebar, { type SidebarProps } from './Sidebar'
import Header from './Header'

interface DashboardShellProps extends SidebarProps {
  children: ReactNode
  banner?: ReactNode
  style?: CSSProperties
}

export default function DashboardShell({ children, banner, style, ...sidebar }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const contentRef = useRef<HTMLElement>(null)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 })
  }, [pathname])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <div className="dashboard-shell flex h-dvh min-h-0 bg-slate-950" style={style}>
      <div className="hidden shrink-0 lg:flex">
        <Sidebar {...sidebar} />
      </div>
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Header menuButton={
            <Dialog.Trigger asChild>
              <button type="button" aria-label="Open navigation" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </Dialog.Trigger>
          } />
          {banner}
          <main ref={contentRef} id="dashboard-content" className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6">
            {children}
          </main>
        </div>
        {/* Keep the drawer inside the shell so tenant accent colors are inherited. */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 lg:hidden" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 w-72 max-w-[calc(100%-2rem)] outline-none lg:hidden">
          <Dialog.Title className="sr-only">Dashboard navigation</Dialog.Title>
          <Sidebar {...sidebar} mobile onNavigate={() => setMenuOpen(false)} headerAction={
            <Dialog.Close asChild>
              <button type="button" aria-label="Close navigation" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          } />
        </Dialog.Content>
      </Dialog.Root>
    </div>
  )
}
