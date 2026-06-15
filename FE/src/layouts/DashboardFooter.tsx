import { useState, useEffect } from 'react'
import { Calendar, Bot } from 'lucide-react'

export function DashboardFooter() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fmtTime = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(time)
  const fmtDate = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time)

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-800 dark:bg-[#151821]">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-brand-600 dark:text-brand-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            AITA - Trợ lý giảng dạy AI © {time.getFullYear()} FPT University
          </span>
        </div>
        
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200/60 dark:bg-[#0f1117] dark:border-slate-800/80 shadow-sm">
          <Calendar size={14} className="text-brand-600 dark:text-brand-400" />
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold tracking-wider text-slate-800 dark:text-slate-200 tabular-nums leading-none">
              {fmtTime}
            </span>
            <span className="h-3 w-px bg-slate-300 dark:bg-slate-700"></span>
            <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-none">
              {fmtDate.replace(/,/g, '')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
