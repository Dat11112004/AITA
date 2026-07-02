import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow, type SemesterRow, type SubjectRow, type Option } from '@/lib/api'
import { Plus, GraduationCap, Loader2, X, StickyNote, Save, Users, CalendarDays, Library, Folder, ArrowLeft } from 'lucide-react'

type Level = 'semester' | 'subject' | 'class' | 'students'

export function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [lecturers, setLecturers] = useState<Option[]>([])
  
  const [showClassForm, setShowClassForm] = useState(false)
  const [showSemesterForm, setShowSemesterForm] = useState(false)
  
  const [classForm, setClassForm] = useState({ code: '', name: '', subjectId: '', semesterId: '', campus: '', lecturerId: '' })
  const [semesterForm, setSemesterForm] = useState({ code: '', startDate: '', endDate: '' })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  // Drill-down state
  const [level, setLevel] = useState<Level>('semester')
  const [selectedSemester, setSelectedSemester] = useState<SemesterRow | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<SubjectRow | null>(null)
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null)
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Internal class note editor (admin only)
  const [noteClassId, setNoteClassId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const noteClass = classes.find((c) => c.id === noteClassId) ?? null

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [clsData, semData, subData] = await Promise.all([
        api.getClasses(),
        api.getSemesters(),
        api.getSubjects(1, 1000)
      ])
      setClasses(clsData || [])
      setSemesters(semData || [])
      setSubjects(subData || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu'
      setLoadError(msg)
      setClasses([])
      setSemesters([])
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

  const handleCreateSemester = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.createSemester({
        code: semesterForm.code,
        startDate: semesterForm.startDate || undefined,
        endDate: semesterForm.endDate || undefined,
        isActive: true
      })
      setSemesterForm({ code: '', startDate: '', endDate: '' })
      setShowSemesterForm(false)
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Tạo kỳ học thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateClass = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.createClass({
        code: classForm.code,
        name: classForm.name,
        subjectId: classForm.subjectId || selectedSubject?.id,
        semesterId: classForm.semesterId || selectedSemester?.id,
        campus: classForm.campus,
        lecturerId: classForm.lecturerId,
      })
      setClassForm({ code: '', name: '', subjectId: '', semesterId: '', campus: '', lecturerId: '' })
      setShowClassForm(false)
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Tạo lớp thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openNote = (c: ClassRow) => {
    setNoteClassId(c.id)
    setNoteDraft(c.note ?? '')
  }

  const saveNote = async () => {
    if (!noteClassId || savingNote) return
    setSavingNote(true)
    try {
      await api.updateClassNote(noteClassId, noteDraft)
      load()
    } catch (err) {
      console.error(err)
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
      setClassStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  // Derived Data for UI
  const filteredClassesBySemester = selectedSemester ? classes.filter(c => (c.semester as any)?.id === selectedSemester.id) : []
  
  // Subjects that have classes in the selected semester
  const subjectIdsInSemester = Array.from(new Set(filteredClassesBySemester.map(c => (c.subject as any)?.id).filter(Boolean))) as string[]
  const subjectsInSemester = subjects.filter(s => subjectIdsInSemester.includes(s.id))

  const finalFilteredClasses = selectedSubject 
    ? filteredClassesBySemester.filter(c => (c.subject as any)?.id === selectedSubject.id) 
    : []

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

  const getBreadcrumbs = () => {
    const crumbs = [{ label: 'Admin', path: '/admin' }]
    
    if (level === 'semester') {
      crumbs.push({ label: 'Phân cấp Lớp học', path: '' })
    } else {
      crumbs.push({ label: 'Phân cấp Lớp học', onClick: () => navigateToLevel('semester') } as any)
      
      if (selectedSemester) {
        if (level === 'subject') {
          crumbs.push({ label: selectedSemester.code, path: '' })
        } else {
          crumbs.push({ label: selectedSemester.code, onClick: () => navigateToLevel('subject') } as any)
          
          if (selectedSubject) {
            if (level === 'class') {
              crumbs.push({ label: selectedSubject.code, path: '' })
            } else {
              crumbs.push({ label: selectedSubject.code, onClick: () => navigateToLevel('class') } as any)
              if (selectedClass) crumbs.push({ label: selectedClass.code, path: '' })
            }
          }
        }
      }
    }
    return crumbs
  }

  const semesterOptions = semesters.map(s => ({ value: s.id, label: s.code }))
  const subjectOptions = subjects.map(s => ({ value: s.id, label: `${s.code} - ${s.name}` }))

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Quản lý Phân cấp Lớp học"
        breadcrumbs={getBreadcrumbs()}
        actions={
          <div className="flex gap-2">
            {level === 'semester' && (
              <Button
                size="sm"
                onClick={() => { setShowSemesterForm(!showSemesterForm); setShowClassForm(false) }}
                className="shadow-sm transition-all duration-200 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {showSemesterForm ? <X size={16} /> : <Plus size={16} />}
                {showSemesterForm ? 'Đóng' : 'Tạo kỳ học mới'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => { setShowClassForm(!showClassForm); setShowSemesterForm(false) }}
              className={`shadow-sm transition-all duration-200 flex items-center gap-2 ${showClassForm
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}
            >
              {showClassForm ? <X size={16} /> : <Plus size={16} />}
              {showClassForm ? 'Đóng form' : 'Tạo lớp học mới'}
            </Button>
          </div>
        }
      />

      {level !== 'semester' && (
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="outline" size="sm" className="flex items-center gap-2"
            onClick={() => {
              if (level === 'students') navigateToLevel('class')
              else if (level === 'class') navigateToLevel('subject')
              else if (level === 'subject') navigateToLevel('semester')
            }}
          >
            <ArrowLeft size={16} /> Quay lại
          </Button>
          <div className="text-sm text-slate-500 font-medium">
            {level === 'subject' && `Học kỳ: ${selectedSemester?.code}`}
            {level === 'class' && `${selectedSemester?.code} > Môn ${selectedSubject?.code}`}
            {level === 'students' && `${selectedSemester?.code} > Môn ${selectedSubject?.code} > Lớp ${selectedClass?.code}`}
          </div>
        </div>
      )}

      {showSemesterForm && (
        <Card className="p-6 border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/10 mb-6 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <CalendarDays size={20}/> Tạo Kỳ học mới
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Tên/Mã Kỳ học" placeholder="Ví dụ: Fall 2026" value={semesterForm.code} onChange={(e) => setSemesterForm({ ...semesterForm, code: e.target.value })} />
            <Input type="date" label="Ngày bắt đầu" value={semesterForm.startDate} onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })} />
            <Input type="date" label="Ngày kết thúc" value={semesterForm.endDate} onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreateSemester} disabled={isSubmitting || !semesterForm.code}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={16} className="mr-2"/>} Lưu Kỳ học
            </Button>
          </div>
        </Card>
      )}

      {showClassForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 animate-in slide-in-from-top-4 duration-300 mb-6">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <GraduationCap className="text-brand-500 w-5 h-5 ml-2" />
            <CardHeader title="Tạo lớp mới" />
          </div>
          <div className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Mã lớp" placeholder="Ví dụ: SE1702" value={classForm.code} onChange={(e) => setClassForm({ ...classForm, code: e.target.value })} />
              <Input label="Tên lớp (Tuỳ chọn)" placeholder="Ví dụ: Lớp SE nâng cao" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
              <Select 
                label="Kỳ học" 
                options={[{value:'', label: 'Chọn kỳ học...'}, ...semesterOptions]} 
                value={classForm.semesterId || (selectedSemester?.id ?? '')} 
                onChange={(e) => setClassForm({ ...classForm, semesterId: e.target.value })} 
              />
              <Select 
                label="Môn học" 
                options={[{value:'', label: 'Chọn môn học...'}, ...subjectOptions]} 
                value={classForm.subjectId || (selectedSubject?.id ?? '')} 
                onChange={(e) => setClassForm({ ...classForm, subjectId: e.target.value })} 
              />
              <Select 
                label="Giảng viên (Tuỳ chọn)" 
                options={[{value:'', label: 'Chưa phân công'}, ...lecturers]} 
                value={classForm.lecturerId} 
                onChange={(e) => setClassForm({ ...classForm, lecturerId: e.target.value })} 
              />
              <Input label="Campus (Tuỳ chọn)" placeholder="Ví dụ: Quy Nhơn" value={classForm.campus} onChange={(e) => setClassForm({ ...classForm, campus: e.target.value })} />
            </div>
            <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                className="px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center gap-2"
                onClick={handleCreateClass}
                disabled={isSubmitting || !classForm.code || (!classForm.semesterId && !selectedSemester) || (!classForm.subjectId && !selectedSubject)}
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : 'Lưu thông tin lớp'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {noteClass && (
        <Card className="overflow-hidden border border-amber-200/70 bg-amber-50/40 shadow-md animate-in slide-in-from-top-4 mb-6">
          <div className="border-b border-amber-100 p-4 flex items-center gap-2">
            <StickyNote className="text-amber-500 w-5 h-5 ml-2" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Ghi chú nội bộ — <span className="font-mono text-brand-600">{noteClass.code}</span></h3>
            </div>
            <button onClick={() => setNoteClassId(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-3">
            <Textarea value={noteDraft} onChange={(e) => { setNoteDraft(e.target.value) }} placeholder="Thêm lưu ý riêng về lớp này..." maxLength={2000} rows={4} />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">{noteDraft.length}/2000</span>
              <Button size="sm" onClick={saveNote} disabled={savingNote || noteDraft === (noteClass.note ?? '')}>
                {savingNote ? 'Đang lưu...' : 'Lưu ghi chú'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading && (
        <Card className="flex justify-center p-12 bg-slate-50/50"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></Card>
      )}

      {!loading && !loadError && (
        <div className="animate-in fade-in duration-300">
          
          {level === 'semester' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {semesters.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Chưa có Học kỳ nào. Nhấn "Tạo kỳ học mới" để bắt đầu.
                </div>
              ) : (
                semesters.map(sem => {
                  const classCount = classes.filter(c => (c.semester as any)?.id === sem.id).length
                  return (
                    <Card 
                      key={sem.id} 
                      className="cursor-pointer hover:border-brand-300 hover:shadow-md transition-all group overflow-hidden bg-white"
                      onClick={() => { setSelectedSemester(sem); setLevel('subject') }}
                    >
                      <div className="p-5 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CalendarDays size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{sem.code}</h3>
                          <p className="text-sm text-slate-500">{classCount} Lớp học</p>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {level === 'subject' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subjectsInSemester.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Chưa có lớp học nào thuộc các môn trong Học kỳ này. Nhấn "Tạo lớp học mới" để thêm lớp.
                </div>
              ) : (
                subjectsInSemester.map(sub => {
                  const classCount = filteredClassesBySemester.filter(c => (c.subject as any)?.id === sub.id).length
                  return (
                    <Card 
                      key={sub.id} 
                      className="cursor-pointer hover:border-brand-300 hover:shadow-md transition-all group overflow-hidden bg-white"
                      onClick={() => { setSelectedSubject(sub); setLevel('class') }}
                    >
                      <div className="p-5 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Library size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{sub.code}</h3>
                          <p className="text-sm text-slate-500">{classCount} Lớp học</p>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {level === 'class' && (
            <Card className="overflow-hidden border border-slate-100 shadow-sm bg-white">
              <div className="p-2 overflow-x-auto">
                <DataTable
                  columns={[
                    {
                      key: 'code', header: 'Mã lớp',
                      render: (r) => (
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => loadStudents(r as ClassRow)}>
                          <Folder size={16} className="text-amber-400 group-hover:text-amber-500" />
                          <span className="font-mono font-bold text-brand-600 group-hover:underline">{(r as ClassRow).code}</span>
                        </div>
                      )
                    },
                    {
                      key: 'lecturer', header: 'Giảng viên',
                      render: (r: any) => r.lecturers?.[0]?.name || r.lecturer?.fullName || <span className="text-slate-400">—</span>,
                    },
                    {
                      key: 'studentCount', header: 'Sĩ số',
                      render: (r) => <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{(r as ClassRow).studentCount ?? 0} SV</span>
                    },
                    {
                      key: 'actions', header: 'Thao tác',
                      render: (r) => {
                        const cls = r as ClassRow
                        return (
                          <div className="flex items-center gap-2 justify-end">
                            <Button size="sm" variant="outline" className="text-brand-600 border-brand-200" onClick={() => loadStudents(cls)}>
                              <Users size={13} className="mr-1" />Xem DS
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openNote(cls)}>
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

          {level === 'students' && selectedClass && (
            <Card className="overflow-hidden shadow-sm bg-white">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="text-brand-600" /> Danh sách Lớp {selectedClass.code}
                </h3>
              </div>
              <div className="p-4">
                {loadingStudents ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
                ) : classStudents.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Chưa có sinh viên nào.
                  </div>
                ) : (
                  <DataTable
                    columns={[
                      { key: 'name', header: 'Họ và tên', render: (r: any) => <span className="font-medium">{r.name}</span> },
                      { key: 'email', header: 'Email', render: (r: any) => <span className="text-slate-600 text-sm">{r.email}</span> },
                      { key: 'role', header: 'Vai trò', render: () => <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">Sinh viên</span> }
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