'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <p className="text-4xl mb-4">⚠️</p>
      <h2 className="text-white text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-sm">
        {error.message ?? 'An unexpected error occurred loading this page.'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Try again
        </button>
        <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm transition">
          Go home
        </Link>
      </div>
    </div>
  )
}
