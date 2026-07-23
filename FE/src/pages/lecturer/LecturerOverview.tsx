import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getStoredItem, AUTH_STORAGE_KEYS, type ClassRow, type AssignmentRow } from '@/lib/api'
import { BookOpen, Loader2, Users, Bell, CheckCircle2, BarChart2, TrendingUp } from 'lucide-react'
import { APIError } from '@/components/common/ErrorState'
import { BarChart, DonutChart } from '@/components/ui/Charts'

export function LecturerOverview() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [stats, setStats] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const userStr = getStoredItem(AUTH_STORAGE_KEYS.user)
  const user = userStr ? JSON.parse(userStr) : null
  const userName = user?.fullName || user?.email || 'Tiến sĩ'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(-2).toUpperCase()

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([
      api.getClasses(),
      api.getAssignments({ limit: '10' }),
      api.getStatsOverview(),
      api.getSubmissions().catch(() => []) // Fallback in case of error
    ])
      .then(([classesData, assignmentsData, statsData, submissionsData]) => {
        if (alive) {
          setClasses(classesData || [])
          setAssignments(assignmentsData || [])
          setStats(statsData || null)
          setSubmissions(submissionsData || [])
        }
      })
      .catch(err => { if (alive) setError(err) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>
  if (error) return <APIError error={error} onRetry={loadData} />

  // Group all classes by semester
  const groupedClasses: Record<string, { semesterName: string, classes: ClassRow[] }> = {}
  classes.forEach(cls => {
    const semId = (cls.semester as any)?.id || 'unknown'
    const semCode = (cls.semester as any)?.code || 'Kỳ khác'
    
    if (!groupedClasses[semId]) {
      groupedClasses[semId] = { semesterName: semCode, classes: [] }
    }
    groupedClasses[semId].classes.push(cls)
  })

  const groupedClassesArray = Object.values(groupedClasses).sort((a, b) => a.semesterName.localeCompare(b.semesterName))

  // Top 3 classes for the quick view is no longer used, we show grouped list
  
  // Group submissions by assignment for real "Needs Grading" counts
  const pendingByAssignment: Record<string, number> = {}
  submissions.forEach(sub => {
    if (sub.status === 'Pending' || sub.gradingStatus === 'Pending') {
      const examId = sub.exam?.id || sub.ExamId || sub.examId
      if (examId) {
        pendingByAssignment[examId] = (pendingByAssignment[examId] || 0) + 1
      }
    }
  })

  // Real 'To-Do' list based on assignments (Needs grading)
  const todoItems = assignments
    .map(a => ({
      id: a.id,
      title: a.title,
      classCode: 'N/A', 
      dueDate: a.due,
      needsGrading: pendingByAssignment[a.id] || 0, 
    }))
    .filter(a => a.needsGrading > 0)
    .sort((a, b) => b.needsGrading - a.needsGrading)
    .slice(0, 4)

  // Calculate overall graded percentage
  const totalSubmissions = submissions.length
  const gradedSubmissions = submissions.filter(s => s.status === 'Graded' || s.gradingStatus === 'Graded').length


  // 1. Calculate class performance statistics (Thống kê sinh viên và hiệu suất lớp)
  const classStats = groupedClassesArray.flatMap(g => g.classes).map(c => {
      const classSubmissions = submissions.filter(s => s.ClassId === c.id || s.classId === c.id || s.Class?.Id === c.id || s.class?.id === c.id);
      const submittedCount = classSubmissions.length;
      const studentCount = c.studentCount || 0;
      const submitPercent = studentCount > 0 ? Math.round((submittedCount / studentCount) * 100) : 0;
      
      const gradedSubs = classSubmissions.filter(s => (s.status === 'Graded' || s.gradingStatus === 'Graded' || s.GradingStatus === 'Graded') && (s.totalScore !== undefined || s.finalScore !== undefined || s.TotalScore !== undefined || s.FinalScore !== undefined));
      const scores = gradedSubs.map(s => Number(s.totalScore ?? s.TotalScore ?? s.finalScore ?? s.FinalScore ?? 0));
      const gpa = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
      const numericGpa = parseFloat(gpa as string) || 0;
      const status = gpa === '—' ? 'Chưa có' : (numericGpa >= 8.0 ? 'Giỏi' : (numericGpa >= 7.0 ? 'Khá' : 'Cần hỗ trợ'));
      const needsHelpCount = gpa === '—' ? 0 : scores.filter(s => s < 5).length;
      
      return {
          id: c.id,
          name: c.code,
          studentCount,
          submitPercent,
          gpa,
          status,
          needsHelpCount,
          numericGpa
      };
  }).slice(0, 4);

  // 2. Prepare bar chart data for GPA
  const gpaChartData = classStats.slice(0, 3).map((c, i) => {
      const colors = ['#3b82f6', '#ef4444', '#10b981'];
      return {
          label: c.name,
          value: parseFloat(c.gpa),
          color: colors[i % colors.length]
      }
  });

  return (
    <div className="space-y-8 animate-fade-in-up pb-10 font-sans max-w-7xl mx-auto">
        {/* Premium Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
            <div>
                <h1 className="text-[28px] md:text-[32px] font-black text-slate-900 dark:text-white tracking-tight">
                    Chào buổi sáng, {userName}!
                </h1>
                <p className="text-slate-500 font-medium mt-1">Chúc bạn một ngày làm việc hiệu quả.</p>
            </div>
        </div>

        {/* Top 4 KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#151821] p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BookOpen size={64} className="text-brand-600" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400 mb-2 relative z-10">Tổng số lớp</h3>
                <p className="text-4xl font-black text-slate-900 dark:text-white relative z-10">{stats?.classes || 0}</p>
            </div>
            <div className="bg-white dark:bg-[#151821] p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users size={64} className="text-emerald-600" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400 mb-2 relative z-10">Tổng số sinh viên</h3>
                <p className="text-4xl font-black text-slate-900 dark:text-white relative z-10">{stats?.students || 0}</p>
            </div>
            <div className="bg-white dark:bg-[#151821] p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Bell size={64} className="text-amber-500" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400 mb-2 relative z-10">Bài tập cần chấm</h3>
                <p className="text-4xl font-black text-slate-900 dark:text-white relative z-10">{stats?.pending || 0}</p>
            </div>
            <div className="bg-white dark:bg-[#151821] p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <CheckCircle2 size={64} className="text-blue-600" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400 mb-2 relative z-10">Bài tập đã chấm</h3>
                <p className="text-4xl font-black text-slate-900 dark:text-white relative z-10">{gradedSubmissions}</p>
            </div>
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column (Tiến độ chấm bài & Shortcut) */}
            <div className="lg:col-span-3 flex flex-col gap-8">
                <div className="bg-white dark:bg-[#151821] p-6 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden h-full">
                    <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white w-full text-center mb-6 z-10 tracking-tight">Tiến độ chấm bài</h2>
                    <div className="z-10 bg-white/50 dark:bg-transparent rounded-full p-4 backdrop-blur-sm flex-1 flex items-center justify-center">
                        {totalSubmissions > 0 ? (
                            <DonutChart 
                                value={gradedSubmissions} 
                                max={totalSubmissions} 
                                label="" 
                                color="#4f46e5" 
                                size={180} 
                            />
                        ) : (
                            <div className="flex h-[180px] items-center justify-center text-slate-400 text-sm font-medium">Chưa có dữ liệu</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Columns */}
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Thống kê sinh viên và hiệu suất lớp */}
                <div className="bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800">
                    <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500"/> Thống kê sinh viên & hiệu suất
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[14px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Tên lớp</th>
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Tổng sinh viên</th>
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Nộp bài (%)</th>
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Điểm TB (GPA)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classStats.map((cls) => (
                                    <tr key={cls.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="py-4 font-bold text-slate-800 dark:text-slate-200">{cls.name}</td>
                                        <td className="py-4 text-center font-semibold text-slate-600 dark:text-slate-400">{cls.studentCount}</td>
                                        <td className="py-4 text-center font-semibold text-slate-600 dark:text-slate-400">{cls.submitPercent}%</td>
                                        <td className="py-4 text-right font-bold text-brand-600 dark:text-brand-400">{cls.gpa}</td>
                                    </tr>
                                ))}
                                {classStats.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-8 text-slate-400 font-medium">Chưa có dữ liệu lớp học</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Thống kê dữ liệu chi tiết - GPA Bar Chart */}
                <div className="bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800 flex flex-col">
                    <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight flex items-center gap-2">
                        <BarChart2 size={18} className="text-brand-500"/> Thống kê dữ liệu chi tiết
                    </h2>
                    <p className="text-[13px] text-slate-500 mb-8 font-semibold">Điểm trung bình các lớp (GPA)</p>
                    <div className="flex-1 min-h-[220px] flex items-end">
                        {gpaChartData.length > 0 ? (
                            <div className="w-full pb-4">
                                <BarChart data={gpaChartData} height={200} />
                            </div>
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm font-medium">Chưa đủ dữ liệu biểu đồ</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Bảng nâng cao: Hiệu suất sinh viên */}
                <div className="lg:col-span-7 bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[14px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Tên lớp</th>
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Tổng sinh viên</th>
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Nộp bài (%)</th>
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Điểm TB (GPA)</th>
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Phân Loại</th>
                                    <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Cần Hỗ trợ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classStats.map((cls) => (
                                    <tr key={cls.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="py-4 font-bold text-slate-800 dark:text-slate-200">{cls.name}</td>
                                        <td className="py-4 text-center font-semibold text-slate-600 dark:text-slate-400">{cls.studentCount}</td>
                                        <td className="py-4 text-center font-semibold text-slate-600 dark:text-slate-400">{cls.submitPercent}%</td>
                                        <td className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">{cls.gpa}</td>
                                        <td className="py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                cls.status === 'Giỏi' ? 'bg-emerald-100 text-emerald-700' : 
                                                cls.status === 'Khá' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {cls.status}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right font-bold text-rose-600">{cls.needsHelpCount}</td>
                                    </tr>
                                ))}
                                {classStats.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">Chưa có dữ liệu</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Area Chart Mocks */}
                <div className="lg:col-span-5 bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800 flex flex-col">
                    <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-500"/> Xu hướng hiệu suất
                    </h2>
                    <div className="flex-1 relative border-l-2 border-b-2 border-slate-100 dark:border-slate-800 min-h-[180px] flex items-end mb-4 ml-6">
                        <div className="w-full h-full absolute inset-0 flex items-end overflow-hidden rounded-br-lg">
                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                                    </linearGradient>
                                    <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                                    </linearGradient>
                                    <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                                    </linearGradient>
                                </defs>
                                <path d="M0,100 L0,70 L25,50 L50,45 L75,35 L100,25 L100,100 Z" fill="url(#grad1)"/>
                                <path d="M0,100 L0,80 L25,70 L50,60 L75,45 L100,45 L100,100 Z" fill="url(#grad2)"/>
                                <path d="M0,100 L0,85 L25,75 L50,75 L75,60 L100,65 L100,100 Z" fill="url(#grad3)"/>
                            </svg>
                        </div>
                        <div className="absolute -bottom-6 w-full flex justify-between text-[11px] font-bold text-slate-400 px-1">
                            <span>Thứ 1</span>
                            <span>Thứ 2</span>
                            <span>Thứ 3</span>
                            <span>Time</span>
                        </div>
                        <div className="absolute -left-8 h-full flex flex-col justify-between text-[11px] font-bold text-slate-400 py-1 pr-2">
                            <span>70</span>
                            <span>50</span>
                            <span>30</span>
                            <span>0</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* To-Do List */}
            <div className="lg:col-span-12 bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800">
                <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-brand-500"/> Danh sách Cần Xử Lý
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[14px]">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] rounded-tl-lg">Giảng viên</th>
                                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">Action</th>
                                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Nhiệm vụ</th>
                                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right rounded-tr-lg">KPI (Hạn chót)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {todoItems.length > 0 ? todoItems.map(item => (
                                <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors" onClick={() => navigate(`/lecturer/assignments/${item.id}/submissions`)}>
                                    <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">{userInitials}</div>
                                        {userName}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className="bg-rose-100 text-rose-600 border border-rose-200 text-xs px-3 py-1 rounded-full font-bold shadow-sm">{item.needsGrading} bài</span>
                                    </td>
                                    <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">Chấm điểm: <span className="text-brand-600 dark:text-brand-400 hover:underline">{item.title}</span></td>
                                    <td className="py-4 px-4 text-right font-medium text-slate-500 dark:text-slate-400">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('vi-VN') : 'Không có'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <CheckCircle2 size={40} className="text-emerald-200 mb-3"/>
                                            <p className="font-bold text-slate-600">Tuyệt vời, bạn đã hoàn thành mọi nhiệm vụ!</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>
  )
}
