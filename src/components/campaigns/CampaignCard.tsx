'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, conversionRate, formatDate } from '@/lib/utils/helpers'
import { QrCode, Pause, Play, BarChart2, MoreHorizontal, Package, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Campaign } from '@/types/database'

interface CampaignCardProps {
  campaign: Campaign
  onStatusChange?: (id: string, status: 'active' | 'paused') => void
}

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-500/20 text-green-400',
  paused:   'bg-yellow-500/20 text-yellow-400',
  draft:    'bg-slate-500/20 text-slate-400',
  archived: 'bg-red-500/20 text-red-400',
}

export default function CampaignCard({ campaign, onStatusChange }: CampaignCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const toggleStatus = async () => {
    setLoading(true)
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    try {
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onStatusChange?.(campaign.id, newStatus)
    } finally {
      setLoading(false)
    }
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleConfirmDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShowDeleteModal(false)
        router.refresh()
      } else {
        alert('Failed to delete campaign')
      }
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setLoading(false)
    }
  }

  const rate = conversionRate(campaign.total_completions, campaign.total_scans)

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all group flex flex-col justify-between h-full">
      <Link href={`/dashboard/campaigns/${campaign.id}`} className="block space-y-4 cursor-pointer flex-1">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition">
              <QrCode className="w-4 h-4 text-purple-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-medium text-sm truncate group-hover:text-purple-400 transition">{campaign.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft)}>
                  {campaign.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Product */}
        {campaign.product && (
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Package className="w-3 h-3" />
            <span className="truncate">{campaign.product.name}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Scans',       value: campaign.total_scans.toLocaleString() },
            { label: 'Completions', value: campaign.total_completions.toLocaleString() },
            { label: 'Conv. Rate',  value: `${rate}%` },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-900 rounded-lg p-2 text-center">
              <p className="text-white text-sm font-bold">{stat.value}</p>
              <p className="text-slate-500 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </Link>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700 mt-4">
        <span className="text-slate-500 text-xs">{formatDate(campaign.created_at)}</span>
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/campaigns/${campaign.id}/analytics`}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
            title="Analytics"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={toggleStatus}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
            title={campaign.status === 'active' ? 'Pause' : 'Resume'}
          >
            {campaign.status === 'active'
              ? <Pause className="w-3.5 h-3.5" />
              : <Play  className="w-3.5 h-3.5" />
            }
          </button>
          <Link
            href={`/dashboard/campaigns/${campaign.id}`}
            className="p-1.5 text-slate-400 hover:text-purple-400 rounded-lg hover:bg-slate-700 transition"
            title="Edit campaign"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowDeleteModal(true)
            }}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
            title="Delete campaign"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
          </button>
        </div>
      </div>

      {/* Modern Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-semibold text-white">Delete Campaign</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-200">{campaign.name}</strong>? All associated statistics, QR events, and feedback submissions will be erased permanently.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white font-medium text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition disabled:opacity-50 shadow-lg shadow-red-600/20"
              >
                {loading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
