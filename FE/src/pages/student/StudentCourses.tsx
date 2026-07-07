import { useState, useEffect, useCallback } from 'react'
import { Search, RotateCw, Calendar, RefreshCcw, Inbox, Filter, BookOpen, Loader2 } from 'lucide-react'
import { useAuth } from '@/store/AuthContext'
import { api, type ClassRow } from '@/lib/api'
import { useNavigate } from 'react-router-dom'

const TABS = ['Courses', 'Projects', 'Title Confirmation', 'Reference']

export function StudentCourses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Courses')
  
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)

  const [semester, setSemester] = useState('')
  const [search, setSearch] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const loadData = useCallback(() => {
    api.getClasses().then(res => {
      const cls = res || []
      setClasses(cls)
      const sems = Array.from(new Set(cls.map(c => typeof c.semester === 'object' ? (c.semester as any).code : c.semester)))
      if (sems.length > 0 && !semester) setSemester(sems[0] as string)
    }).finally(() => {
      setLoading(false)
    })
  }, [semester])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadData()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const semesters = Array.from(new Set(classes.map(c => typeof c.semester === 'object' ? (c.semester as any).code : c.semester))).filter(Boolean) as string[]

  const filteredClasses = classes.filter(c => {
    const sCode = typeof c.semester === 'object' ? (c.semester as any).code : c.semester
    if (sCode !== semester && semester) return false
    
    if (search) {
      const cCode = typeof c.subject === 'object' ? (c.subject as any).code : c.subject || ''
      const cName = typeof c.subject === 'object' ? (c.subject as any).name : ''
      const searchLower = search.toLowerCase()
      if (!cCode.toLowerCase().includes(searchLower) && !cName.toLowerCase().includes(searchLower) && !c.code.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    return true
  })



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
                {semester || 'Chọn học kỳ'}
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
                  {semesters.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setSemester(s)
                        setIsDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        semester === s ? 'text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/20' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {s}
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
            {filteredClasses.length} courses
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>
        ) : filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 backdrop-blur-sm">
            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[#1a1d27] shadow-xl shadow-slate-200/50 dark:shadow-black/20 flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800 animate-bounce">
              <Inbox size={32} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No courses available</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm leading-relaxed">
              Courses for this semester will appear here once assigned.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map(cls => (
              <div 
                key={cls.id}
                onClick={() => navigate('/student/classes')}
                className="group bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-2.5 py-1 rounded-full">
                      {typeof cls.subject === 'object' ? (cls.subject as any).code : cls.subject}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Lớp {cls.code}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                    {typeof cls.subject === 'object' ? (cls.subject as any).name : 'Môn học'}
                  </h3>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <BookOpen size={14} />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    GV: {cls.lecturers?.[0]?.fullName || cls.lecturers?.[0]?.name || 'Chưa phân công'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
