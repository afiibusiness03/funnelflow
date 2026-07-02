'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/helpers'

interface ClaimActionsProps {
  claimId:   string
  status:    string
  isFlagged: boolean
  onSuccess: () => void
}

export default function ClaimActions({ claimId, status, isFlagged, onSuccess }: ClaimActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [done, setDone]       = useState(false)

  const doAction = async (action: 'approve' | 'reject' | 'deliver') => {
    setLoading(action)
    try {
      const res = await fetch(`/api/claims/${claimId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ reason: 'Rejected by seller' }) : '{}',
      })
      if (res.ok) {
        setDone(true)
        setTimeout(() => { setDone(false); onSuccess() }, 800)
      }
    } finally {
      setLoading(null)
    }
  }

  if (done) {
    return <CheckCircle className="w-4 h-4 text-green-400 mx-2" />
  }

  return (
    <div className="flex items-center gap-1">
      {/* Pending → Approve or Reject */}
      {status === 'pending' && !isFlagged && (
        <>
          <button
            onClick={() => doAction('approve')}
            disabled={!!loading}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition',
              'bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50'
            )}
            title="Approve & Deliver"
          >
            {loading === 'approve'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <CheckCircle className="w-3 h-3" />
            }
            <span className="hidden sm:inline">Approve</span>
          </button>

          <button
            onClick={() => doAction('reject')}
            disabled={!!loading}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition',
              'bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50'
            )}
            title="Reject"
          >
            {loading === 'reject'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <XCircle className="w-3 h-3" />
            }
            <span className="hidden sm:inline">Reject</span>
          </button>
        </>
      )}

      {/* Approved (not yet delivered) → Deliver */}
      {status === 'approved' && (
        <button
          onClick={() => doAction('deliver')}
          disabled={!!loading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 transition"
        >
          {loading === 'deliver'
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <RefreshCw className="w-3 h-3" />
          }
          <span className="hidden sm:inline">Deliver</span>
        </button>
      )}

      {/* Rejected / Flagged → can approve manually */}
      {(status === 'rejected' || isFlagged) && (
        <button
          onClick={() => doAction('approve')}
          disabled={!!loading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 transition"
          title="Approve anyway"
        >
          {loading === 'approve'
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <CheckCircle className="w-3 h-3" />
          }
          <span className="hidden sm:inline">Approve</span>
        </button>
      )}
    </div>
  )
}
