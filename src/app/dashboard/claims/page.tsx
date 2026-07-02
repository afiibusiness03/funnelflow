'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [claims, setClaims]     = useState<ClaimRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState('')
  const [page, setPage]         = useState(1)
  const [totalPages, setTotal]  = useState(1)
  const [counts, setCounts]     = useState<Record<string, number>>({})

  const fetchClaims = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' })
      if (status) params.set('status', status)

      const res  = await fetch(`/api/claims?${params}`)
      const json = await res.json()
      setClaims(json.data ?? [])
      setTotal(json.total_pages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [page, status])

  // Fetch counts for each tab
  const fetchCounts = useCallback(async () => {
    const results = await Promise.all(
      ['pending','approved','delivered','rejected'].map(async (s) => {
        const res  = await fetch(`/api/claims?status=${s}&per_page=1`)
        const json = await res.json()
        return [s, json.count ?? 0] as [string, number]
      })
    )
    setCounts(Object.fromEntries(results))
  }, [])

  useEffect(() => { fetchClaims() }, [fetchClaims])
  useEffect(() => { fetchCounts() }, [fetchCounts])

  const handleRefresh = () => { fetchClaims(); fetchCounts() }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 rounded-xl p-1 w-fit">
        {FILTERS.map((f) => {
          const Icon    = f.icon
          const count   = counts[f.value] ?? null
          const active  = status === f.value
          return (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1) }}
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
