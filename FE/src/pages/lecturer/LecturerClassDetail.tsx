import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type ClassRow, type AssignmentRow, type SubmissionRow } from '@/lib/api'
import { formatSemesterCode } from '@/utils/semester'
import { ArrowLeft, Megaphone, Users, GraduationCap, LayoutGrid, FileText, Send, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { useAssignmentListener } from '@/lib/events'

export function LecturerClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [cls, setCls] = useState<ClassRow | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<Record<string, SubmissionRow[]>>({})
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stream')

  // Stream Tab Form
  const [announcement, setAnnouncement] = useState('')

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const classesData = await api.getClasses()
      const foundClass = classesData?.find(c => c.id === id)
      setCls(foundClass || null)

      const [studentsData, assignmentsData] = await Promise.all([
        api.getClassStudents(id),
        api.getAssignments({ classId: id })
      ])

      const assignmentList = assignmentsData || []
      setAssignments(assignmentList)

      const submissionLists = await Promise.all(
        assignmentList.map(a =>
          api.getSubmissions({ assignmentId: a.id }).catch(() => [] as SubmissionRow[])
        )
      )

      const byAssignment: Record<string, SubmissionRow[]> = {}
      assignmentList.forEach((a, i) => { byAssignment[a.id] = submissionLists[i] || [] })
      setSubmissionsByAssignment(byAssignment)

      const scoreFor = (studentId: string, assignmentId: string) => {
        const found = (byAssignment[assignmentId] || []).find(s => s.studentId === studentId)
        const raw = found?.score ?? found?.finalScore ?? found?.aiScore
        return raw === null || raw === undefined ? undefined : Number(raw)
      }

      setStudents((studentsData || []).map((s: any) => ({
        ...s,
        scores: Object.fromEntries(
          assignmentList.map(a => [a.id, scoreFor(s.studentId || s.id, a.id)])
        ) as Record<string, number | undefined>,
      })))
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useAssignmentListener(loadData)

  useEffect(() => {
    loadData()
    const handleFocus = () => loadData()
    window.addEventListener('focus', handleFocus)
    const interval = setInterval(() => {
      loadData()
    }, 5000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [loadData])

  const handlePostAnnouncement = () => {
    if (!announcement.trim()) return
    alert('Announcement posted to the class.')
    setAnnouncement('')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-brand-600 font-bold">Loading class workspace...</p>
        </div>
      </div>
    )
  }

  if (!cls) return <div className="p-12 text-center text-red-500 font-bold">Class not found</div>

  const tabItems = [
    { id: 'stream', label: 'Stream', icon: <Megaphone size={16} /> },
    { id: 'classwork', label: 'Classwork', icon: <FileText size={16} /> },
    { id: 'people', label: 'People', icon: <Users size={16} /> },
    { id: 'grades', label: 'Gradebook', icon: <GraduationCap size={16} /> },
  ]

  return (
    <div className="animate-in fade-in duration-500 min-h-screen pb-20">
      
      {/* Simple Header (Class Header) */}
      <div className="w-full bg-white dark:bg-[#151821] border-b border-slate-200 dark:border-slate-800 p-6 sm:px-10 py-8 mb-6">
        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/lecturer/classes')} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </div>
        
        <div className="w-full flex justify-between items-end">
          <div>
            <div className="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-900/30 px-2 py-1 mb-2">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-400">{formatSemesterCode((cls.semester as any)?.code) || 'Semester'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
              Class {cls.code}
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Subject: {(cls.subject as any)?.code || 'Unknown'}
            </p>
          </div>
          
          <div className="hidden md:flex bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex-col items-center">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{students.length}</span>
            <span className="text-xs font-medium text-slate-500">Students</span>
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
                    <LayoutGrid size={18} className="text-brand-600" /> Due soon
                  </h3>
                  <div className="space-y-3">
                    {assignments.slice(0, 2).map(a => (
                      <div key={a.id} className="text-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-300 hover:text-brand-600 cursor-pointer line-clamp-1">{a.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{a.due ? new Date(a.due).toLocaleDateString() : 'No due date'}</p>
                      </div>
                    ))}
                    {assignments.length === 0 && <p className="text-sm text-slate-500 italic">Nothing is due soon.</p>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => setActiveTab('classwork')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      View all assignments
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
                        placeholder="Announce something to your class..."
                        className="w-full min-h-[60px] p-3 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-all"
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setAnnouncement('')} className="border-slate-200">Cancel</Button>
                        <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handlePostAnnouncement} disabled={!announcement.trim()}>
                          <Send size={14} className="mr-2" /> Post
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Announcements section */}
                <div className="p-8 text-center bg-white dark:bg-[#151821] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  <Megaphone className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={32} />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Class Stream</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Use the box above to post announcements to your students. Assignments can be managed under the Classwork tab.</p>
                </div>
              </div>
            </div>
          )}

          {/* CLASSWORK TAB */}
          {activeTab === 'classwork' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#151821] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-lg font-bold text-slate-800 dark:text-white">
                  Classwork & Assignments
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Search assignments..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white border-b border-brand-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                  All assignments
                </h2>
                {assignments.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-white dark:bg-[#151821] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    No assignments have been created yet.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {assignments.map(a => (
                      <div 
                        key={a.id} 
                        onClick={() => navigate(`/lecturer/assignments/${a.id}/submissions`)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#151821] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'Exam' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'}`}>
                            <FileText size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 group-hover:text-brand-600 transition-colors">{a.title}</h4>
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mt-1">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{a.type === 'Exam' ? 'Exam' : 'Assignment'}</span>
                              <span>Due: {a.due ? new Date(a.due).toLocaleString() : 'No limit'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 sm:mt-0 flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/lecturer/assignments/${a.id}/submissions`)
                            }} 
                            className="bg-white hover:bg-slate-50 font-bold border-slate-200"
                          >
                            Grade ({(submissionsByAssignment[a.id] || []).filter(s => s.status === 'Graded' || s.gradingStatus === 'Graded').length}/{students.length})
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
                <h2 className="text-2xl font-black text-brand-800 dark:text-brand-400">Students</h2>
                <span className="font-bold text-brand-600 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/50 px-3 py-1 rounded-full">{students.length} students</span>
              </div>
              <div className="p-2">
                <DataTable
                  columns={[
                    {
                      key: 'photo',
                      header: 'Photo',
                      render: (r: any) => {
                        const parts = (r.name || '').trim().split(/\s+/)
                        const initials = parts.length === 1 
                          ? parts[0].slice(0, 2).toUpperCase() 
                          : ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase()
                        return (
                          <div className="py-2 flex items-center justify-center">
                            <div className="relative w-[111px] h-[146px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 bg-[#4f46e5] flex items-center justify-center">
                              {r.avatar ? (
                                <img 
                                  src={r.avatar} 
                                  alt={r.name} 
                                  className="w-full h-full object-cover relative z-10" 
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                    const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                />
                              ) : null}
                              <span 
                                style={{ display: r.avatar ? 'none' : 'block' }}
                                className="font-extrabold text-white text-3xl tracking-wider select-none"
                              >
                                {initials || 'ST'}
                              </span>
                            </div>
                          </div>
                        )
                      }
                    },
                    { 
                      key: 'name', 
                      header: 'Full name', 
                      render: (r: any) => (
                        <span className="font-bold text-slate-900 dark:text-white text-base">{r.name}</span>
                      ) 
                    },
                    { key: 'studentId', header: 'Student ID', render: (r: any) => <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{r.studentId || 'N/A'}</span> },
                    { key: 'email', header: 'Email', render: (r: any) => <span className="text-slate-600 dark:text-slate-400 font-mono text-sm">{r.email}</span> },
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
                  <GraduationCap size={24} /> Consolidated Gradebook
                </h2>
                <Button size="sm" variant="outline" className="bg-white border-slate-200 font-bold hover:bg-slate-50">Export Excel</Button>
              </div>
              <div className="p-2 overflow-x-auto">
                {/* Columns come from the class's real assignments. The old fixed
                    A1/A2/PE/FE columns did not correspond to anything in the data. */}
                <DataTable
                  columns={[
                    { key: 'name', header: 'Student', render: (r: any) => <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{r.name}</span> },
                    ...assignments.map(a => ({
                      key: a.id,
                      header: a.title,
                      render: (r: any) => {
                        const score = r.scores?.[a.id]
                        return (
                          <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                            {score === undefined ? '—' : score}
                          </span>
                        )
                      },
                    })),
                    {
                      key: 'total',
                      header: 'Average',
                      render: (r: any) => {
                        const marks = assignments
                          .map(a => r.scores?.[a.id])
                          .filter((v): v is number => typeof v === 'number')
                        const avg = marks.length > 0
                          ? (marks.reduce((s, v) => s + v, 0) / marks.length).toFixed(1)
                          : '—'
                        return <span className="font-mono text-base font-black text-brand-700 dark:text-brand-400">{avg}</span>
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
