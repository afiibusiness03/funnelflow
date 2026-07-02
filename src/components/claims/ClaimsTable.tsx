'use client'

import { useState } from 'react'
import { cn, formatDate } from '@/lib/utils/helpers'
import { Star, AlertTriangle, CheckCircle, XCircle, Clock, Truck, Mail } from 'lucide-react'
import ClaimActions from './ClaimActions'

export interface ClaimRow {
  id: string
  customer_email: string
  customer_name:  string | null
  rating:         number | null
  feedback_text:  string | null
  order_id:       string | null
  order_verified: boolean
  platform:       string | null
  claim_status:   string
  is_flagged:     boolean
  flag_reason:    string | null
  created_at:     string
  delivered_at:   string | null
  campaign:       { id: string; name: string } | null
  promotion:      { id: string; name: string; type: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending:   { label: 'Pending',   icon: Clock,        color: 'bg-yellow-500/20 text-yellow-400' },
  approved:  { label: 'Approved',  icon: CheckCircle,  color: 'bg-blue-500/20 text-blue-400'    },
  delivered: { label: 'Delivered', icon: Truck,        color: 'bg-green-500/20 text-green-400'  },
  rejected:  { label: 'Rejected',  icon: XCircle,      color: 'bg-red-500/20 text-red-400'      },
  expired:   { label: 'Expired',   icon: Clock,        color: 'bg-slate-500/20 text-slate-400'  },
}

interface ClaimsTableProps {
  claims:    ClaimRow[]
  onRefresh: () => void
}

export default function ClaimsTable({ claims, onRefresh }: ClaimsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (claims.length === 0) {
    return (
      <div className="text-center py-16">
        <Mail className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No claims found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {claims.map((claim) => {
        const config  = STATUS_CONFIG[claim.claim_status] ?? STATUS_CONFIG.pending
        const Icon    = config.icon
        const expanded = expandedId === claim.id

        return (
          <div
            key={claim.id}
            className={cn(
              'bg-slate-800/50 border rounded-xl overflow-hidden transition-all',
              claim.is_flagged ? 'border-red-500/30' : 'border-slate-700/50',
              expanded && 'border-slate-600'
            )}
          >
            {/* Row */}
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-800/80 transition"
              onClick={() => setExpandedId(expanded ? null : claim.id)}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300 text-xs font-bold uppercase">
                  {claim.customer_email.charAt(0)}
                </span>
              </div>

              {/* Customer info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm font-medium truncate">
                    {claim.customer_name ?? claim.customer_email}
                  </p>
                  {claim.customer_name && (
                    <p className="text-slate-500 text-xs truncate hidden sm:block">{claim.customer_email}</p>
                  )}
                  {claim.is_flagged && (
                    <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Flagged
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {claim.rating && (
                    <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                      <Star className="w-3 h-3 fill-current" />{claim.rating}
                    </span>
                  )}
                  {claim.campaign && (
                    <span className="text-slate-500 text-xs truncate">{claim.campaign.name}</span>
                  )}
                  <span className="text-slate-600 text-xs">{formatDate(claim.created_at)}</span>
                </div>
              </div>

              {/* Status badge */}
              <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0', config.color)}>
                <Icon className="w-3 h-3" />
                {config.label}
              </div>

              {/* Actions */}
              <div onClick={(e) => e.stopPropagation()}>
                <ClaimActions
                  claimId={claim.id}
                  status={claim.claim_status}
                  isFlagged={claim.is_flagged}
                  onSuccess={onRefresh}
                />
              </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
              <div className="px-5 pb-5 pt-0 border-t border-slate-700/50 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {[
                    { label: 'Order ID',   value: claim.order_id ?? '—' },
                    { label: 'Platform',   value: claim.platform ?? '—' },
                    { label: 'Promotion',  value: claim.promotion?.name ?? 'None' },
                    { label: 'Delivered',  value: claim.delivered_at ? formatDate(claim.delivered_at) : '—' },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-slate-500 text-xs">{item.label}</p>
                      <p className="text-slate-300 text-sm truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                {claim.feedback_text && (
                  <div className="bg-slate-900 rounded-lg p-3">
                    <p className="text-slate-500 text-xs mb-1">Customer feedback</p>
                    <p className="text-slate-300 text-sm">{claim.feedback_text}</p>
                  </div>
                )}

                {claim.flag_reason && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-xs">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      {claim.flag_reason.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
