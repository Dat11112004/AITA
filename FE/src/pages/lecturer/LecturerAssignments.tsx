import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { api, type AssignmentRow, type SubjectRow, type ClassRow } from '@/lib/api'
import { Calendar, Layers, GraduationCap, Inbox, CheckCircle2, Loader2, Sparkles, Plus, Bell, FileCheck2 } from 'lucide-react'
import { APIError } from '@/components/common/ErrorState'

const TYPE_TABS = [
  { id: 'all', label: 'Tất cả Bài tập' },
  { id: 'quiz', label: 'Trắc nghiệm' },
  { id: 'coding', label: 'Lập trình' },
  { id: 'group', label: 'Bài tập nhóm' },
]

export function LecturerAssignments() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('Assignment')
  const [newDue, setNewDue] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newSubjectId, setNewSubjectId] = useState('')
  const [newClassIds, setNewClassIds] = useState<string[]>(['all'])
  const [newFile, setNewFile] = useState<File | null>(null)
  const [sendNotification, setSendNotification] = useState(true)
  
  const [creating, setCreating] = useState(false)
  const [generatingRubric, setGeneratingRubric] = useState(false)
  const [aiRubric, setAiRubric] = useState<string>('')

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const params: Record<string, string> = {}
    if (tab !== 'all') params.type = tab
    api.getAssignments(params)
      .then(res => { if (alive) setRows(res || []) })
      .catch(err => { if (alive) setError(err) })
      
    Promise.all([
      api.getSubjects(1, 1000),
      api.getClasses(1, 1000)
    ]).then(([subData, clsData]) => {
      if (alive) {
        setSubjects(subData || [])
        setClasses(clsData || [])
        if (subData?.length > 0) setNewSubjectId(subData[0].id)
      }
    }).finally(() => { if (alive) setLoading(false) })
    
    return () => { alive = false }
  }, [tab])

  useEffect(() => {
    const cleanup = load()
    return cleanup
  }, [load])

  const handleGenerateRubric = async () => {
    if (!newTitle && !newFile) {
      alert('Vui lòng nhập tên bài tập hoặc đính kèm file đề bài để AI phân tích.')
      return
    }
    setGeneratingRubric(true)
    try {
      const formData = new FormData()
      formData.append('topic', newTitle || 'Tự động trích xuất từ file')
      formData.append('difficulty', 'medium')
      formData.append('totalScore', '10')
      if (newFile) formData.append('file', newFile)

      const res = await api.generateRubricAI(formData)
      setAiRubric(typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res))
    } catch (e: any) {
      alert(e.message || 'Lỗi khi nhờ AI phân tích rubric')
    } finally {
      setGeneratingRubric(false)
    }
  }

  const handleCreateAssignment = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      // In a real app we might upload the file to get a URL, for now just pass filename if exists
      const finalDesc = newDesc + 
        (newFile ? `\n\n[File đính kèm: ${newFile.name}]` : '') + 
        (aiRubric ? `\n\n[Rubric Chấm Điểm AI]\n${aiRubric}` : '')

      const body: any = {
        title: newTitle,
        type: newType, 
        description: finalDesc,
        subjectId: newSubjectId,
      }
      
      let finalClassIds = newClassIds;
      if (newClassIds.includes('all')) {
        finalClassIds = classes.map(c => c.id);
      }
      if (finalClassIds.length > 0) {
        body.classIds = finalClassIds.join(',');
      }
      
      if (newDue) body.dueDate = new Date(newDue).toISOString();

      let payload: any = body;
      if (newFile) {
        payload = new FormData();
        Object.keys(body).forEach(key => {
          if (body[key] !== undefined) {
            payload.append(key, body[key]);
          }
        });
        payload.append('file', newFile);
      }

      await api.createAssignment(payload)
      
      if (sendNotification) {
        await api.broadcastNotification({
          title: `Bài tập mới: ${newTitle}`,
          message: `Giảng viên đã giao ${newType === 'Exam' ? 'đề thi' : 'bài tập'} mới. Vui lòng kiểm tra trên hệ thống.`,
          targetRole: 'STUDENT'
        }).catch(() => {}) // Ignore if broadcast fails for now
        // Simulate sending email to class
        console.log(`[Notification] Đã gửi thông báo cho các lớp: ${newClassIds.includes('all') ? 'Tất cả' : newClassIds.join(', ')}`)
      }
      
      setIsModalOpen(false)
      load()
    } catch (e: any) {
      alert(e.message || 'Lỗi tạo bài tập')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>
  if (error) return <APIError error={error} onRetry={load} />

  const formatTypeName = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'quiz': return 'Trắc nghiệm'
      case 'coding': return 'Lập trình'
      case 'group': return 'Bài nhóm'
      default: return type
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <PageHeader 
          title="Quản lý Bài tập" 
          breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Bài tập' }]} 
          actions={
            <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 flex items-center gap-2 active:scale-95 transition-transform"
              onClick={() => navigate('/lecturer/rubric-generator')}
            >
              <Sparkles size={16} />
              Tạo Rubric AI
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2 active:scale-95 transition-transform shadow-sm"
              onClick={() => navigate('/lecturer/assignments/ai-generator')}
            >
              <Sparkles size={16} />
              Tạo bài tập AI
            </Button>
            <Button
              size="sm"
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center gap-2 active:scale-95 transition-transform shadow-sm"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} />
              Tạo Assignment mới
            </Button>
          </div>
          }
        />  
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tạo mới</h3>
              <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setNewType('Assignment')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${newType === 'Assignment' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >Bài tập</button>
                <button 
                  onClick={() => setNewType('Exam')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${newType === 'Exam' ? 'bg-white dark:bg-slate-700 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >Đề thi</button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              <div className={`p-3 rounded-lg border text-sm ${newType === 'Assignment' ? 'bg-brand-50 border-brand-100 text-brand-800 dark:bg-brand-900/20 dark:border-brand-800/30 dark:text-brand-300' : 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-300'}`}>
                <strong>Khác biệt:</strong> {newType === 'Assignment' 
                  ? 'Dành cho luyện tập. AI sẽ tự động CHẤM ĐIỂM NGẦM ngay khi sinh viên nộp bài. Giảng viên chỉ cần review lại.' 
                  : 'Đề thi đánh giá quan trọng. Sẽ KHÔNG chấm ngầm, Giảng viên bám sát và bấm chấm toàn bộ (Batch Grade) sau khi thi xong.'}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tên {newType === 'Exam' ? 'Đề thi' : 'Bài tập'} *</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500" 
                  placeholder="Ví dụ: Bài tập tự luyện OOP"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phân loại cụ thể</label>
                  <select 
                    value={newType} 
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Assignment">Bài tập tự luận</option>
                    <option value="Quiz">Trắc nghiệm</option>
                    <option value="Coding">Lập trình (Coding)</option>
                    <option value="Exam">Đề thi chung</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hạn nộp</label>
                  <input 
                    type="date" 
                    value={newDue} 
                    onChange={(e) => setNewDue(e.target.value)}
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Môn học</label>
                  <select 
                    value={newSubjectId} 
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name || s.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Áp dụng cho Lớp</label>
                  <select 
                    multiple
                    value={newClassIds} 
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      if (values.includes('all')) {
                        setNewClassIds(['all']);
                      } else {
                        setNewClassIds(values.filter(v => v !== 'all'));
                      }
                    }}
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500 h-24"
                  >
                    <option value="all">-- Tất cả các lớp --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả chi tiết</label>
                <textarea 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)} 
                  rows={3} 
                  className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Mô tả yêu cầu..."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Đính kèm File đề bài (Tùy chọn)</label>
                <div className="flex gap-2 items-start">
                  <input 
                    type="file" 
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    className="flex-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateRubric}
                    disabled={generatingRubric || (!newFile && !newTitle)}
                    className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 shrink-0"
                  >
                    {generatingRubric ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
                    Phân tích Rubric AI
                  </Button>
                </div>
              </div>

              {aiRubric && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800 rounded-lg">
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-2"><Sparkles size={16}/> AI Rubric Review</h4>
                  <textarea 
                    value={aiRubric} 
                    onChange={(e) => setAiRubric(e.target.value)} 
                    rows={4} 
                    className="w-full p-2 text-xs font-mono border rounded bg-white dark:bg-slate-900 dark:border-slate-700 outline-none"
                  ></textarea>
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input 
                  type="checkbox" 
                  id="notifyStudents" 
                  checked={sendNotification} 
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="notifyStudents" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <Bell size={16} className="text-brand-500" />
                  Gửi thông báo ngay cho sinh viên qua Email / App
                </label>
              </div>

            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button className="bg-brand-600 text-white hover:bg-brand-700" onClick={handleCreateAssignment} disabled={creating || !newTitle.trim()}>
                {creating ? 'Đang tạo...' : `Publish ${newType === 'Exam' ? 'Đề thi' : 'Bài tập'}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Workspace Card */}
      <Card padding="none" className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821]">

        {/* Filter Navigation Tabs Strip */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/20">
          <div className="inline-flex rounded-xl bg-white p-1 shadow-sm border border-slate-200/70 dark:bg-[#0f1117] dark:border-slate-800">
            <Tabs items={TYPE_TABS} activeId={tab} onChange={setTab} />
          </div>
        </div>

        {/* Data Grid Section */}
        <div className="p-6 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-slate-50 p-5 dark:bg-slate-800/50">
                <Layers size={36} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-200">Không tìm thấy bài tập</p>
              <p className="mt-2 text-sm max-w-sm text-slate-500 dark:text-slate-400">
                Danh mục này hiện chưa có bài tập nào được tạo. Nhấp vào "Tạo Đề Thay Thế AI" để bắt đầu.
              </p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Tên bài tập',
                  render: (r) => (
                    <div className="py-2 max-w-xs sm:max-w-md">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight transition-colors cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 line-clamp-1">
                        {(r as AssignmentRow).title}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 font-semibold uppercase tracking-wider">
                        REF_ID: {(r as AssignmentRow).id}
                      </p>
                    </div>
                  )
                },
                {
                  key: 'type',
                  header: 'Phân loại',
                  render: (r) => (
                    <div className="py-2">
                       <Badge variant="neutral" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-none shadow-sm rounded-md px-2.5 py-1 text-[11px] uppercase tracking-wider">
                        {formatTypeName((r as AssignmentRow).type)}
                      </Badge>
                    </div>
                  )
                },
                {
                  key: 'class',
                  header: 'Lớp áp dụng',
                  render: (r) => (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 py-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        <GraduationCap size={12} />
                      </div>
                      <span>{(r as AssignmentRow).class}</span>
                    </div>
                  )
                },
                {
                  key: 'due',
                  header: 'Hạn nộp bài',
                  render: (r) => (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 py-2">
                      <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                      <span className="tabular-nums font-mono">{(r as AssignmentRow).due?.slice(0, 10) ?? '—'}</span>
                    </div>
                  )
                },
                {
                  key: 'submitted',
                  header: 'Bài đã nộp',
                  render: (r) => (
                    <div className="flex items-center gap-1.5 text-xs py-2">
                      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300 font-bold shadow-sm">
                        <Inbox size={12} className="text-brand-500" />
                        <span>{(r as AssignmentRow).submitted ?? 0}</span>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (r) => (
                    <div className="flex items-center justify-end py-2 pr-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>{(r as AssignmentRow).status || 'Đang nhận bài'}</span>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'actions',
                  header: '',
                  render: (r) => (
                    <div className="flex justify-end gap-2 pr-4">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/lecturer/assignments/${(r as AssignmentRow).id}/rubric`)}>
                        Cấu hình Rubric
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/lecturer/assignments/${(r as AssignmentRow).id}/submissions`)}>
                        Chấm bài
                      </Button>
                    </div>
                  )
                }
              ]}
              data={rows}
              keyExtractor={(r) => r.id}
            />
          )}
        </div>
      </Card>
    </div>
  )
}