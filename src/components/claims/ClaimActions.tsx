'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/helpers'

interface ClaimActionsProps {
  promotionType?: string
  claimId:   string
  status:    string
  isFlagged: boolean
  onSuccess: () => void
}

export default function ClaimActions({ claimId, status, isFlagged, promotionType, onSuccess }: ClaimActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const manual = !['coupon_code', 'digital_download'].includes(promotionType ?? '')
  const [done, setDone]       = useState(false)

  const doAction = async (action: 'approve' | 'reject' | 'deliver') => {
    if (action === 'deliver' && manual && !window.confirm('Confirm that you have fulfilled this reward outside the app. This marks the claim as delivered.')) return
    setError(null)
    setLoading(action)
    try {
      const res = await fetch(`/api/claims/${claimId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ reason: 'Rejected by seller' }) : JSON.stringify({ manualFulfilled: action === 'deliver' && manual }),
      })
      if (!res.ok) { const result = await res.json(); throw new Error(result.error ?? 'Action failed') }
      if (res.ok) {
        setDone(true)
        setTimeout(() => { setDone(false); onSuccess() }, 800)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save. Please retry.')
    } finally {
      setLoading(null)
    }
  }

  if (done) {
    return <CheckCircle className="w-4 h-4 text-green-400 mx-2" />
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {error && <p role="alert" className="w-full text-xs text-red-400">{error}</p>}
      {/* Pending → Approve or Reject */}
      {status === 'pending' && !isFlagged && (
        <>
          <button
            onClick={() => doAction('approve')}
            disabled={!!loading}
            className={cn(
              'flex min-h-11 items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition',
              'bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50'
            )}
            title="Approve & Deliver"
          >
            {loading === 'approve'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <CheckCircle className="w-3 h-3" />
            }
            <span className="inline">Approve</span>
          </button>

          <button
            onClick={() => doAction('reject')}
            disabled={!!loading}
            className={cn(
              'flex min-h-11 items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition',
              'bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50'
            )}
            title="Reject"
          >
            {loading === 'reject'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <XCircle className="w-3 h-3" />
            }
            <span className="inline">Reject</span>
          </button>
        </>
      )}

      {/* Approved (not yet delivered) → Deliver */}
      {status === 'approved' && (
        <button
          onClick={() => doAction('deliver')}
          disabled={!!loading}
          className="flex min-h-11 items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 transition"
        >
          {loading === 'deliver'
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <RefreshCw className="w-3 h-3" />
          }
          <span className="inline">{manual ? 'Mark fulfilled' : 'Deliver'}</span>
        </button>
      )}

      {/* Rejected / Flagged → can approve manually */}
      {(status === 'rejected' || isFlagged) && (
        <button
          onClick={() => doAction('approve')}
          disabled={!!loading}
          className="flex min-h-11 items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 transition"
          title="Approve anyway"
        >
          {loading === 'approve'
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <CheckCircle className="w-3 h-3" />
          }
          <span className="inline">Approve</span>
        </button>
      )}
    </div>
  )
}
