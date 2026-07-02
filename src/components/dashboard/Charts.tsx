'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

// ─── Scans Over Time ────────────────────────────────────────────
interface ScansChartProps {
  data: Array<{ date: string; scans: number; completions: number }>
}

export function ScansChart({ data }: ScansChartProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-1">Scans & Completions</h3>
      <p className="text-slate-400 text-xs mb-5">Last 30 days</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scansGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="completionsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#94a3b8' }}
          />
          <Area type="monotone" dataKey="scans"       stroke="#a855f7" strokeWidth={2} fill="url(#scansGrad)"       name="Scans" />
          <Area type="monotone" dataKey="completions" stroke="#22d3ee" strokeWidth={2} fill="url(#completionsGrad)" name="Completions" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-slate-400 text-xs">Scans</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-slate-400 text-xs">Completions</span>
        </div>
      </div>
    </div>
  )
}

// ─── Rating Distribution ─────────────────────────────────────────
interface RatingChartProps {
  data: Record<number, number>  // {1: 5, 2: 3, 3: 8, 4: 30, 5: 54}
}

const RATING_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#a855f7']

export function RatingChart({ data }: RatingChartProps) {
  const chartData = [1, 2, 3, 4, 5].map((star) => ({
    star: `${star}★`,
    count: data[star] ?? 0,
  }))

  const total = Object.values(data).reduce((a, b) => a + b, 0)
  const avgRating = total === 0
    ? 0
    : Object.entries(data).reduce((sum, [star, count]) => sum + Number(star) * count, 0) / total

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-sm mb-1">Rating Distribution</h3>
          <p className="text-slate-400 text-xs">{total} total ratings</p>
        </div>
        <div className="text-right">
          <p className="text-white text-2xl font-bold">{avgRating.toFixed(1)}</p>
          <p className="text-slate-400 text-xs">avg rating</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="star" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#e2e8f0' }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
          <Bar dataKey="count" name="Reviews" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={RATING_COLORS[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Funnel Drop-off ─────────────────────────────────────────────
interface FunnelChartProps {
  data: { step: string; count: number; rate: number }[]
}

export function FunnelDropoffChart({ data }: FunnelChartProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-1">Funnel Drop-off</h3>
      <p className="text-slate-400 text-xs mb-5">Where customers leave</p>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300 text-xs">{item.step}</span>
              <span className="text-slate-400 text-xs">{item.count.toLocaleString()} ({item.rate}%)</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${item.rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
