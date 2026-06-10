import { useState, useEffect } from 'react'
import { Clock, Calendar } from 'lucide-react'

export function RealTimeClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  const formatDate = (date: Date) => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
    const dayName = days[date.getDay()]
    return `${dayName}, ${date.toLocaleDateString('vi-VN')}`
  }

  return (
    <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-2xl bg-slate-100/50 text-slate-600 border border-slate-200/50 backdrop-blur-sm dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/40">
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-brand-500 dark:text-brand-400" />
        <span className="text-xs font-medium whitespace-nowrap">{formatDate(time)}</span>
      </div>
      <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
      <div className="flex items-center gap-2 min-w-[70px]">
        <Clock size={14} className="text-brand-500 dark:text-brand-400" />
        <span className="text-xs font-mono font-bold">{formatTime(time)}</span>
      </div>
    </div>
  )
}
