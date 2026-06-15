import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api, type Option } from '@/lib/api'
import {
  Sparkles,
  Loader2,
  Bot,
  CodeXml,
  FolderGit2,
  Send,
  FileCode,
  AlertTriangle,
  BrainCircuit,
  Terminal,
  Server
} from 'lucide-react'

const GEN_TABS = [
  { id: 'quiz', label: 'Trắc nghiệm' },
  { id: 'coding', label: 'Lập trình' },
  { id: 'group', label: 'Bài nhóm' },
]

export function LecturerAIGenerate() {
  const [tab, setTab] = useState('quiz')
  const [classes, setClasses] = useState<Option[]>([])
  const [classId, setClassId] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [extra, setExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [assignmentId, setAssignmentId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getClassOptions().then(setClasses).catch(console.error)
  }, [])

  const handleGenerate = async () => {
    if (!topic) return alert('Nhập chủ đề')
    setGenerating(true)
    try {
      const res = await api.generateExercise({
        classId: classId || undefined,
        type: tab,
        topic,
        difficulty,
        extra,
      })
      setResult(res.result)
      setAssignmentId(res.assignment?.id ?? null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi AI')
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!classId || !result) return alert('Chọn lớp và tạo nội dung trước')
    setError('')
    const r = result as { title?: string; description?: string; content?: unknown }
    try {
      await api.saveAIAssignment({
        classId,
        title: r.title ?? `Bài ${topic}`,
        description: r.description,
        type: tab,
        content: r.content ?? r,
        publish: true,
        jobId: assignmentId ?? undefined,
      })
      alert('Đã giao bài cho sinh viên')
      setResult(null)
      setAssignmentId(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi khi giao bài'
      setError(msg)
    }
  }

  const getTabIcon = (currentTab: string) => {
    switch (currentTab) {
      case 'quiz': return <Bot size={16} className="text-brand-500" />
      case 'coding': return <CodeXml size={16} className="text-blue-500" />
      case 'group': return <FolderGit2 size={16} className="text-emerald-500" />
      default: return <BrainCircuit size={16} />
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeader
            title="Tạo Bài Tập Bằng AI"
            description="Tự động sinh bộ câu hỏi, bài tập lập trình hoặc dự án nhóm theo cấu trúc tiêu chuẩn."
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Tạo bài (AI)' }]}
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 shadow-sm">
          <Server size={14} className="text-brand-500" />
          <span className="uppercase tracking-widest">AITA_Core_Engine_v2</span>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">

        {/* LEFT COLUMN: PARAMETERS CONSOLE */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card padding="none" className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821]">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/20 flex flex-col items-center sm:flex-row sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-brand-600 dark:bg-orange-500/10 dark:text-brand-400">
                  <BrainCircuit size={18} strokeWidth={2} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Tham số đầu vào</h3>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Type Selection Tabs */}
              <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 shadow-inner border border-slate-200/50 dark:bg-[#0f1117] dark:border-slate-800/50">
                <Tabs items={GEN_TABS} activeId={tab} onChange={setTab} />
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                <Select
                  label="Lớp / Môn học"
                  options={classes}
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full text-sm"
                />

                <Input
                  label="Chủ đề bài tập"
                  placeholder="Ví dụ: Cấu trúc dữ liệu Tree..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-sm"
                />

                <Select
                  label="Độ khó yêu cầu"
                  options={[
                    { value: 'easy', label: 'Cơ bản (Understand)' },
                    { value: 'medium', label: 'Trung bình (Apply & Analyze)' },
                    { value: 'hard', label: 'Khó (Evaluate & Create)' },
                  ]}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full text-sm"
                />

                <Textarea
                  label="Prompt bổ sung"
                  placeholder="Bổ sung yêu cầu chi tiết..."
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  rows={3}
                  className="w-full text-sm resize-none"
                />
              </div>

              {/* Generate Button Wrapper */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleGenerate}
                  disabled={generating}
                  className={`h-12 w-full font-bold text-sm tracking-wide gap-2 transition-all ${
                    generating ? 'opacity-80 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-brand-500/25 hover:-translate-y-0.5'
                  }`}
                >
                  {generating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      SYSTEM_PROCESSING...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Khởi tạo AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: PREVIEW TERMINAL PLATFORM */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[600px]">
          <Card padding="none" className="flex flex-col flex-1 overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900 border-x border-y">
            
            {/* Terminal Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-[#0c1017]">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400 border border-red-500/20" />
                  <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500/20" />
                  <span className="w-3 h-3 rounded-full bg-green-400 border border-green-500/20" />
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {getTabIcon(tab)}
                  <span className="text-xs font-mono font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    OUTPUT_CONSOLE
                  </span>
                </div>
              </div>
              <Badge variant="neutral" className="bg-white dark:bg-slate-800 font-mono text-[10px] uppercase font-bold tracking-widest shadow-sm border border-slate-200 dark:border-slate-700">
                Chờ dữ liệu
              </Badge>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-[#0c1017]/50 relative">
              
              {/* Error Output */}
              {error && (
                <div className="m-4 rounded-lg bg-red-50 border border-red-200 p-4 shrink-0 shadow-sm dark:border-red-900/50 dark:bg-red-500/10">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold uppercase tracking-wide text-xs mb-1">
                    <AlertTriangle size={16} /> <span>System Error</span>
                  </div>
                  <p className="font-mono text-sm text-red-600 dark:text-red-300 ml-6">{error}</p>
                </div>
              )}

              {/* Viewport content */}
              <div className="flex-1 overflow-y-auto p-6 relative">
                {result ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 font-mono text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-[#0f1117] dark:text-slate-300 shadow-sm">
                    <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <Terminal size={14} className="text-brand-500" />
                      Payload Object Tree
                    </div>
                    <pre className="whitespace-pre-wrap word-break-all text-slate-700 dark:text-emerald-400">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    {generating ? (
                      <div className="flex flex-col items-center gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100 text-brand-500 dark:bg-[#0f1117] dark:border-slate-800 dark:text-brand-400 animate-pulse">
                          <BrainCircuit size={28} className="animate-spin duration-[4s]" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                            Synthesizing Data
                          </p>
                          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">Đang truy xuất phân tích cấu trúc lớp học...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 opacity-60 transition-opacity hover:opacity-100">
                        <div className="rounded-full bg-slate-200/50 p-4 dark:bg-slate-800/50">
                          <FileCode size={32} className="text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-2">Bảng điều khiển trống</p>
                        <p className="text-xs max-w-xs text-center text-slate-500 dark:text-slate-500">
                          Chọn cấu hình tham số phía bên trái để AI tự động thiết lập và sinh khung đề bài tập.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="shrink-0 flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151821]">
              <Button
                variant={result ? "primary" : "secondary"}
                onClick={handlePublish}
                disabled={!result || !classId}
                className={`min-w-[160px] font-bold shadow-sm transition-all text-sm gap-2 uppercase tracking-wide ${(!result || !classId) ? 'opacity-50' : 'hover:scale-[1.02]'}`}
              >
                <Send size={16} /> Phê duyệt & Ra đề
              </Button>
            </div>
            
          </Card>
        </div>

      </div>
    </div>
  )
}