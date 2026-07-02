import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow, type Option } from '@/lib/api'
import { Plus, GraduationCap, Loader2, X, AlertTriangle, StickyNote, Save, Check, Users, CalendarDays, Library, Folder, ArrowLeft } from 'lucide-react'

type Level = 'semester' | 'subject' | 'class' | 'students'

export function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [lecturers, setLecturers] = useState<Option[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', subject: '', semester: 'Spring 2026', campus: '', lecturerId: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  // Drill-down state
  const [level, setLevel] = useState<Level>('semester')
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null)
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Internal class note editor (admin only)
  const [noteClassId, setNoteClassId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  const noteClass = classes.find((c) => c.id === noteClassId) ?? null

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.getClasses()
      setClasses(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách lớp học'
      setLoadError(msg)
      setClasses([])
      console.error('Failed to load classes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api.getLecturerOptions()
      .then(setLecturers)
      .catch(() => setLecturers([]))
  }, [load])

  const handleCreate = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.createClass({
        code: form.code,
        name: form.name,
        subject: form.subject,
        semester: form.semester,
        campus: form.campus,
        lecturerId: form.lecturerId,
      })
      setForm({ code: '', name: '', subject: '', semester: 'Spring 2026', campus: '', lecturerId: '' })
      setShowForm(false)
      load()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Tạo lớp thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openNote = (c: ClassRow) => {
    setNoteClassId(c.id)
    setNoteDraft(c.note ?? '')
    setNoteError('')
    setNoteSaved(false)
  }

  const saveNote = async () => {
    if (!noteClassId || savingNote) return
    setSavingNote(true)
    setNoteError('')
    setNoteSaved(false)
    try {
      await api.updateClassNote(noteClassId, noteDraft)
      setNoteSaved(true)
      load()
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Không thể lưu ghi chú')
    } finally {
      setSavingNote(false)
    }
  }

  const loadStudents = async (c: ClassRow) => {
    setSelectedClass(c)
    setLevel('students')
    setLoadingStudents(true)
    try {
      const students = await api.getClassStudents(c.id)
      setClassStudents(students || [])
    } catch (err) {
      console.error(err)
      setClassStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  // Derive unique semesters
  const semesters = Array.from(new Set(classes.map(c => (typeof c.semester === 'string' ? c.semester : (c.semester as any)?.name ?? (c.semester as any)?.code ?? '')).filter(Boolean))) as string[]

  // Derive subjects for selected semester
  const filteredClassesBySemester = selectedSemester ? classes.filter(c => (typeof c.semester === 'string' ? c.semester : ((c.semester as any)?.name ?? (c.semester as any)?.code ?? '')) === selectedSemester) : []
  const subjectsInSemester = Array.from(new Set(filteredClassesBySemester.map(c => (typeof c.subject === 'string' ? c.subject : (c.subject as any)?.name ?? (c.subject as any)?.code ?? '')).filter(Boolean))) as string[]

  // Derive classes for selected subject
  const finalFilteredClasses = selectedSubject ? filteredClassesBySemester.filter(c => ((c.subject as any)?.name || (c.subject as any)?.code || (typeof c.subject === 'string' ? c.subject : '')) === selectedSubject) : []

  // Breadcrumb navigation handler
  const navigateToLevel = (targetLevel: Level) => {
    if (targetLevel === 'semester') {
      setLevel('semester')
      setSelectedSemester(null)
      setSelectedSubject(null)
      setSelectedClass(null)
    } else if (targetLevel === 'subject') {
      setLevel('subject')
      setSelectedSubject(null)
      setSelectedClass(null)
    } else if (targetLevel === 'class') {
      setLevel('class')
      setSelectedClass(null)
    }
  }

  // Breadcrumbs builder
  const getBreadcrumbs = () => {
    const crumbs = [{ label: 'Admin', path: '/admin' }]
    
    if (level === 'semester') {
      crumbs.push({ label: 'Phân cấp Lớp học', path: '' })
    } else {
      crumbs.push({ label: 'Phân cấp Lớp học', onClick: () => navigateToLevel('semester') } as any)
      
      if (selectedSemester) {
        if (level === 'subject') {
          crumbs.push({ label: selectedSemester, path: '' })
        } else {
          crumbs.push({ label: selectedSemester, onClick: () => navigateToLevel('subject') } as any)
          
          if (selectedSubject) {
            if (level === 'class') {
              crumbs.push({ label: selectedSubject, path: '' })
            } else {
              crumbs.push({ label: selectedSubject, onClick: () => navigateToLevel('class') } as any)
              
              if (selectedClass) {
                crumbs.push({ label: selectedClass.code, path: '' })
              }
            }
          }
        }
      }
    }
    
    return crumbs
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Quản lý Phân cấp Lớp học"
        breadcrumbs={getBreadcrumbs()}
        actions={
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className={`shadow-sm transition-all duration-200 flex items-center gap-2 ${showForm
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Đóng form' : 'Tạo lớp học mới'}
          </Button>
        }
      />

      {/* Toolbar for back navigation if not at root */}
      {level !== 'semester' && (
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => {
              if (level === 'students') navigateToLevel('class')
              else if (level === 'class') navigateToLevel('subject')
              else if (level === 'subject') navigateToLevel('semester')
            }}
          >
            <ArrowLeft size={16} /> Quay lại
          </Button>
          <div className="text-sm text-slate-500 font-medium">
            {level === 'subject' && `Học kỳ: ${selectedSemester}`}
            {level === 'class' && `${selectedSemester} > ${selectedSubject}`}
            {level === 'students' && `${selectedSemester} > ${selectedSubject} > Lớp ${selectedClass?.code}`}
          </div>
        </div>
      )}

      {/* Creation Form */}
      {showForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <GraduationCap className="text-brand-500 w-5 h-5 ml-2" />
            <CardHeader title="Tạo lớp mới" />
          </div>
          <div className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Mã lớp" placeholder="Ví dụ: SE1702" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <Input label="Tên môn" placeholder="Ví dụ: Mobile Programming" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Select label="Giảng viên" options={lecturers} value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })} />
              <Input label="Học kỳ" placeholder="Ví dụ: Summer 2026" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              <Input label="Campus" placeholder="Ví dụ: Quy Nhơn" value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} />
            </div>
            <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                className="px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                onClick={handleCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : 'Lưu thông tin lớp'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Internal note editor (admin only) */}
      {noteClass && (
        <Card className="overflow-hidden border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5 shadow-md animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-amber-100 dark:border-amber-500/20 p-4 flex items-center gap-2">
            <StickyNote className="text-amber-500 w-5 h-5 ml-2" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">Ghi chú nội bộ — <span className="font-mono text-brand-600 dark:text-brand-400">{noteClass.code}</span></h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chỉ admin &amp; giảng viên thấy.</p>
            </div>
            <button onClick={() => setNoteClassId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-3">
            <Textarea value={noteDraft} onChange={(e) => { setNoteDraft(e.target.value); setNoteSaved(false) }} placeholder="Thêm lưu ý riêng về lớp này..." maxLength={2000} rows={4} />
            {noteError && <p className="text-xs text-red-600 dark:text-red-400">{noteError}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 dark:text-slate-500">{noteDraft.length}/2000</span>
              <div className="flex items-center gap-3">
                {noteSaved && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} /> Đã lưu</span>}
                <Button size="sm" onClick={saveNote} disabled={savingNote || noteDraft === (noteClass.note ?? '')}>
                  {savingNote ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Đang lưu...</> : <><Save size={14} className="mr-1.5" />Lưu ghi chú</>}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Loading & Error States */}
      {loading && (
        <Card className="flex items-center justify-center p-12 border border-slate-100 bg-slate-50/50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Đang tải dữ liệu...</p>
          </div>
        </Card>
      )}
      {loadError && (
        <Card className="border border-red-200 bg-red-50/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">Lỗi tải dữ liệu</p>
              <p className="text-sm text-red-600 mt-1">{loadError}</p>
            </div>
            <button onClick={load} className="text-red-600 hover:text-red-700 font-medium text-sm">Thử lại</button>
          </div>
        </Card>
      )}

      {/* Drill-down Content */}
      {!loading && !loadError && (
        <div className="animate-in fade-in duration-300">
          
          {/* LEVEL 1: Semesters Grid */}
          {level === 'semester' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {semesters.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Chưa có Học kỳ nào.
                </div>
              ) : (
                semesters.map(sem => {
                  const classCount = classes.filter(c => (typeof c.semester === 'string' ? c.semester : ((c.semester as any)?.name ?? (c.semester as any)?.code ?? '')) === sem).length
                  return (
                    <Card 
                      key={sem} 
                      className="cursor-pointer hover:border-brand-300 hover:shadow-md transition-all group overflow-hidden bg-white dark:bg-slate-900"
                      onClick={() => { setSelectedSemester(sem); setLevel('subject') }}
                    >
                      <div className="p-5 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CalendarDays size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{sem}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{classCount} Lớp học</p>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* LEVEL 2: Subjects Grid */}
          {level === 'subject' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subjectsInSemester.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Chưa có Môn học nào trong Học kỳ này.
                </div>
              ) : (
                subjectsInSemester.map(sub => {
                  const classCount = filteredClassesBySemester.filter(c => ((c.subject as any)?.name || (c.subject as any)?.code || (typeof c.subject === 'string' ? c.subject : '')) === sub).length
                  return (
                    <Card 
                      key={sub} 
                      className="cursor-pointer hover:border-brand-300 hover:shadow-md transition-all group overflow-hidden bg-white dark:bg-slate-900"
                      onClick={() => { setSelectedSubject(sub); setLevel('class') }}
                    >
                      <div className="p-5 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Library size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{sub}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{classCount} Lớp học</p>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* LEVEL 3: Classes Table */}
          {level === 'class' && (
            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <div className="p-2 overflow-x-auto custom-scrollbar">
                <DataTable
                  columns={[
                    {
                      key: 'code',
                      header: 'Mã lớp',
                      render: (r) => (
                        <div 
                          className="flex items-center gap-2 cursor-pointer group"
                          onClick={() => loadStudents(r as ClassRow)}
                        >
                          <Folder size={16} className="text-amber-400 group-hover:text-amber-500" />
                          <span className="font-mono font-bold text-brand-600 dark:text-brand-400 group-hover:underline">{(r as ClassRow).code}</span>
                        </div>
                      )
                    },
                    {
                      key: 'lecturer',
                      header: 'Giảng viên',
                      render: (r: any) => r.lecturers?.[0]?.name || r.lecturer?.fullName || <span className="text-slate-400">—</span>,
                    },
                    {
                      key: 'studentCount',
                      header: 'Sĩ số',
                      render: (r) => <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{(r as ClassRow).studentCount ?? 0} SV</span>
                    },
                    {
                      key: 'actions',
                      header: 'Thao tác',
                      render: (r) => {
                        const cls = r as ClassRow
                        return (
                          <div className="flex items-center gap-2 justify-end">
                            <Button size="sm" variant="outline" className="shrink-0 text-brand-600 border-brand-200 hover:bg-brand-50" onClick={() => loadStudents(cls)}>
                              <Users size={13} className="mr-1" />Xem DS
                            </Button>
                            <Button size="sm" variant="outline" className="shrink-0" onClick={() => openNote(cls)}>
                              <StickyNote size={13} className="mr-1" />Ghi chú
                            </Button>
                          </div>
                        )
                      },
                    },
                  ]}
                  data={finalFilteredClasses}
                  keyExtractor={(r) => r.id}
                />
              </div>
            </Card>
          )}

          {/* LEVEL 4: View Students (Inline table) */}
          {level === 'students' && selectedClass && (
            <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users className="text-brand-600" /> Danh sách Lớp {selectedClass.code}
                  </h3>
                </div>
              </div>
              
              <div className="p-4">
                {loadingStudents ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-4" />
                    <p className="text-slate-500">Đang tải danh sách...</p>
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Chưa có sinh viên nào trong lớp này.
                  </div>
                ) : (
                  <DataTable
                    columns={[
                      { key: 'name', header: 'Họ và tên', render: (r: any) => <span className="font-medium text-slate-800">{r.name}</span> },
                      { key: 'email', header: 'Email', render: (r: any) => <span className="text-slate-600 text-sm">{r.email}</span> },
                      { key: 'role', header: 'Vai trò', render: () => {
                        // Normally, all students. If the API returns lecturers mixed in, adjust here.
                        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Sinh viên</span>
                      }}
                    ]}
                    data={classStudents}
                    keyExtractor={(r: any) => r.studentId || r.email}
                  />
                )}
              </div>
            </Card>
          )}

        </div>
      )}
    </div>
  )
}