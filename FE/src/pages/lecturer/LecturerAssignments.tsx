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
  { id: 'all', label: 'All assignments' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'coding', label: 'Coding' },
  { id: 'group', label: 'Group work' },
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

  const [labNumber, setLabNumber] = useState<number>(1)
  const [weightPercentage, setWeightPercentage] = useState<number>(10)

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
      alert('Enter an assignment title or attach a brief so the AI can analyse it.')
      return
    }
    setGeneratingRubric(true)
    try {
      const formData = new FormData()
      formData.append('topic', newTitle || 'Extracted automatically from the file')
      formData.append('difficulty', 'medium')
      formData.append('totalScore', '10')
      if (newFile) formData.append('file', newFile)

      const res = await api.generateRubricAI(formData)
      setAiRubric(typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res))
    } catch (e: any) {
      alert(e.message || 'The AI failed to analyse the rubric')
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
        (newFile ? `\n\n[Attachment: ${newFile.name}]` : '') + 
        (aiRubric ? `\n\n[AI grading rubric]\n${aiRubric}` : '')

      const body: any = {
        title: newType === 'Lab' && (!newTitle || newTitle.startsWith('Lab')) ? `Lab ${labNumber}` : newTitle,
        type: newType, 
        description: finalDesc,
        subjectId: newSubjectId,
        weightPercentage: weightPercentage || 10,
      }
      
      let finalClassIds = newClassIds;
      if (newClassIds.includes('all')) {
        finalClassIds = classes.map(c => c.id);
      }
      if (finalClassIds.length > 0) {
        body.classIds = finalClassIds.join(',');
      }
      
      if (newDue) body.dueDate = new Date(newDue).toISOString();
      body.sendNotification = sendNotification;

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
        console.log(`[Notification] Automatic notification triggered (handled by the backend)`)
      }
      
      setIsModalOpen(false)
      load()
    } catch (e: any) {
      alert(e.message || 'Failed to create the assignment')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>
  if (error) return <APIError error={error} onRetry={load} />

  const formatTypeName = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'quiz': return 'Quiz'
      case 'coding': return 'Coding'
      case 'group': return 'Group work'
      default: return type
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <PageHeader 
          title="Manage Assignments" 
          breadcrumbs={[{ label: 'Lecturer', path: '/lecturer' }, { label: 'Assignments' }]} 
          actions={
            <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 flex items-center gap-2 active:scale-95 transition-transform"
              onClick={() => navigate('/lecturer/rubric-generator')}
            >
              <Sparkles size={16} />
              AI Rubric
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2 active:scale-95 transition-transform shadow-sm"
              onClick={() => navigate('/lecturer/assignments/ai-generator')}
            >
              <Sparkles size={16} />
              AI Assignment
            </Button>
            <Button
              size="sm"
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center gap-2 active:scale-95 transition-transform shadow-sm"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} />
              New Assignment
            </Button>
          </div>
          }
        />  
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create new</h3>
              <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setNewType('Assignment')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${newType === 'Assignment' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >Assignment</button>
                <button 
                  onClick={() => setNewType('Exam')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${newType === 'Exam' ? 'bg-white dark:bg-slate-700 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >Exam</button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              <div className={`p-3 rounded-lg border text-sm ${newType === 'Assignment' ? 'bg-brand-50 border-brand-100 text-brand-800 dark:bg-brand-900/20 dark:border-brand-800/30 dark:text-brand-300' : 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-300'}`}>
                <strong>Difference:</strong> {newType === 'Assignment' 
                  ? 'For practice. The AI grades in the background as soon as a student submits; the lecturer only reviews.' 
                  : 'A graded exam. No background grading - the lecturer runs Batch Grade once the exam is over.'}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{newType === 'Exam' ? 'Exam' : 'Assignment'} name *</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500" 
                  placeholder="e.g. OOP practice assignment"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select 
                    value={newType} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewType(val);
                      if (val === 'Lab' && (!newTitle || newTitle.startsWith('Lab'))) {
                        setNewTitle(`Lab ${labNumber}`);
                      }
                    }}
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Assignment">Written assignment</option>
                    <option value="Lab">Lab</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Coding">Coding</option>
                    <option value="Exam">General exam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deadline</label>
                  <input 
                    type="date" 
                    value={newDue} 
                    onChange={(e) => setNewDue(e.target.value)}
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {newType === 'Lab' && (
                <div className="grid grid-cols-2 gap-4 bg-brand-50/50 p-3 rounded-lg border border-brand-100 dark:bg-brand-900/10 dark:border-brand-800/30">
                  <div>
                    <label className="block text-xs font-bold text-brand-800 dark:text-brand-300 mb-1">Which lab number? *</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={labNumber}
                      onChange={(e) => {
                        const num = parseInt(e.target.value, 10) || 1;
                        setLabNumber(num);
                        if (!newTitle || newTitle.startsWith('Lab')) {
                          setNewTitle(`Lab ${num}`);
                        }
                      }}
                      className="w-full p-2 text-sm border border-brand-200 rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500 font-bold text-brand-700"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-800 dark:text-brand-300 mb-1">Weight (% of score) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={weightPercentage}
                        onChange={(e) => setWeightPercentage(parseInt(e.target.value, 10) || 10)}
                        className="w-full p-2 pr-6 text-sm border border-brand-200 rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500 font-bold text-brand-700"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <select 
                    value={newSubjectId} 
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name || s.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Apply to class</label>
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
                    <option value="all">-- All classes --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Detailed description</label>
                <textarea 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)} 
                  rows={3} 
                  className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Describe the requirements..."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Attach brief file (optional)</label>
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
                    Analyse rubric with AI
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
                  Notify students now by email / app
                </label>
              </div>

            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button className="bg-brand-600 text-white hover:bg-brand-700" onClick={handleCreateAssignment} disabled={creating || !newTitle.trim()}>
                {creating ? 'Creating...' : `Publish ${newType === 'Exam' ? 'exam' : 'assignment'}`}
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
              <p className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-200">No assignments found</p>
              <p className="mt-2 text-sm max-w-sm text-slate-500 dark:text-slate-400">
                No assignments have been created in this category yet. Use the AI generator to start.
              </p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Assignment name',
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
                  header: 'Category',
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
                  header: 'Applies to',
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
                  header: 'Deadline',
                  render: (r) => (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 py-2">
                      <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                      <span className="tabular-nums font-mono">{(r as AssignmentRow).due?.slice(0, 10) ?? '—'}</span>
                    </div>
                  )
                },
                {
                  key: 'submitted',
                  header: 'Submitted',
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
                  header: 'Status',
                  render: (r) => (
                    <div className="flex items-center justify-end py-2 pr-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>{(r as AssignmentRow).status || 'Accepting submissions'}</span>
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
                        Configure rubric
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/lecturer/assignments/${(r as AssignmentRow).id}/submissions`)}>
                        Grade
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