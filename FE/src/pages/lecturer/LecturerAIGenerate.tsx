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
  Terminal
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
    <div className="space-y-8 p-1 selection:bg-brand-500 selection:text-white min-h-screen bg-slate-50/50 dark:bg-slate-900/50">

      {/* Premium Studio Header */}
      <div className="relative rounded-2xl overflow-hidden bg-[#07090e] text-white p-2 border border-white/[0.08] dark:border-white/[0.05] shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between pr-4">
          <PageHeader
            title="Tạo bài tập bằng AI"
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Tạo bài (AI)' }]}
          />
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono border border-brand-500/30 bg-brand-500/10 text-brand-400 self-start sm:self-center mt-2 sm:mt-0">
            CORE_ENGINE_v2.6
          </div>
        </div>
      </div>

      {/* Main Studio Grid Workspace */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">

        {/* LEFT COLUMN: PARAMETERS CONSOLE */}
        <div className="lg:col-span-5">
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <CardHeader title="Tham số cấu hình" />
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/5 text-brand-500 border border-brand-500/10">
                <BrainCircuit size={14} />
              </div>
            </div>

            <div className="p-6 space-y-6">

              {/* Custom High-Tech Tab Integration Area */}
              <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/40 dark:border-slate-700/50 relative">
                <Tabs items={GEN_TABS} activeId={tab} onChange={setTab} />
              </div>

              {/* Form Input Control Suite */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Select
                    label="Lớp / Môn học chuyên ngành"
                    options={classes}
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full rounded-xl border-slate-200/80 dark:border-slate-700 shadow-sm focus:border-slate-900 dark:focus:border-brand-500 focus:ring-slate-900 dark:focus:ring-brand-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Input
                    label="Chủ đề bài tập"
                    placeholder="Ví dụ: Triển khai Clean Architecture, Viết REST API với NestJS..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-xl border-slate-200/80 dark:border-slate-700 shadow-sm focus:border-slate-900 dark:focus:border-brand-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Select
                    label="Độ khó thuật toán"
                    options={[
                      { value: 'easy', label: '🟢 Dễ (Cơ bản / Hiểu biết)' },
                      { value: 'medium', label: '🟡 Trung bình (Vận dụng nâng cao)' },
                      { value: 'hard', label: '🔴 Khó (Tối ưu kiến trúc)' },
                    ]}
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-xl border-slate-200/80 dark:border-slate-700 shadow-sm focus:border-slate-900 dark:focus:border-brand-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Textarea
                    label="Yêu cầu bổ sung (Prompt đặc biệt)"
                    placeholder="Ví dụ: Bổ sung câu hỏi bẫy về Memory Leak, yêu cầu sinh viên tối ưu hóa độ phức tạp thời gian O(n)..."
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border-slate-200/80 dark:border-slate-700 shadow-sm focus:border-slate-900 dark:focus:border-brand-500 text-sm resize-none"
                  />
                </div>
              </div>

              {/* Primary High-Action AI Button */}
              <div className="pt-2">
                <Button
                  variant="accent"
                  fullWidth
                  onClick={handleGenerate}
                  disabled={generating}
                  className={`w-full font-bold text-sm h-12 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden ${generating
                    ? 'bg-slate-900 dark:bg-slate-800 text-white cursor-not-allowed border-0'
                    : 'bg-brand-500 text-white hover:bg-brand-600 shadow-[0_10px_30px_rgba(243,112,33,0.2)] hover:shadow-[0_15px_35px_rgba(243,112,33,0.3)] hover:-translate-y-0.5 border-none'
                    }`}
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-brand-400" />
                      <span className="font-mono tracking-wider">COMPUTING_NEURAL_LOGIC...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="animate-pulse" />
                      <span>Kích hoạt AI tạo nội dung</span>
                    </>
                  )}
                </Button>
              </div>

            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: AI PREVIEW PLATFORM */}
        <div className="lg:col-span-7">
          <Card className="border border-slate-900 dark:border-white/[0.1] bg-[#07090e] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.15)] overflow-hidden text-white flex flex-col min-h-[580px]">

            {/* Dark Mode Terminal Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0c1017]/80 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/40 border border-red-500/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40 border border-yellow-500/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/40 border border-green-500/20" />
                </div>
                <div className="h-4 w-px bg-white/[0.08]" />
                <div className="flex items-center gap-2">
                  {getTabIcon(tab)}
                  <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">OUTPUT_STREAM</span>
                </div>
              </div>

              <Badge variant="warning" className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Chờ duyệt dữ liệu
              </Badge>
            </div>

            {/* Error Notification Layer */}
            {error && (
              <div className="m-4 mx-6 text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase">[CRITICAL_ERROR]:</span> {error}
                </div>
              </div>
            )}

            {/* Main Dynamic Content Box */}
            <div className="p-6 flex-1 flex flex-col justify-between min-h-0">

              <div className="flex-1 overflow-auto rounded-xl border border-white/[0.04] bg-[#0c1017]/40 p-5 font-mono text-xs text-slate-300 leading-relaxed relative min-h-[300px]">
                {result ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-white/[0.05] text-[11px] text-slate-400">
                      <Terminal size={12} className="text-slate-500" />
                      <span>Payload Matrix Loaded Object Structure:</span>
                    </div>
                    <pre className="text-emerald-400 selection:bg-emerald-500 selection:text-black">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4 pointer-events-none">
                    {generating ? (
                      <div className="space-y-3 flex flex-col items-center">
                        <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 animate-pulse">
                          <BrainCircuit size={20} className="animate-spin duration-10000" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase animate-pulse">Synthesizing Datasets...</p>
                          <p className="text-[10px] text-slate-500 font-mono">Lõi AI đang bóc tách cấu trúc tài liệu bộ môn</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-w-xs">
                        <FileCode size={32} className="mx-auto text-slate-600 stroke-[1.5]" />
                        <p className="text-xs text-slate-400 font-bold tracking-wide">Bảng điều khiển trống</p>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Thiết lập các tham số ở bảng điều khiển bên trái và bấm nút để khởi tạo kiến trúc đề bài tự động.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons Interface Footer Area */}
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-end">
                <Button
                  variant="primary"
                  onClick={handlePublish}
                  disabled={!result || !classId}
                  className={`h-11 px-6 rounded-xl font-bold text-xs font-mono tracking-wider uppercase transition-all duration-300 flex items-center gap-2 ${(!result || !classId)
                    ? 'bg-white/[0.02] border border-white/[0.06] text-slate-600 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-brand-500 hover:text-white border border-transparent shadow-[0_20px_40px_rgba(255,255,255,0.02)] hover:shadow-[0_0_30px_rgba(243,112,33,0.2)] hover:-translate-y-0.5'
                    }`}
                >
                  <Send size={13} className="stroke-[2.5]" />
                  Phê duyệt & Giao bài
                </Button>
              </div>

            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}