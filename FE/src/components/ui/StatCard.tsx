import type { StatMetric } from '@/types'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

export function StatCard({ label, value, hint, trend, trendLabel }: StatMetric) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-400'

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {(hint || trendLabel) && (
        <div className={`mt-2 flex items-center gap-1 text-xs ${trend ? trendColor : 'text-slate-500'}`}>
          {trend && <TrendIcon size={14} />}
          <span>{trendLabel ?? hint}</span>
        </div>
      )}
    </div>
  )
}
