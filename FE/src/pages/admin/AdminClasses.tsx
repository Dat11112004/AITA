import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow, type SemesterRow, type SubjectRow, type Option, type StudentRow } from '@/lib/api'
import { Plus, GraduationCap, Loader2, X, StickyNote, Save, Users, CalendarDays, Library, Folder, ArrowLeft, Edit3, Trash2, ShieldAlert, CheckSquare } from 'lucide-react'

type Level = 'semester' | 'subject' | 'class' | 'students'

export function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [lecturers, setLecturers] = useState<Option[]>([])
  
  const [showClassForm, setShowClassForm] = useState(false)
  const [showSemesterForm, setShowSemesterForm] = useState(false)
  
  const [classForm, setClassForm] = useState({ code: '', name: '', subjectId: '', subjectIds: [] as string[], semesterId: '', campus: '', lecturerId: '' })
  const [multiClassForm, setMultiClassForm] = useState([{ code: '', lecturerId: '' }])
  const [semesterForm, setSemesterForm] = useState({ code: '', startDate: '', endDate: '' })
  
  const [editingSemester, setEditingSemester] = useState<SemesterRow | null>(null)
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedSemesterIds, setSelectedSemesterIds] = useState<Set<string>>(new Set())
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set())

  // Drill-down state
  const [level, setLevel] = useState<Level>('semester')
  const [selectedSemester, setSelectedSemester] = useState<SemesterRow | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<SubjectRow | null>(null)
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null)
  const [classStudents, setClassStudents] = useState<StudentRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Modal confirm delete
  const [confirmDeleteSemester, setConfirmDeleteSemester] = useState<string | null>(null)
  const [confirmBulkDeleteSemesters, setConfirmBulkDeleteSemesters] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Internal class note editor (admin only)
  const [noteClassId, setNoteClassId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const noteClass = classes.find((c) => c.id === noteClassId) ?? null

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

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
      if (editingSemester) {
        await api.updateSemester(editingSemester.id, {
          code: semesterForm.code,
          startDate: semesterForm.startDate || undefined,
          endDate: semesterForm.endDate || undefined,
        })
      } else {
        await api.createSemester({
          code: semesterForm.code,
          startDate: semesterForm.startDate || undefined,
          endDate: semesterForm.endDate || undefined,
          isActive: true
        })
      }
      setSemesterForm({ code: '', startDate: '', endDate: '' })
      setEditingSemester(null)
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
      if (editingClass) {
        await api.updateClass(editingClass.id, {
          code: classForm.code,
          name: classForm.name,
          subjectId: classForm.subjectId || selectedSubject?.id,
          semesterId: classForm.semesterId || selectedSemester?.id,
          campus: classForm.campus,
          lecturerId: classForm.lecturerId,
        })
      } else {
        if (level === 'class') {
          // Create multiple classes for the selected subject
          const validClasses = multiClassForm.filter(c => c.code.trim() !== '')
          if (validClasses.length === 0) {
            throw new Error('Vui lòng nhập ít nhất một mã lớp')
          }
          if (!selectedSubject?.id) {
            throw new Error('Vui lòng chọn môn học')
          }
          if (!selectedSemester?.id) {
            throw new Error('Vui lòng chọn học kỳ')
          }
          
          await Promise.all(validClasses.map(c => 
            api.createClass({
              code: c.code,
              name: '',
              subjectId: selectedSubject.id,
              semesterId: selectedSemester.id,
              campus: '',
              lecturerId: c.lecturerId,
            })
          ))
        } else {
          // Create classes for multiple subjects
          const targetSubjectIds = classForm.subjectIds?.length > 0 ? classForm.subjectIds : (classForm.subjectId ? [classForm.subjectId] : (selectedSubject?.id ? [selectedSubject.id] : []))
          
          if (targetSubjectIds.length === 0) {
            throw new Error('Vui lòng chọn ít nhất một môn học')
          }

          await Promise.all(targetSubjectIds.map(subId => 
            api.createClass({
              code: classForm.code,
              name: classForm.name,
              subjectId: subId,
              semesterId: classForm.semesterId || selectedSemester?.id,
              campus: classForm.campus,
              lecturerId: classForm.lecturerId,
            })
          ))
        }
      }
      setClassForm({ code: '', name: '', subjectId: '', subjectIds: [], semesterId: '', campus: '', lecturerId: '' })
      setMultiClassForm([{ code: '', lecturerId: '' }])
      setEditingClass(null)
      setShowClassForm(false)
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Tạo lớp thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSemester = async (id: string) => {
    setIsDeleting(true)
    try {
      await api.deleteSemester(id)
      setSelectedSemesterIds(prev => { const n = new Set(prev); n.delete(id); return n; })
      setSemesters(prev => prev.filter(s => s.id !== id))
      setConfirmDeleteSemester(null)
      // We don't necessarily need to load() here because optimistic update already removed it,
      // but keeping it ensures state consistency with the backend
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Xoá thất bại')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDeleteSemesters = async () => {
    if (selectedSemesterIds.size === 0) return
    setIsDeleting(true)
    
    try {
      const results = await Promise.allSettled(Array.from(selectedSemesterIds).map(id => api.deleteSemester(id)))
      const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
      
      if (failed.length > 0) {
        alert(failed.map(f => f.reason.message || 'Lỗi').join('\n'))
      }
      setSemesters(prev => prev.filter(s => !selectedSemesterIds.has(s.id)))
      setSelectedSemesterIds(new Set())
      setConfirmBulkDeleteSemesters(false)
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Xoá hàng loạt thất bại')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSemester = (sem: SemesterRow, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSemester(sem)
    setSemesterForm({ code: sem.code, startDate: sem.startDate || '', endDate: sem.endDate || '' })
    setShowSemesterForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Bạn có chắc chắn muốn xoá lớp học này?')) return
    try {
      await api.deleteClass(id)
      setSelectedClassIds(prev => { const n = new Set(prev); n.delete(id); return n; })
      setClasses(prev => prev.filter(c => c.id !== id))
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Xoá thất bại')
    }
  }

  const handleBulkDeleteClasses = async () => {
    if (selectedClassIds.size === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xoá ${selectedClassIds.size} lớp học đã chọn?`)) return
    
    try {
      const results = await Promise.allSettled(Array.from(selectedClassIds).map(id => api.deleteClass(id)))
      const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
      
      if (failed.length > 0) {
        alert(failed.map(f => f.reason.message || 'Lỗi').join('\n'))
      } else {
        alert('Xoá thành công')
      }
      setClasses(prev => prev.filter(c => !selectedClassIds.has(c.id)))
      setSelectedClassIds(new Set())
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Xoá hàng loạt thất bại')
    }
  }

  const handleEditClass = (cls: ClassRow, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingClass(cls)
    setClassForm({
      code: cls.code,
      name: cls.name || '',
      subjectId: typeof cls.subject === 'object' && cls.subject ? cls.subject.id : '',
      subjectIds: [],
      semesterId: typeof cls.semester === 'object' && cls.semester ? cls.semester.id : '',
      campus: cls.campus || '',
      lecturerId: cls.lecturer?.id || cls.lecturers?.[0]?.id || '',
    })
    setShowClassForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
  const filteredClassesBySemester = selectedSemester ? classes.filter(c => typeof c.semester === 'object' && c.semester ? c.semester.id === selectedSemester.id : false) : []
  
  const subjectsInSemester = subjects.filter(s => 
    filteredClassesBySemester.some(c => typeof c.subject === 'object' && c.subject && (c.subject as any).id === s.id)
  )

  const finalFilteredClasses = selectedSubject 
    ? filteredClassesBySemester.filter(c => typeof c.subject === 'object' && c.subject ? c.subject.id === selectedSubject.id : false) 
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
      crumbs.push({ label: 'Phân cấp Lớp học', onClick: () => navigateToLevel('semester') } as never)
      
      if (selectedSemester) {
        if (level === 'subject') {
          crumbs.push({ label: selectedSemester.code, path: '' })
        } else {
          crumbs.push({ label: selectedSemester.code, onClick: () => navigateToLevel('subject') } as never)
          
          if (selectedSubject) {
            if (level === 'class') {
              crumbs.push({ label: selectedSubject.code, path: '' })
            } else {
              crumbs.push({ label: selectedSubject.code, onClick: () => navigateToLevel('class') } as never)
              if (selectedClass) crumbs.push({ label: selectedClass.code, path: '' })
            }
          }
        }
      }
    }
    return crumbs
  }

  const semesterOptions = [...semesters].sort((a, b) => a.code.localeCompare(b.code)).map(s => ({ value: s.id, label: s.code }))
  const subjectOptions = [...subjects].sort((a, b) => a.code.localeCompare(b.code)).map(s => ({ value: s.id, label: `${s.code} - ${s.name}` }))

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Quản lý Phân cấp Lớp học"
        breadcrumbs={getBreadcrumbs()}
        actions={
          <div className="flex gap-2">
            {/* Nút Chọn / Huỷ chọn */}
            <Button
              size="sm"
              variant={selectionMode ? 'primary' : 'outline'}
              className={selectionMode ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'text-slate-700 dark:text-slate-300 border-slate-200'}
              onClick={() => {
                setSelectionMode(!selectionMode)
                if (selectionMode) {
                  setSelectedSemesterIds(new Set())
                  setSelectedClassIds(new Set())
                }
              }}
            >
              <CheckSquare size={16} className="mr-2" /> {selectionMode ? 'Hủy chọn' : 'Chọn'}
            </Button>
            {selectionMode && (
              <Button
                size="sm"
                variant="outline"
                className="text-brand-700 border-brand-200 hover:bg-brand-50"
                onClick={() => {
                  if (level === 'semester') {
                    if (selectedSemesterIds.size === semesters.length && semesters.length > 0) {
                      setSelectedSemesterIds(new Set())
                    } else {
                      setSelectedSemesterIds(new Set(semesters.map(s => s.id)))
                    }
                  } else if (level === 'class') {
                    // Because finalFilteredClasses is defined lower down, we re-evaluate or use a fallback. 
                    // Let's filter here directly since we have the same conditions.
                    const classesToSelect = classes.filter(c => {
                      if (level !== 'class') return false
                      const semMatch = typeof c.semester === 'object' && c.semester ? c.semester.id === selectedSemester?.id : false
                      const subMatch = typeof c.subject === 'object' && c.subject ? c.subject.id === selectedSubject?.id : false
                      return semMatch && subMatch
                    })
                    if (selectedClassIds.size === classesToSelect.length && classesToSelect.length > 0) {
                      setSelectedClassIds(new Set())
                    } else {
                      setSelectedClassIds(new Set(classesToSelect.map(c => c.id)))
                    }
                  }
                }}
              >
                Chọn tất cả
              </Button>
            )}

            {level === 'semester' && (
              <Button
                size="sm"
                onClick={() => {
                  if (showSemesterForm) {
                    setShowSemesterForm(false)
                    setEditingSemester(null)
                    setSemesterForm({ code: '', startDate: '', endDate: '' })
                  } else {
                    setShowSemesterForm(true)
                  }
                  setShowClassForm(false)
                }}
                className={`shadow-sm transition-all duration-200 flex items-center gap-2 ${showSemesterForm ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {showSemesterForm ? <X size={16} /> : <Plus size={16} />}
                {showSemesterForm ? 'Đóng' : 'Tạo kỳ học mới'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (showClassForm) {
                  setShowClassForm(false)
                  setEditingClass(null)
                  setClassForm({ code: '', name: '', subjectId: '', subjectIds: [], semesterId: '', campus: '', lecturerId: '' })
                  setMultiClassForm([{ code: '', lecturerId: '' }])
                } else {
                  setShowClassForm(true)
                  if (level === 'class' && !editingClass) {
                    setMultiClassForm([{ code: '', lecturerId: '' }])
                  }
                }
                setShowSemesterForm(false)
              }}
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
            <CalendarDays size={20}/> {editingSemester ? `Chỉnh sửa Kỳ học: ${editingSemester.code}` : 'Tạo Kỳ học mới'}
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
            <CardHeader title={editingClass ? `Chỉnh sửa Lớp: ${editingClass.code}` : 'Tạo lớp mới'} />
          </div>
          <div className="p-6">
            {level === 'class' && !editingClass ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Danh sách lớp cần tạo</h4>
                  <Button size="sm" variant="outline" className="text-brand-600 border-brand-200 hover:bg-brand-50" onClick={() => setMultiClassForm([...multiClassForm, { code: '', lecturerId: '' }])}>
                    <Plus size={16} className="mr-1" /> Thêm lớp
                  </Button>
                </div>
                {multiClassForm.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 relative">
                    <div className="flex-1 grid gap-4 sm:grid-cols-2">
                      <Input 
                        label="Mã lớp" 
                        placeholder="Ví dụ: SE1702" 
                        value={item.code} 
                        onChange={(e) => {
                          const newForm = [...multiClassForm]
                          newForm[index].code = e.target.value
                          setMultiClassForm(newForm)
                        }} 
                      />
                      <Select 
                        label="Giảng viên (Tuỳ chọn)" 
                        options={[{value:'', label: 'Chưa phân công'}, ...lecturers]} 
                        value={item.lecturerId} 
                        onChange={(e) => {
                          const newForm = [...multiClassForm]
                          newForm[index].lecturerId = e.target.value
                          setMultiClassForm(newForm)
                        }} 
                      />
                    </div>
                    {multiClassForm.length > 1 && (
                      <button 
                        type="button"
                        className="mt-8 text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        onClick={() => {
                          const newForm = multiClassForm.filter((_, i) => i !== index)
                          setMultiClassForm(newForm)
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Input label="Mã lớp" placeholder="Ví dụ: SE1702" value={classForm.code} onChange={(e) => setClassForm({ ...classForm, code: e.target.value })} />
                <Input label="Tên lớp (Tuỳ chọn)" placeholder="Ví dụ: Lớp SE nâng cao" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
                <Select 
                  label="Kỳ học" 
                  options={[{value:'', label: 'Chọn kỳ học...'}, ...semesterOptions]} 
                  value={classForm.semesterId || (selectedSemester?.id ?? '')} 
                  onChange={(e) => setClassForm({ ...classForm, semesterId: e.target.value })} 
                  disabled={level === 'class' && !editingClass}
                />
                {!editingClass ? (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Môn học (Có thể chọn nhiều)</label>
                    <div className="flex flex-wrap gap-2 p-2 border border-slate-300 dark:border-slate-700 rounded-xl max-h-40 overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar">
                      {subjects.filter(s => {
                        const currentSemId = classForm.semesterId || selectedSemester?.id;
                        if (!currentSemId) return true;
                        
                        // Không hiện những môn đã có lớp ở học kỳ khác
                        const hasClassInOtherSem = classes.some(c => 
                          typeof c.subject === 'object' && c.subject && (c.subject as any).id === s.id && 
                          typeof c.semester === 'object' && c.semester && (c.semester as any).id !== currentSemId
                        )
                        return !hasClassInOtherSem
                      }).map(s => {
                        const isSelected = classForm.subjectIds?.includes(s.id) || (!classForm.subjectIds?.length && classForm.subjectId === s.id) || (!classForm.subjectIds?.length && !classForm.subjectId && selectedSubject?.id === s.id)
                        return (
                          <label 
                            key={s.id} 
                            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${isSelected ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-300 cursor-pointer' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-300 cursor-pointer'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                let newIds = classForm.subjectIds || []
                                if (newIds.length === 0) {
                                  const currentId = classForm.subjectId || selectedSubject?.id
                                  if (currentId && currentId !== s.id) {
                                    newIds = [currentId]
                                  }
                                }
                                if (e.target.checked) {
                                  setClassForm(prev => ({ ...prev, subjectIds: [...newIds, s.id], subjectId: '' }))
                                } else {
                                  setClassForm(prev => ({ ...prev, subjectIds: newIds.filter(id => id !== s.id), subjectId: '' }))
                                }
                              }}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            {s.code}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <Select 
                    label="Môn học" 
                    options={[{value:'', label: 'Chọn môn học...'}, ...subjectOptions]} 
                    value={classForm.subjectId || (selectedSubject?.id ?? '')} 
                    onChange={(e) => setClassForm({ ...classForm, subjectId: e.target.value })} 
                  />
                )}
                <Select 
                  label="Giảng viên (Tuỳ chọn)" 
                  options={[{value:'', label: 'Chưa phân công'}, ...lecturers]} 
                  value={classForm.lecturerId} 
                  onChange={(e) => setClassForm({ ...classForm, lecturerId: e.target.value })} 
                />
                <Input label="Campus (Tuỳ chọn)" placeholder="Ví dụ: Quy Nhơn" value={classForm.campus} onChange={(e) => setClassForm({ ...classForm, campus: e.target.value })} />
              </div>
            )}
            <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                className="px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center gap-2"
                onClick={handleCreateClass}
                disabled={isSubmitting || (level === 'class' && !editingClass ? multiClassForm.every(c => c.code.trim() === '') : (!classForm.code || (!classForm.semesterId && !selectedSemester) || (editingClass ? (!classForm.subjectId && !selectedSubject) : (!classForm.subjectIds?.length && !classForm.subjectId && !selectedSubject))))}
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
            <div className="space-y-4">
              {selectedSemesterIds.size > 0 && (
                <div className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in">
                  <span className="text-sm font-medium text-red-800">Đã chọn {selectedSemesterIds.size} kỳ học</span>
                  {selectedSemesterIds.size === 1 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        const semId = Array.from(selectedSemesterIds)[0];
                        const sem = semesters.find(s => s.id === semId);
                        if (sem) {
                          handleEditSemester(sem, e);
                          setSelectedSemesterIds(new Set());
                        }
                      }}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Edit3 size={16} className="mr-1" /> Chỉnh sửa
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setConfirmBulkDeleteSemesters(true)} className="bg-red-600 hover:bg-red-700 text-white">
                    <Trash2 size={16} className="mr-1" /> Xoá đã chọn
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedSemesterIds(new Set())}>
                    Huỷ chọn
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {semesters.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Chưa có Học kỳ nào. Nhấn "Tạo kỳ học mới" để bắt đầu.
                </div>
              ) : (
                [...semesters].sort((a, b) => a.code.localeCompare(b.code)).map(sem => {
                  const classCount = classes.filter(c => typeof c.semester === 'object' && c.semester ? c.semester.id === sem.id : false).length
                  return (
                    <Card 
                      key={sem.id} 
                      className={`group cursor-pointer hover:border-brand-300 hover:shadow-md transition-all relative ${selectedSemesterIds.has(sem.id) ? 'border-brand-500 bg-brand-50/10' : 'bg-white'}`}
                      onClick={() => {
                        if (selectionMode) {
                          setSelectedSemesterIds(prev => {
                            const next = new Set(prev)
                            if (next.has(sem.id)) next.delete(sem.id)
                            else next.add(sem.id)
                            return next
                          })
                        } else {
                          setSelectedSemester(sem); setLevel('subject') 
                        }
                      }}
                    >
                      <div className="p-5 flex flex-col items-center justify-center text-center gap-3">
                        {selectionMode && (
                          <div className="absolute top-3 left-3">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                              checked={selectedSemesterIds.has(sem.id)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSelectedSemesterIds(prev => {
                                  const next = new Set(prev)
                                  if (checked) next.add(sem.id)
                                  else next.delete(sem.id)
                                  return next
                                })
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            onClick={(e) => handleEditSemester(sem, e)}
                            title="Chỉnh sửa"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteSemester(sem.id); }}
                            title="Xoá"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform mt-2">
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
          </div>
          )}

          {level === 'subject' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subjectsInSemester.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Chưa có lớp học nào thuộc các môn trong Học kỳ này. Nhấn "Tạo lớp học mới" để thêm lớp.
                </div>
              ) : (
                [...subjectsInSemester].sort((a, b) => a.code.localeCompare(b.code)).map(sub => {
                  const classCount = filteredClassesBySemester.filter(c => typeof c.subject === 'object' && c.subject ? c.subject.id === sub.id : false).length
                  return (
                    <Card 
                      key={sub.id} 
                      className="cursor-pointer hover:border-brand-300 hover:shadow-md transition-all relative bg-white"
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
            <div className="space-y-4">
              {selectedClassIds.size > 0 && (
                <div className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in">
                  <span className="text-sm font-medium text-red-800">Đã chọn {selectedClassIds.size} lớp học</span>
                  {selectedClassIds.size === 1 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        const clsId = Array.from(selectedClassIds)[0];
                        const cls = classes.find(c => c.id === clsId);
                        if (cls) {
                          handleEditClass(cls, e);
                          setSelectedClassIds(new Set());
                        }
                      }}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Edit3 size={16} className="mr-1" /> Chỉnh sửa
                    </Button>
                  )}
                  <Button size="sm" onClick={handleBulkDeleteClasses} className="bg-red-600 hover:bg-red-700 text-white">
                    <Trash2 size={16} className="mr-1" /> Xoá đã chọn
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedClassIds(new Set())}>
                    Huỷ chọn
                  </Button>
                </div>
              )}
              <Card className="border border-slate-100 shadow-sm bg-white relative">
                <div className="p-2 overflow-visible">
                  <DataTable<ClassRow>
                    columns={[
                      ...(selectionMode ? [{
                        key: 'select', header: '',
                        render: (r: ClassRow) => (
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                            checked={selectedClassIds.has(r.id)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setSelectedClassIds(prev => {
                                const next = new Set(prev)
                                if (checked) next.add(r.id)
                                else next.delete(r.id)
                                return next
                              })
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )
                      }] : []),
                      {
                        key: 'code', header: 'Mã lớp',
                      render: (r) => (
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => loadStudents(r)}>
                          <Folder size={16} className="text-amber-400 group-hover:text-amber-500" />
                          <span className="font-mono font-bold text-brand-600 group-hover:underline">{r.code}</span>
                        </div>
                      )
                    },
                    {
                      key: 'lecturer', header: 'Giảng viên',
                      render: (r) => r.lecturers?.[0]?.name || r.lecturer?.fullName || <span className="text-slate-400">—</span>,
                    },
                    {
                      key: 'studentCount', header: 'Sĩ số',
                      render: (r) => <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{r.studentCount ?? 0} SV</span>
                    },
                    {
                      key: 'actions', header: 'Thao tác',
                      render: (r) => {
                        const cls = r
                        return (
                          <div className="flex items-center gap-2 justify-end relative">
                            <Button size="sm" variant="outline" className="text-brand-600 border-brand-200" onClick={(e: React.MouseEvent) => { e.stopPropagation(); loadStudents(cls) }}>
                              <Users size={13} className="mr-1" />Xem DS
                            </Button>
                            <Button size="sm" variant="outline" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openNote(cls) }}>
                              <StickyNote size={13} className="mr-1" />Ghi chú
                            </Button>
                            <button 
                              className={`p-1 rounded hover:bg-slate-100 text-slate-500 ml-1 ${openMenuId === cls.id ? 'bg-slate-100 text-slate-700' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId(openMenuId === cls.id ? null : cls.id)
                              }}
                            >
                              <span className="font-bold tracking-widest leading-none" style={{ letterSpacing: '2px' }}>...</span>
                            </button>
                            {openMenuId === cls.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center text-slate-700 dark:text-slate-300 rounded-t-lg transition-colors" onClick={(e) => { setOpenMenuId(null); if (selectedClassIds.size === 1) { const id = Array.from(selectedClassIds)[0]; const scls = classes.find(c => c.id === id); if (scls) handleEditClass(scls, e); } else { handleEditClass(cls, e); } }}>
                                  Chỉnh sửa
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2"></div>
                                <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center text-red-600 dark:text-red-400 rounded-b-lg transition-colors" onClick={(e) => { setOpenMenuId(null); if (selectedClassIds.size > 0) handleBulkDeleteClasses(); else handleDeleteClass(cls.id, e); }}>
                                  Xoá Lớp học
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      },
                    },
                  ]}
                  data={finalFilteredClasses}
                  keyExtractor={(r) => r.id}
                  onRowClick={selectionMode ? (row) => {
                    setSelectedClassIds(prev => {
                      const next = new Set(prev)
                      if (next.has(row.id)) next.delete(row.id)
                      else next.add(row.id)
                      return next
                    })
                  } : undefined}
                />
              </div>
            </Card>
          </div>
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
                  <DataTable<StudentRow>
                    columns={[
                      { key: 'name', header: 'Họ và tên', render: (r) => <span className="font-medium">{r.name}</span> },
                      { key: 'email', header: 'Email', render: (r) => <span className="text-slate-600 text-sm">{r.email}</span> },
                      { key: 'role', header: 'Vai trò', render: () => <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">Sinh viên</span> }
                    ]}
                    data={classStudents}
                    keyExtractor={(r) => r.studentId || r.email}
                  />
                )}
              </div>
            </Card>
          )}

        </div>
      )}
      {/* Single Delete Confirmation Modal */}
      {confirmDeleteSemester && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-red-200 dark:border-red-900/40 shadow-xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                <ShieldAlert className="text-red-600 dark:text-red-400 w-6 h-6 animate-pulse" />
              </div>
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Bạn có chắc chắn muốn xóa kỳ học này?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hành động này sẽ xóa toàn bộ các lớp học, bài nộp, và thông tin liên quan trong kỳ học này khỏi cơ sở dữ liệu. Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteSemester(null)}>
                  Hủy bỏ
                </Button>
                <Button onClick={() => handleDeleteSemester(confirmDeleteSemester!)} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium">
                  {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin inline" /> : null}
                  Xóa vĩnh viễn
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* Bulk Delete Confirmation Modal */}
      {confirmBulkDeleteSemesters && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-red-200 dark:border-red-900/40 shadow-xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                <ShieldAlert className="text-red-600 dark:text-red-400 w-6 h-6 animate-pulse" />
              </div>
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Xác nhận xóa hàng loạt?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Bạn đang chuẩn bị xóa vĩnh viễn <span className="font-bold text-red-600">{selectedSemesterIds.size}</span> kỳ học cùng toàn bộ dữ liệu lớp học bên trong. Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmBulkDeleteSemesters(false)}>
                  Hủy bỏ
                </Button>
                <Button onClick={handleBulkDeleteSemesters} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium">
                  {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin inline" /> : null}
                  Xóa vĩnh viễn
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}

    </div>
  )
}