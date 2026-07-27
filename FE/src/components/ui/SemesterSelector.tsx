import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { api } from '@/lib/api'

export type SemesterOption = string

export interface SemesterItem {
  value: string
  label: string
  isCurrent?: boolean
}

export interface SemesterSelectorProps {
  selectedSemester: string
  onChange: (semester: string) => void
  className?: string
}

export const INITIAL_SEMESTERS: SemesterItem[] = [
  { value: 'SUMMER2026', label: 'SUMMER2026', isCurrent: true }
]

export function SemesterSelector({ 
  selectedSemester, 
  onChange, 
  className = '' 
}: SemesterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [semesters, setSemesters] = useState<SemesterItem[]>(INITIAL_SEMESTERS)
  const ref = useRef<HTMLDivElement>(null)

  // Dynamically load ONLY real Admin-created semesters from DB API
  useEffect(() => {
    let alive = true
    
    Promise.all([
      api.getSemesters().catch(() => []),
      api.getStudentDashboard().catch(() => null)
    ]).then(([semestersRes, dashboardRes]) => {
      if (!alive) return

      const foundSeasons = new Map<string, SemesterItem>()
      
      // 1. Check DB Semesters table
      if (Array.isArray(semestersRes) && semestersRes.length > 0) {
        semestersRes.forEach((s: any, idx: number) => {
          const rawStr = String(s?.season || s?.Season || s?.code || s?.Code || s?.name || s?.title || '').trim()
          if (rawStr && !/^KỲ/i.test(rawStr) && !/^KY/i.test(rawStr)) {
            const val = rawStr.toUpperCase()
            foundSeasons.set(val, {
              value: val,
              label: val,
              isCurrent: s.isActive ?? s.isCurrent ?? s.IsCurrent ?? (idx === 0)
            })
          }
        })
      }

      // 2. Check enrolled classes for semester tags
      if (dashboardRes?.enrolledClasses && Array.isArray(dashboardRes.enrolledClasses)) {
        dashboardRes.enrolledClasses.forEach((cls: any) => {
          const semCode = cls?.semester || cls?.Semester?.Code || cls?.semesterCode
          if (semCode && typeof semCode === 'string' && !/^KỲ/i.test(semCode)) {
            const val = semCode.toUpperCase()
            if (!foundSeasons.has(val)) {
              foundSeasons.set(val, { value: val, label: val, isCurrent: false })
            }
          }
        })
      }

      // If no valid seasons found in DB yet, fallback to SUMMER2026
      if (foundSeasons.size === 0) {
        foundSeasons.set('SUMMER2026', { value: 'SUMMER2026', label: 'SUMMER2026', isCurrent: true })
      }

      setSemesters(Array.from(foundSeasons.values()))
    }).catch(() => {})

    return () => { alive = false }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentSem = semesters.find(s => s.isCurrent) || semesters[0]
  const selectedOpt = semesters.find(o => o.value === selectedSemester) || currentSem

  return (
    <div className={`relative inline-block text-left ${className}`} ref={ref}>
      {/* Floating Label matching Screenshot */}
      <label className="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 pl-1">
        Semester
      </label>

      {/* Selector Box */}
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl border border-indigo-400/80 dark:border-indigo-500/80 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs sm:text-sm tracking-wide shadow-sm hover:border-indigo-600 hover:bg-indigo-50 transition-all focus:outline-none ring-2 ring-indigo-500/20 min-w-[160px]"
        >
          <span className="truncate uppercase font-black tracking-wider text-indigo-700 dark:text-indigo-300">
            {selectedOpt.label}
          </span>

          <div className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400">
            {selectedSemester !== currentSem.value && (
              <X 
                size={14} 
                className="hover:text-rose-600 transition-colors p-0.5 rounded-full hover:bg-rose-100" 
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(currentSem.value)
                }}
              />
            )}
            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
          </div>
        </button>

        {/* Dropdown Menu - ONLY shows real active seasons in DB */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-56 rounded-2xl bg-white dark:bg-[#1a1d28] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-1.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Danh sách Mùa học</span>
              <span className="text-[9px] font-semibold text-indigo-500">Tự động đồng bộ</span>
            </div>
            <div className="py-1 max-h-60 overflow-y-auto space-y-0.5">
              {semesters.map((opt) => {
                const isSelected = selectedSemester === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left uppercase tracking-wider ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-black shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {opt.label}
                      {opt.isCurrent && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Hiện tại
                        </span>
                      )}
                    </span>
                    {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
