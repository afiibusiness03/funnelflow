import { cn } from '@/lib/utils/helpers'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  change?: number        // percentage change vs last period
  changePeriod?: string  // e.g. "vs last 30 days"
  description?: string
  className?: string
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-purple-400',
  iconBg = 'bg-purple-500/20',
  change,
  changePeriod = 'vs last 30 days',
  description,
  className,
}: StatsCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const isNeutral  = change !== undefined && change === 0

  return (
    <div className={cn(
      'bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all',
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>

        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            isPositive && 'bg-green-500/20 text-green-400',
            isNegative && 'bg-red-500/20 text-red-400',
            isNeutral  && 'bg-slate-700 text-slate-400',
          )}>
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {isNeutral  && <Minus className="w-3 h-3" />}
            {isPositive && '+'}{change}%
          </div>
        )}
      </div>

      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">{title}</p>
        <p className="text-white text-2xl font-bold leading-tight">{value}</p>
        {(description || changePeriod) && (
          <p className="text-slate-500 text-xs mt-1">
            {description ?? changePeriod}
          </p>
        )}
      </div>
    </div>
  )
}
