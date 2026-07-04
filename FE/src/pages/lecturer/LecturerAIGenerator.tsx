import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { Sparkles, Save, ArrowLeft, Loader2, Bot, Paperclip } from 'lucide-react'

export function LecturerAIGenerator() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ topic: '', difficulty: 'medium', type: 'quiz' })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  const handleGenerate = async () => {
    if (!form.topic.trim()) return
    setIsGenerating(true)
    setGeneratedContent(null)
    try {
      const res = await api.generateExerciseAI(form)
      setGeneratedContent(res)
    } catch (error: any) {
      alert(error.message || 'Lỗi khi tạo bài tập tự động')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedContent) return
    setIsSaving(true)
    try {
      const saved = await api.saveAIAssignment({
        title: `Bài tập AI: ${form.topic}`,
        type: form.type,
        difficulty: form.difficulty,
        content: generatedContent,
      })
      if (attachmentFile && saved?.id) {
        await api.uploadAssignmentAttachment(saved.id, attachmentFile)
      }
      alert(attachmentFile ? 'Đã lưu bài tập kèm tệp đính kèm thành công!' : 'Đã lưu bài tập thành công!')
      navigate('/lecturer/assignments')
    } catch (error: any) {
      alert(error.message || 'Lỗi khi lưu bài tập')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/lecturer/assignments')} className="shrink-0 p-2">
          <ArrowLeft size={16} />
        </Button>
        <PageHeader 
          title="Tạo bài tập bằng AI" 
          breadcrumbs={[{ label: 'Bài tập', path: '/lecturer/assignments' }, { label: 'AI Generator' }]} 
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="p-5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center gap-2 mb-4 text-indigo-700 dark:text-indigo-400">
              <Bot size={20} />
              <h3 className="font-bold">Tham số sinh bài tập</h3>
            </div>
            
            <div className="space-y-4">
              <Input 
                label="Chủ đề / Yêu cầu" 
                placeholder="VD: Cây nhị phân tìm kiếm..." 
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
              
              <Select 
                label="Mức độ khó"
                options={[
                  { value: 'easy', label: 'Dễ (Cơ bản)' },
                  { value: 'medium', label: 'Trung bình (Vận dụng)' },
                  { value: 'hard', label: 'Khó (Nâng cao)' },
                ]}
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              />
              
              <Select 
                label="Loại bài tập"
                options={[
                  { value: 'quiz', label: 'Trắc nghiệm (Quiz)' },
                  { value: 'coding', label: 'Lập trình (Coding)' },
                  { value: 'essay', label: 'Tự luận (Essay)' },
                ]}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Tệp đề bài đính kèm (PDF/Word, tùy chọn)
                </label>
                <label className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors text-sm text-slate-600 dark:text-slate-400">
                  <Paperclip size={16} className="shrink-0" />
                  <span className="truncate">{attachmentFile ? attachmentFile.name : 'Chọn tệp .pdf, .doc, .docx'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <Button
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-200 dark:shadow-none transition-all duration-200"
                onClick={handleGenerate}
                disabled={isGenerating || !form.topic.trim()}
              >
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin mr-2" /> Đang xử lý...</>
                ) : (
                  <><Sparkles size={18} className="mr-2" /> Sinh bài tập ngay</>
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full min-h-[400px] border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <CardHeader title="Kết quả từ AI" />
              {generatedContent && (
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isSaving ? 'Đang lưu...' : <><Save size={16} className="mr-2"/> Lưu vào hệ thống</>}
                </Button>
              )}
            </div>
            
            <div className="p-6 flex-1 bg-white dark:bg-slate-950 overflow-y-auto">
              {!generatedContent && !isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                  <Sparkles size={48} className="mb-4 opacity-20" />
                  <p>Nhập thông số và nhấn "Sinh bài tập ngay" để AI bắt đầu tạo.</p>
                </div>
              )}
              
              {isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-indigo-500">
                  <Loader2 size={48} className="animate-spin mb-4" />
                  <p className="font-medium animate-pulse">AI đang phân tích và soạn thảo...</p>
                </div>
              )}

              {generatedContent && !isGenerating && (
                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-mono text-sm whitespace-pre-wrap">
                  {typeof generatedContent === 'object' ? JSON.stringify(generatedContent, null, 2) : generatedContent.toString()}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
