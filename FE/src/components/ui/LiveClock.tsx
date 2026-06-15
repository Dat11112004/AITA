import { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, CheckCircle2, Trash2, AlertCircle } from 'lucide-react'
import { useNotes } from '@/hooks/useNotes'

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function LiveClock() {
  const [time, setTime] = useState(new Date())
  const [isOpen, setIsOpen] = useState(false)
  
  // Custom hook for Notes
  const { notes, addNote, deleteNote, toggleNoteStatus, getNotesForDate, getCurrentStatus } = useNotes()
  
  // Date displayed in the calendar
  const [viewDate, setViewDate] = useState(new Date())
  
  // Day selected to view/add notes
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // New note form state
  const [newNoteTime, setNewNoteTime] = useState('00:00')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isAddingMode, setIsAddingMode] = useState(false)
  
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSelectedDate(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatterTime = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
  const formatterDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit'
  })
  const dateStr = formatterDate.format(time).replace(/,/g, '')

  // System time parts
  const currentYear = time.getFullYear()
  const currentMonth = time.getMonth()
  const currentDay = time.getDate()

  // View navigation parts
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1 
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blankDays = Array.from({ length: firstDay }, (_, i) => i)

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date(viewYear, viewMonth - 1, 1))
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date(viewYear, viewMonth + 1, 1))
  }

  const handleResetToToday = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date())
    setSelectedDate(null)
  }

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(viewYear, viewMonth, day))
    setIsAddingMode(false)
  }

  const formatDateStr = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const handleAddNote = () => {
    if (!selectedDate || !newNoteContent.trim()) return
    addNote(formatDateStr(selectedDate), newNoteTime, newNoteContent)
    setNewNoteContent('')
    setIsAddingMode(false)
  }

  // Get status
  const { hasPending, hasOverdue } = getCurrentStatus(time)

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Clock Trigger */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (isOpen) setSelectedDate(null)
        }}
        className={`relative flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all ${
           isOpen 
             ? 'border-brand-300 dark:border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 ring-2 ring-brand-500/20' 
             : hasOverdue 
                ? 'border-red-400 dark:border-red-500/50 bg-red-50 dark:bg-red-900/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:-translate-y-0.5'
                : hasPending
                  ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 hover:-translate-y-0.5'
                  : 'border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:-translate-y-0.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]'
        }`}
      >
        {/* Urgent Notification Dot */}
        {hasOverdue && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 ring-2 ring-white dark:ring-[#0f1117]"></span>
          </span>
        )}
        {!hasOverdue && hasPending && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 ring-2 ring-white dark:ring-[#0f1117]"></span>
          </span>
        )}

        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm border transition-colors ${
          isOpen 
            ? 'bg-brand-500 text-white border-brand-600 dark:bg-brand-500/80 dark:border-brand-500' 
            : hasOverdue
               ? 'bg-red-500 text-white border-red-600'
               : hasPending
                  ? 'bg-amber-400 text-slate-900 border-amber-500'
                  : 'bg-white text-brand-600 border-slate-100 dark:bg-[#0f1117] dark:border-slate-800 dark:text-brand-400'
        }`}>
          {hasOverdue ? <AlertCircle size={14} /> : <CalendarIcon size={14} />}
        </div>
        <div className="flex flex-col items-start justify-center">
          <span className={`text-[13px] font-bold font-mono tracking-wide tabular-nums leading-none ${
            hasOverdue ? 'text-red-700 dark:text-red-400' : hasPending ? 'text-amber-800 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'
          }`}>
            {formatterTime.format(time)}
          </span>
          <span className={`text-[9px] font-bold uppercase mt-1 leading-none tracking-wider ${
             hasOverdue ? 'text-red-500/80 dark:text-red-400/80' : hasPending ? 'text-amber-600/80 dark:text-amber-500/80' : 'text-slate-400 dark:text-slate-500'
          }`}>
            {dateStr}
          </span>
        </div>
      </button>

      {/* Calendar & Notes Popover */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] dark:border-slate-800 dark:bg-[#0f1117]/95 animate-in fade-in slide-in-from-top-2 duration-200 z-50 overflow-hidden">
          
          {!selectedDate ? (
            // ================= MONTH GRID VIEW =================
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <button 
                  onClick={handleResetToToday}
                  className="text-[14px] font-bold text-slate-800 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  Tháng {viewMonth + 1}, {viewYear}
                </button>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handlePrevMonth}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={handleNextMonth}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map((day, idx) => (
                  <div key={day} className={`text-center text-[10px] font-bold tracking-wider uppercase pb-1 ${idx >= 5 ? 'text-brand-500/80' : 'text-slate-400 dark:text-slate-500'}`}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {blankDays.map((_, i) => (
                  <div key={`blank-${i}`} className="h-9 w-9" />
                ))}
                
                {days.map((day) => {
                  const isToday = day === currentDay && viewMonth === currentMonth && viewYear === currentYear;
                  const dateString = formatDateStr(new Date(viewYear, viewMonth, day));
                  const dayNotes = getNotesForDate(dateString);
                  
                  return (
                    <div key={day} className="flex justify-center relative">
                      <button
                         onClick={() => handleDayClick(day)}
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all ${
                          isToday 
                            ? 'bg-gradient-to-br from-[#F37021] to-orange-600 text-white shadow-md shadow-brand-500/30 font-bold scale-105 ring-2 ring-brand-500/20' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-600 dark:hover:text-brand-400'
                        }`}
                      >
                        {day}
                      </button>
                      {/* Note Indicators */}
                      {dayNotes.length > 0 && !isToday && (
                        <div className="absolute bottom-0 flex gap-0.5">
                          {dayNotes.slice(0, 3).map((n, idx) => (
                            <span key={idx} className={`w-1 h-1 rounded-full ${n.status === 'completed' ? 'bg-emerald-400' : 'bg-brand-500'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">Nhấp vào một ngày để quản lý Ghi chú</p>
                {hasPending && <span className="text-[10px] font-bold text-amber-500 animate-pulse">{notes.filter(n=>n.status==='pending').length} tasks pending</span>}
              </div>
            </>
          ) : (
            // ================= DAY NOTES VIEW =================
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 dark:text-white leading-none">
                    Ngày {selectedDate.getDate()} thg {selectedDate.getMonth() + 1}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Ghi chú & Hạn nộp</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[220px] rounded-lg custom-scrollbar pr-2 space-y-2 mb-3">
                {getNotesForDate(formatDateStr(selectedDate)).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-slate-400 dark:text-slate-600">
                    <CalendarIcon size={24} className="mb-2 opacity-50" />
                    <p className="text-xs font-medium">Trống! Chưa có ghi chú lịch.</p>
                  </div>
                ) : (
                  getNotesForDate(formatDateStr(selectedDate)).map(note => (
                    <div key={note.id} className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${note.status === 'completed' ? 'bg-slate-50 border-transparent dark:bg-slate-900/50' : 'bg-white border-slate-200 shadow-sm dark:bg-[#161b27] dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500'}`}>
                      <button 
                        onClick={() => toggleNoteStatus(note.id)}
                        className={`mt-0.5 shrink-0 h-5 w-5 rounded flex items-center justify-center border transition-colors ${
                           note.status === 'completed' 
                             ? 'bg-emerald-500 border-emerald-500 text-white' 
                             : 'border-slate-300 bg-slate-50 text-transparent hover:border-brand-500 dark:border-slate-600 dark:bg-slate-800'
                        }`}
                      >
                        <CheckCircle2 size={12} strokeWidth={3} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock size={10} className={note.status === 'completed' ? 'text-emerald-500' : 'text-brand-500'} />
                          <span className={`text-[10px] font-mono font-bold ${note.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300'}`}>{note.timeStr}</span>
                        </div>
                        <p className={`text-[12px] leading-snug break-words ${note.status === 'completed' ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                          {note.content}
                        </p>
                      </div>
                      <button 
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 text-slate-400 hover:text-red-500 transition-all p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {isAddingMode ? (
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Tạo mới</span>
                    <button onClick={() => setIsAddingMode(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  </div>
                  <input 
                    type="time" 
                    value={newNoteTime}
                    onChange={(e) => setNewNoteTime(e.target.value)}
                    className="w-full mb-2 h-8 rounded-lg border border-slate-200 text-xs px-2 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                  <textarea 
                    placeholder="Mô tả ghi chú hạn nộp, công việc..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full h-16 resize-none rounded-lg border border-slate-200 text-xs p-2 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white custom-scrollbar mb-2"
                  />
                  <button 
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className="w-full h-8 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-[#F37021] disabled:opacity-50 transition-colors"
                  >
                    Lưu Ghi Chú
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingMode(true)}
                  className="w-full h-10 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600 hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                >
                  <Plus size={16} /> Thêm ghi chú mới
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
