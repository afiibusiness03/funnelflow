'use client'

import { useState, useEffect } from 'react'
import ClaimsTable, { type ClaimRow } from '@/components/claims/ClaimsTable'
import { Inbox, Clock, CheckCircle, Truck, XCircle, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/helpers'

const FILTERS = [
  { value: '',          label: 'All',       icon: Inbox        },
  { value: 'pending',   label: 'Pending',   icon: Clock        },
  { value: 'approved',  label: 'Approved',  icon: CheckCircle  },
  { value: 'delivered', label: 'Delivered', icon: Truck        },
  { value: 'rejected',  label: 'Rejected',  icon: XCircle      },
]

export default function ClaimsPage() {
  const [error, setError] = useState<string | null>(null)
  const [claims, setClaims]     = useState<ClaimRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState('')
  const [page, setPage]         = useState(1)
  const [totalPages, setTotal]  = useState(1)
  const [counts, setCounts]     = useState<Record<string, number>>({})

  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), per_page: '20' })
    if (status) params.set('status', status)
    fetch(`/api/claims?${params}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'Unable to load claims')
        return result
      })
      .then(result => {
        if (controller.signal.aborted) return
        setError(null)
        setCounts(result.counts ?? {})
        setClaims(result.data ?? [])
        setTotal(result.total_pages ?? 1)
      })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load claims') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, status, refresh])
  const handleRefresh = () => { setLoading(true); setRefresh(value => value + 1) }

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 rounded-xl p-1 w-fit">
        {FILTERS.map((f) => {
          const Icon    = f.icon
          const count   = counts[f.value] ?? null
          const active  = status === f.value
          return (
            <button
              key={f.value}
              onClick={() => { setLoading(true); setStatus(f.value); setPage(1) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition',
                active
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
              {f.value === 'pending' && (counts['pending'] ?? 0) > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-bold leading-none',
                  active ? 'bg-white/20 text-white' : 'bg-yellow-500/20 text-yellow-400'
                )}>
                  {counts['pending']}
                </span>
              )}
            </button>
          )
        })}

        <button
          onClick={handleRefresh}
          className="ml-1 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending',   value: counts['pending']   ?? 0, color: 'text-yellow-400' },
          { label: 'Approved',  value: counts['approved']  ?? 0, color: 'text-blue-400'   },
          { label: 'Delivered', value: counts['delivered'] ?? 0, color: 'text-green-400'  },
          { label: 'Rejected',  value: counts['rejected']  ?? 0, color: 'text-red-400'    },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <ClaimsTable claims={claims} onRefresh={handleRefresh} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-40 transition"
          >
            ← Prev
          </button>
          <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-40 transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
