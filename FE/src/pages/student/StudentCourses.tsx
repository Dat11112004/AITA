import { useState } from 'react'
import { Search, RotateCw, Calendar, RefreshCcw, Inbox, Filter } from 'lucide-react'
import { useAuth } from '@/store/AuthContext'

const TABS = ['Courses', 'Projects', 'Title Confirmation', 'Reference']

const SEMESTERS = [
  { id: 'SUMMER2025', label: 'SUMMER 2025' },
  { id: 'SPRING2025', label: 'SPRING 2025' },
  { id: 'FALL2024', label: 'FALL 2024' },
]

export function StudentCourses() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Courses')
  const [semester, setSemester] = useState('SUMMER2025')
  const [search, setSearch] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Top Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-white/50 dark:bg-[#151821]/50 backdrop-blur-md rounded-2xl w-fit border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300
              ${activeTab === tab 
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm scale-100' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 scale-95 hover:scale-100'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
            Welcome back, {user?.fullName || 'Student'}
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Courses
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Semester Selector */}
          <div className="relative">
            <div className="absolute -top-5 left-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Semester
            </div>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-8 px-4 py-2.5 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
            >
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {SEMESTERS.find(s => s.id === semester)?.label}
              </span>
              <Filter size={16} className="text-slate-400" />
            </button>

            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDropdownOpen(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {SEMESTERS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSemester(s.id)
                        setIsDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        semester === s.id ? 'text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/20' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Icon Button */}
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 text-white cursor-pointer hover:scale-105 transition-transform">
            <Calendar size={20} />
          </div>

          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 h-11 px-4 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group"
          >
            <RefreshCcw size={16} className={`transition-transform duration-500 ${isRefreshing ? 'rotate-180' : 'group-hover:rotate-90'}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <RotateCw size={14} />
        </div>
        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
          Cached 0 min ago. Data auto-refreshes every 60 min.
        </p>
      </div>

      {/* Search and Content */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            0 courses
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-20 px-4 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 backdrop-blur-sm">
          <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[#1a1d27] shadow-xl shadow-slate-200/50 dark:shadow-black/20 flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800 animate-bounce">
            <Inbox size={32} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No courses available</h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm leading-relaxed">
            Courses for this semester will appear here once assigned.
          </p>
        </div>
      </div>
    </div>
  )
}
