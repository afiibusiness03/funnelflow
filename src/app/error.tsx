'use client'

import { useEffect } from 'react'

export default function Error({
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-5xl mb-4">⚠️</p>
        <h2 className="text-white text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs">
          {error.message ?? 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
