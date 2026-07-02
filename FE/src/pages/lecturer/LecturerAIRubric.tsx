import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { Sparkles, Save, ArrowLeft, Loader2, FileCheck2 } from 'lucide-react'

export function LecturerAIRubric() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ topic: '', difficulty: 'medium', totalScore: 10 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleGenerate = async () => {
    if (!form.topic.trim()) return
    setIsGenerating(true)
    setGeneratedContent(null)
    try {
      const res = await api.generateRubricAI(form)
      setGeneratedContent(res)
    } catch (error: any) {
      alert(error.message || 'Lỗi khi tạo rubric tự động')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedContent) return
    setIsSaving(true)
    try {
      alert('Đã lưu Rubric thành công!')
      navigate('/lecturer/assignments')
    } catch (error: any) {
      alert(error.message || 'Lỗi khi lưu rubric')
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
          title="Tạo Rubric chấm điểm bằng AI" 
          breadcrumbs={[{ label: 'Bài tập', path: '/lecturer/assignments' }, { label: 'AI Rubric Generator' }]} 
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center gap-2 mb-4 text-emerald-700 dark:text-emerald-400">
              <FileCheck2 size={20} />
              <h3 className="font-bold">Tham số sinh Rubric</h3>
            </div>
            
            <div className="space-y-4">
              <Input 
                label="Chủ đề / Yêu cầu bài tập" 
                placeholder="VD: Viết API Login với JWT..." 
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
              
              <Input 
                label="Tổng điểm tối đa"
                type="number"
                value={form.totalScore.toString()}
                onChange={(e) => setForm({ ...form, totalScore: Number(e.target.value) || 10 })}
              />

              <Button 
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-200 dark:shadow-none transition-all duration-200"
                onClick={handleGenerate}
                disabled={isGenerating || !form.topic.trim()}
              >
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin mr-2" /> Đang xử lý...</>
                ) : (
                  <><Sparkles size={18} className="mr-2" /> Sinh Rubric ngay</>
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
                  <p>Nhập thông số và nhấn "Sinh Rubric ngay" để AI bắt đầu tạo.</p>
                </div>
              )}
              
              {isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-emerald-500">
                  <Loader2 size={48} className="animate-spin mb-4" />
                  <p className="font-medium animate-pulse">AI đang phân tích và tạo tiêu chí...</p>
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
