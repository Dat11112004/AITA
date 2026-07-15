import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { api, type SubjectRow, type ClassRow } from '@/lib/api'
import { 
  Loader2, Users, BookOpen, Bell, LayoutGrid,
  GraduationCap, Send, ArrowLeft, Package, Download, Search, Info,
  Calendar, ChevronDown
} from 'lucide-react'

export function SubjectWorkspace() {
  const { id: subjectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const semesterId = searchParams.get('semesterId')

  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState<SubjectRow | null>(null)
  const [classes, setClasses] = useState<ClassRow[]>([])
  
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'students' | 'announcements'>('overview')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [students, setStudents] = useState<any[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [subData, clsData] = await Promise.all([
          api.getSubjects(1, 1000),
          api.getClasses(1, 1000) // Tối ưu: Đảm bảo fetch toàn bộ lớp học của giảng viên, tránh bị limit 10 mặc định
        ])
        
        const foundSubject = subData?.find(s => s.id === subjectId) || null
        setSubject(foundSubject)

        const subjectClasses = clsData?.filter(c => 
          (c.subject as any)?.id === subjectId && 
          (c.semester as any)?.id === semesterId
        ) || []
        setClasses(subjectClasses)
        
        // Auto-select the first class as requested
        if (subjectClasses.length > 0) {
          setSelectedClassId(subjectClasses[0].id)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [subjectId, semesterId])

  useEffect(() => {
    let ignore = false // Tối ưu: Ngăn chặn Race Condition khi fetch dữ liệu liên tục
    if (!subjectId) return
    const fetchStudents = async () => {
      setLoadingStudents(true)
      try {
         const res = await api.getSubjectStudents(subjectId, semesterId, selectedClassId, currentPage, 10)
         if (!ignore) {
           setStudents(res.data || [])
           setTotalStudents(res.total || 0)
           setTotalPages(res.totalPages || 1)
         }
      } catch (err) {
         if (!ignore) console.error('Lỗi khi tải sinh viên:', err)
      } finally {
         if (!ignore) setLoadingStudents(false)
      }
    }
    fetchStudents()
    return () => { ignore = true }
  }, [subjectId, semesterId, selectedClassId, currentPage])

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>

  if (!subject) return <div className="p-8 text-center text-slate-500">Không tìm thấy môn học</div>

  const getAvatarInitials = (name: string) => {
    if (!name) return 'SV'
    const parts = name.split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-purple-100 text-purple-600',
      'bg-indigo-100 text-indigo-600',
      'bg-orange-100 text-orange-600',
      'bg-emerald-100 text-emerald-600',
      'bg-pink-100 text-pink-600'
    ]
    if (!id) return colors[0]
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-500';
    if (score >= 6.5) return 'text-blue-500';
    return 'text-orange-500';
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-12 px-6 lg:px-8">
      <div className="mb-2 animate-fade-in">
          <button onClick={() => navigate(`/lecturer/classes`)} className="text-slate-400 hover:text-brand-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium">
              <ArrowLeft size={20} />
              Trở về danh sách lớp học
          </button>
      </div>

      {/* Workspace Header */}
      <div className="flex items-start justify-between">
         <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
               <Package className="w-7 h-7 text-white" />
            </div>
            <div>
               <h1 className="text-[28px] font-bold text-slate-800 tracking-tight">{subject.name}</h1>
               
               <div className="inline-flex items-center bg-white border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-xl overflow-hidden mt-3 text-sm font-semibold transition-all hover:border-slate-300">
                 <div className="flex items-center gap-2 px-4 py-2 text-slate-700">
                   <Calendar size={15} className="text-slate-400" />
                   {semesterId ? "Kỳ 3 - Summer 2026" : "Học kỳ hiện tại"} 
                 </div>

                 <div className="w-px h-5 bg-slate-200"></div>

                 <div className="px-4 py-2 flex items-center gap-2 bg-slate-50/50 text-slate-600">
                   {selectedClassId === 'all' ? (
                     <div className="flex items-center gap-2">
                       <Users size={15} className="text-slate-400" />
                       Tất cả {classes.length} lớp
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-brand-700 font-bold bg-brand-50/50 px-2 py-0.5 rounded-md -ml-2 -my-1">
                       <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600"></span>
                       </span>
                       Lớp {classes.find(c => c.id === selectedClassId)?.code}
                     </div>
                   )}
                 </div>
               </div>
            </div>
         </div>
         
         {/* Custom Dropdown */}
         <div className="relative shrink-0">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-brand-600 hover:bg-brand-700 transition-colors rounded-xl shadow-md text-white px-5 py-2.5 flex items-center gap-3 text-sm font-semibold h-11"
          >
            <span className="truncate max-w-[150px]">
              {selectedClassId === 'all' 
                ? 'Tất cả các lớp' 
                : classes.find(c => c.id === selectedClassId)?.code 
                  ? `Lớp ${classes.find(c => c.id === selectedClassId)?.code}`
                  : 'Tất cả các lớp'}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 py-1.5">
                <button
                  onClick={() => { setSelectedClassId('all'); setCurrentPage(1); setIsDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${selectedClassId === 'all' ? 'bg-brand-50 text-brand-600' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  Tất cả các lớp
                  {selectedClassId === 'all' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                </button>
                {classes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedClassId(c.id); setCurrentPage(1); setIsDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${selectedClassId === c.id ? 'bg-brand-50 text-brand-600' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    Lớp {c.code}
                    {selectedClassId === c.id && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white px-4 rounded-2xl border border-slate-200 shadow-sm mt-8 overflow-x-auto">
        {[
          { id: 'overview', icon: LayoutGrid, label: 'Tổng quan' },
          { id: 'assignments', icon: BookOpen, label: 'Bài tập & Đề thi' },
          { id: 'students', icon: Users, label: 'Sinh viên' },
          { id: 'announcements', icon: Bell, label: 'Thông báo' },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold transition-colors relative whitespace-nowrap ${isActive ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl my-1 py-3'}`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand-600 rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'overview' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Table Header */}
            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <GraduationCap className="w-6 h-6 text-brand-600" />
                Bảng điểm tổng hợp
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm sinh viên..." 
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-[250px] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-shadow"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 shadow-sm transition-colors shrink-0">
                  <Download className="w-4 h-4" /> Xuất Excel
                </button>
              </div>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[13px] text-slate-500 border-t border-b border-slate-100 bg-[#FAFAFC]">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-12 text-center">#</th>
                    <th className="px-6 py-4 font-semibold">Sinh viên</th>
                    <th className="px-6 py-4 font-semibold text-center leading-relaxed">Assignment 1<br/><span className="font-normal">(10%)</span></th>
                    <th className="px-6 py-4 font-semibold text-center leading-relaxed">Assignment 2<br/><span className="font-normal">(10%)</span></th>
                    <th className="px-6 py-4 font-semibold text-center leading-relaxed">Đề thi TH<br/><span className="font-normal">(30%)</span></th>
                    <th className="px-6 py-4 font-semibold text-center leading-relaxed">Đề thi CK<br/><span className="font-normal">(50%)</span></th>
                    <th className="px-6 py-4 font-semibold text-center leading-relaxed">Tổng kết<br/><span className="font-normal">(10)</span></th>
                    <th className="px-6 py-4 font-semibold text-center">Xếp loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingStudents ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                        Đang tải danh sách sinh viên...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">Không có sinh viên nào.</td>
                    </tr>
                  ) : students.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5 text-slate-400 font-medium text-center">{(currentPage - 1) * 10 + idx + 1}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(s.id)}`}>
                            {getAvatarInitials(s.name)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{s.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{s.studentCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-400">—</td>
                      <td className="px-6 py-5 text-center font-bold text-slate-400">—</td>
                      <td className="px-6 py-5 text-center font-bold text-slate-400">—</td>
                      <td className="px-6 py-5 text-center font-bold text-slate-400">—</td>
                      <td className="px-6 py-5 text-center font-extrabold text-slate-800 text-[15px]">—</td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold inline-flex items-center justify-center min-w-[80px] bg-slate-100 text-slate-500">
                          —
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination for Overview */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Hiển thị <span className="font-semibold text-slate-700">{(currentPage - 1) * 10 + 1}</span> đến <span className="font-semibold text-slate-700">{Math.min(currentPage * 10, totalStudents)}</span> trong số <span className="font-semibold text-slate-700">{totalStudents}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Trước
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded text-sm font-medium ${currentPage === i + 1 ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-[#FAFAFC] flex items-center gap-2 text-[13px] text-brand-600">
              <Info className="w-4 h-4" />
              <span className="text-slate-500">Điểm tổng kết được tính theo tỷ lệ: Assignment 1 (10%) + Assignment 2 (10%) + Đề thi TH (30%) + Đề thi CK (50%).</span>
            </div>
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === 'assignments' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex items-center justify-center flex-col text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Quản lý Bài tập & Đề thi</h3>
            <p className="text-slate-500 max-w-md">
              Chưa có bài tập nào được tạo.
            </p>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Sinh viên</h2>
              <span className="px-3 py-1 bg-brand-50 text-brand-600 font-bold text-xs rounded-full">
                {totalStudents} sinh viên
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[13px] text-slate-500 border-b border-slate-200 bg-[#FAFAFC]">
                  <tr>
                    <th className="px-8 py-4 font-semibold">Họ và tên</th>
                    <th className="px-8 py-4 font-semibold">MSSV</th>
                    <th className="px-8 py-4 font-semibold">Lớp</th>
                    <th className="px-8 py-4 font-semibold">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingStudents ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                        Đang tải danh sách sinh viên...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-500">Không có sinh viên nào.</td>
                    </tr>
                  ) : students.map((s, i) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(s.id)}`}>
                            {getAvatarInitials(s.name)}
                          </div>
                          <span className="font-bold text-slate-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-slate-500 font-mono text-[13px]">{s.studentCode}</span>
                      </td>
                      <td className="px-8 py-4 text-slate-500 font-medium">
                        {s.classCode}
                      </td>
                      <td className="px-8 py-4 text-slate-500">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination for Students */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-[#FAFAFC]">
                <span className="text-sm text-slate-500">
                  Hiển thị <span className="font-semibold text-slate-700">{(currentPage - 1) * 10 + 1}</span> đến <span className="font-semibold text-slate-700">{Math.min(currentPage * 10, totalStudents)}</span> trong số <span className="font-semibold text-slate-700">{totalStudents}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 bg-white"
                  >
                    Trước
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded text-sm font-medium ${currentPage === i + 1 ? 'bg-brand-600 text-white border-brand-600' : 'text-slate-600 hover:bg-slate-50 border border-slate-200 bg-white'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 bg-white"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column */}
            <div className="w-full md:w-[280px] flex-shrink-0">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-brand-600" /> Sắp đến hạn
                </h3>
                <p className="text-sm text-slate-500 italic mb-6">Không có công việc nào sắp đến hạn!</p>
                <button className="text-sm font-bold text-brand-600 hover:underline focus:outline-none">Xem tất cả bài tập</button>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="flex-1">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold flex-shrink-0">
                    GV
                  </div>
                  <div className="flex-1 space-y-4">
                    <textarea 
                      placeholder="Thông báo nội dung nào đó cho lớp học của bạn..."
                      className="w-full min-h-[100px] p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none placeholder-slate-400"
                    ></textarea>
                    <div className="flex justify-end gap-3">
                      <button className="px-5 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        Hủy
                      </button>
                      <button className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors">
                        <Send className="w-4 h-4" /> Đăng
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
