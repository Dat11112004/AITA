import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type ClassRow, type AssignmentRow } from '@/lib/api'
import { ArrowLeft, Megaphone, Users, GraduationCap, LayoutGrid, Plus, FileText, Send, MoreVertical, Search, FileEdit } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'

export function LecturerClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [cls, setCls] = useState<ClassRow | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stream')

  // Stream Tab Form
  const [announcement, setAnnouncement] = useState('')

  // Assign Task Modal State
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignForm, setAssignForm] = useState({ title: '', type: 'assignment', deadline: '' })

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      // In a real app we'd have api.getClass(id), but we'll filter from getClasses for now
      const classesData = await api.getClasses()
      const foundClass = classesData?.find(c => c.id === id)
      setCls(foundClass || null)

      const [studentsData, assignmentsData] = await Promise.all([
        api.getClassStudents(id),
        api.getAssignments({ classId: id })
      ])
      
      // Mocking grades for the gradebook view
      const studentsWithGrades = (studentsData || []).map(s => ({
        ...s,
        ass1: Math.floor(Math.random() * 4) + 6,
        ass2: Math.floor(Math.random() * 5) + 5,
        pe: Math.floor(Math.random() * 6) + 4,
        fe: Math.floor(Math.random() * 5) + 5,
      }))
      
      setStudents(studentsWithGrades)
      setAssignments(assignmentsData || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePostAnnouncement = () => {
    if (!announcement.trim()) return
    alert('Đã đăng thông báo cho lớp!')
    setAnnouncement('')
  }

  const handleAssignTask = async () => {
    if (!cls) return
    try {
      await api.createAssignment({
        title: assignForm.title,
        type: assignForm.type,
        classId: cls.id,
        subjectId: (cls.subject as any)?.id,
        due: assignForm.deadline ? new Date(assignForm.deadline).toISOString() : null,
      })
      alert('Đã giao bài tập thành công!')
      setShowAssignModal(false)
      setAssignForm({ title: '', type: 'assignment', deadline: '' })
      loadData()
    } catch (e: any) {
      alert(e.message || 'Lỗi khi giao bài')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-brand-600 font-bold">Đang tải không gian lớp học...</p>
        </div>
      </div>
    )
  }

  if (!cls) return <div className="p-12 text-center text-red-500 font-bold">Không tìm thấy Lớp học</div>

  const tabItems = [
    { id: 'stream', label: 'Bảng tin (Stream)', icon: <Megaphone size={16} /> },
    { id: 'classwork', label: 'Bài tập trên lớp', icon: <FileText size={16} /> },
    { id: 'people', label: 'Mọi người', icon: <Users size={16} /> },
    { id: 'grades', label: 'Sổ điểm (Gradebook)', icon: <GraduationCap size={16} /> },
  ]

  return (
    <div className="animate-in fade-in duration-500 min-h-screen pb-20">
      
      {/* Simple Header (Class Header) */}
      <div className="w-full bg-white dark:bg-[#151821] border-b border-slate-200 dark:border-slate-800 p-6 sm:px-10 py-8 mb-6">
        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/lecturer/classes')} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <ArrowLeft size={16} className="mr-2" /> Quay lại
          </Button>
        </div>
        
        <div className="w-full flex justify-between items-end">
          <div>
            <div className="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-900/30 px-2 py-1 mb-2">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-400">{(cls.semester as any)?.code || 'Học kỳ'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
              Lớp {cls.code}
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Môn: {(cls.subject as any)?.code || 'Không xác định'}
            </p>
          </div>
          
          <div className="hidden md:flex bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex-col items-center">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{students.length}</span>
            <span className="text-xs font-medium text-slate-500">Sinh viên</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        
        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-[#151821] rounded-t-2xl rounded-b-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] border border-slate-200/50 dark:border-slate-800 p-2 mb-8 flex overflow-x-auto custom-scrollbar">
          {tabItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="mt-6">
          
          {/* STREAM TAB */}
          {activeTab === 'stream' && (
            <div className="grid md:grid-cols-4 gap-6">
              <div className="md:col-span-1 space-y-6">
                <Card className="p-5 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#151821]">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <LayoutGrid size={18} className="text-brand-600" /> Sắp đến hạn
                  </h3>
                  <div className="space-y-3">
                    {assignments.slice(0, 2).map(a => (
                      <div key={a.id} className="text-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-300 hover:text-brand-600 cursor-pointer line-clamp-1">{a.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{a.due ? new Date(a.due).toLocaleDateString() : 'Không có hạn'}</p>
                      </div>
                    ))}
                    {assignments.length === 0 && <p className="text-sm text-slate-500 italic">Không có công việc nào sắp đến hạn!</p>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => setActiveTab('classwork')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      Xem tất cả bài tập
                    </button>
                  </div>
                </Card>
              </div>
              
              <div className="md:col-span-3 space-y-6">
                <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#151821] hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold shrink-0">
                      GV
                    </div>
                    <div className="flex-1 space-y-3">
                      <textarea 
                        placeholder="Thông báo nội dung nào đó cho lớp học của bạn..."
                        className="w-full min-h-[60px] p-3 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-all"
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setAnnouncement('')} className="border-slate-200">Hủy</Button>
                        <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handlePostAnnouncement} disabled={!announcement.trim()}>
                          <Send size={14} className="mr-2" /> Đăng
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {assignments.map(a => (
                  <Card key={a.id} className="p-5 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#151821] hover:border-brand-300 dark:hover:border-brand-700 transition-all cursor-pointer group" onClick={() => navigate(`/lecturer/assignments/${a.id}/submissions`)}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 transition-colors">Giảng viên đã đăng một {a.type === 'Exam' ? 'đề thi' : 'bài tập'} mới: {a.title}</h4>
                          <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={16}/></button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{a.due ? `Hạn: ${new Date(a.due).toLocaleString()}` : 'Không có hạn'}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* CLASSWORK TAB */}
          {activeTab === 'classwork' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#151821] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex gap-2">
                  <Button className="bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20" onClick={() => setShowAssignModal(true)}>
                    <Plus size={16} className="mr-2" /> Tạo
                  </Button>
                  <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100" onClick={() => navigate('/lecturer/assignments/ai-generator')}>
                    <FileEdit size={16} className="mr-2" /> AI Sinh Bài Tập
                  </Button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Tìm kiếm bài tập..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {showAssignModal && (
                <Card className="p-6 border-brand-200 bg-brand-50/30 dark:bg-brand-900/10 shadow-lg animate-in fade-in slide-in-from-top-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-brand-800 dark:text-brand-300 mb-5">
                    <FileText size={20}/> Giao Bài Tập / Đề Thi Mới
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-3 mb-5">
                    <Input label="Tiêu đề" placeholder="VD: Assignment 1" value={assignForm.title} onChange={e => setAssignForm({...assignForm, title: e.target.value})} />
                    <Select 
                      label="Loại" 
                      options={[{value: 'assignment', label: 'Bài tập (Assignment)'}, {value: 'exam', label: 'Đề thi (Exam)'}]} 
                      value={assignForm.type} 
                      onChange={e => setAssignForm({...assignForm, type: e.target.value})} 
                    />
                    <Input type="datetime-local" label="Hạn nộp (Deadline)" value={assignForm.deadline} onChange={e => setAssignForm({...assignForm, deadline: e.target.value})} />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowAssignModal(false)} className="bg-white">Hủy</Button>
                    <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handleAssignTask} disabled={!assignForm.title}>
                      <Send size={16} className="mr-2"/> Giao bài & Gửi thông báo
                    </Button>
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white border-b border-brand-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                  Toàn bộ Bài tập
                </h2>
                {assignments.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-white dark:bg-[#151821] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    Chưa có bài tập nào được giao.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {assignments.map(a => (
                      <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#151821] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'Exam' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'}`}>
                            <FileText size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 group-hover:text-brand-600 transition-colors">{a.title}</h4>
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mt-1">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{a.type === 'Exam' ? 'Đề thi' : 'Bài tập'}</span>
                              <span>Hạn: {a.due ? new Date(a.due).toLocaleString() : 'Không giới hạn'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 sm:mt-0 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/lecturer/assignments/${a.id}/submissions`)} className="bg-white hover:bg-slate-50 font-bold border-slate-200">
                            Chấm bài (0/{students.length})
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <Card className="bg-white dark:bg-[#151821] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
              <div className="p-6 border-b border-brand-200 dark:border-slate-700 bg-brand-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <h2 className="text-2xl font-black text-brand-800 dark:text-brand-400">Sinh viên</h2>
                <span className="font-bold text-brand-600 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/50 px-3 py-1 rounded-full">{students.length} sinh viên</span>
              </div>
              <div className="p-2">
                <DataTable
                  columns={[
                    { 
                      key: 'name', 
                      header: 'Họ và tên', 
                      render: (r: any) => (
                        <div className="flex items-center gap-3 py-1">
                          <div className="w-10 h-12 rounded-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-sm shrink-0 border border-slate-300/50 shadow-sm">
                            {r.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">{r.name}</span>
                        </div>
                      ) 
                    },
                    { key: 'studentId', header: 'MSSV', render: (r: any) => <span className="font-mono text-sm font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400">{r.studentId || 'N/A'}</span> },
                    { key: 'email', header: 'Email', render: (r: any) => <span className="text-slate-600 dark:text-slate-400">{r.email}</span> },
                  ]}
                  data={students}
                  keyExtractor={(r: any) => r.studentId || r.email}
                />
              </div>
            </Card>
          )}

          {/* GRADEBOOK TAB */}
          {activeTab === 'grades' && (
            <Card className="bg-white dark:bg-[#151821] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
              <div className="p-6 border-b border-brand-200 dark:border-slate-700 bg-brand-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <h2 className="text-2xl font-black text-brand-800 dark:text-brand-400 flex items-center gap-2">
                  <GraduationCap size={24} /> Sổ Điểm Tổng Hợp
                </h2>
                <Button size="sm" variant="outline" className="bg-white border-slate-200 font-bold hover:bg-slate-50">Xuất Excel</Button>
              </div>
              <div className="p-2 overflow-x-auto">
                <DataTable
                  columns={[
                    { key: 'name', header: 'Sinh viên', render: (r: any) => <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{r.name}</span> },
                    { key: 'ass1', header: 'Assignment 1 (10%)', render: (r: any) => <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">{r.ass1 ?? '—'}</span> },
                    { key: 'ass2', header: 'Assignment 2 (10%)', render: (r: any) => <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">{r.ass2 ?? '—'}</span> },
                    { key: 'pe', header: 'Đề thi TH (30%)', render: (r: any) => <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">{r.pe ?? '—'}</span> },
                    { key: 'fe', header: 'Đề thi CK (50%)', render: (r: any) => <span className="font-mono text-sm font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">{r.fe ?? '—'}</span> },
                    { 
                      key: 'total', 
                      header: 'Tổng kết', 
                      render: (r: any) => {
                        const total = ((r.ass1 || 0)*0.1 + (r.ass2 || 0)*0.1 + (r.pe || 0)*0.3 + (r.fe || 0)*0.5).toFixed(1)
                        return <span className="font-mono text-base font-black text-brand-700 dark:text-brand-400">{total}</span>
                      }
                    },
                  ]}
                  data={students}
                  keyExtractor={(r: any) => r.studentId || r.email}
                />
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
