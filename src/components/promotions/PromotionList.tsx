'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Gift, Tag, Download, CreditCard, MapPin, Mail, Pencil, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/helpers'

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  coupon_code:      { label: 'Coupon Code',      icon: Tag,       color: 'bg-green-500/20 text-green-400' },
  digital_download: { label: 'Digital Download', icon: Download,  color: 'bg-blue-500/20 text-blue-400' },
  gift_card:        { label: 'Gift Card',         icon: CreditCard,color: 'bg-yellow-500/20 text-yellow-400' },
  physical_gift:    { label: 'Physical Gift',     icon: MapPin,    color: 'bg-pink-500/20 text-pink-400' },
  email_only:       { label: 'Email Only',        icon: Mail,      color: 'bg-slate-500/20 text-slate-400' },
}

type Promo = {
  id: string; name: string; type: string; is_active: boolean
  coupon_code?: string | null; discount_value?: number | null; discount_type?: string | null; discount_currency?: string | null
  gift_card_value?: number | null; redemptions_count: number; max_redemptions?: number | null; created_at: string
}

export default function PromotionList({ promotions: initial }: { promotions: Promo[] }) {
  const [promos, setPromos] = useState(initial)
  const [toggling, setToggling] = useState<string | null>(null)

  const toggleActive = async (id: string, currentActive: boolean) => {
    setToggling(id)
    await fetch(`/api/promotions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentActive }),
    })
    setPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentActive } : p))
    setToggling(null)
  }

  return (
    <div className="space-y-3">
      {promos.map((promo) => {
        const typeConfig = TYPE_CONFIG[promo.type] ?? TYPE_CONFIG.email_only
        const Icon = typeConfig.icon
        return (
          <div
            key={promo.id}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-5 py-4 hover:border-slate-600 transition flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.color.replace('text-', 'bg-').replace('/20', '/10')} border border-current/20`}>
              <Icon className={`w-5 h-5 ${typeConfig.color.split(' ')[1]}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-white font-medium text-sm truncate">{promo.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
                {!promo.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Inactive</span>
                )}
              </div>
              <p className="text-slate-500 text-xs">
                {promo.redemptions_count} redemptions
                {promo.max_redemptions ? ` / ${promo.max_redemptions} max` : ''}
                {' · '}Created {formatDate(promo.created_at)}
              </p>
            </div>

            {/* Discount / coupon badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {promo.type === 'coupon_code' && (
                <div className="flex items-center gap-2">
                  {promo.discount_value && (
                    <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                      {promo.discount_type === 'fixed_value'
                        ? `${promo.discount_currency ?? '$'}${promo.discount_value} Off`
                        : `${promo.discount_value}% Off`}
                    </span>
                  )}
                  {promo.coupon_code && (
                    <code className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded font-mono">
                      {promo.coupon_code}
                    </code>
                  )}
                </div>
              )}
              {promo.type === 'gift_card' && promo.gift_card_value && (
                <span className="text-yellow-400 text-sm font-semibold">${promo.gift_card_value}</span>
              )}

              {/* Active toggle */}
              <button
                onClick={() => toggleActive(promo.id, promo.is_active)}
                disabled={toggling === promo.id}
                title={promo.is_active ? 'Deactivate' : 'Activate'}
                className="p-1.5 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
              >
                {promo.is_active
                  ? <CheckCircle className="w-4 h-4 text-green-400" />
                  : <XCircle    className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                }
              </button>

              {/* Edit */}
              <Link
                href={`/dashboard/promotions/${promo.id}`}
                className="p-1.5 text-slate-400 hover:text-purple-400 rounded-lg hover:bg-slate-700 transition"
                title="Edit promotion"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
