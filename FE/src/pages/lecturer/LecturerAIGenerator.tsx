import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { api, type ClassRow } from '@/lib/api'
import { Sparkles, Save, ArrowLeft, Loader2, Bot } from 'lucide-react'

export function LecturerAIGenerator() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ topic: '', difficulty: 'medium', type: 'quiz' })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [selectedClassId, setSelectedClassId] = useState('all')
  const [examType, setExamType] = useState('Assignment')
  const [sendNotification, setSendNotification] = useState(true)
  
  useEffect(() => {
    api.getClasses(1, 1000).then(res => {
      setClasses(res || [])
      if (res?.length > 0) setSelectedClassId(res[0].id)
    }).catch(console.error)
  }, [])

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
      await api.saveAIAssignment({
        classId: selectedClassId === 'all' ? undefined : selectedClassId,
        title: `AI ${examType === 'Exam' ? 'Đề thi' : 'Bài tập'}: ${form.topic}`,
        type: form.type, // Sub-type: quiz, coding, essay
        difficulty: form.difficulty,
        content: generatedContent,
        examType: examType, 
      })

      if (sendNotification) {
        await api.broadcastNotification({
          title: `Đã tự động tạo: AI ${examType === 'Exam' ? 'Đề thi' : 'Bài tập'} mới`,
          message: `Giảng viên vừa publish 1 AI ${examType === 'Exam' ? 'Đề thi' : 'Bài tập'} lên hệ thống. Vui lòng kiểm tra mục Bài tập.`,
          targetRole: 'STUDENT'
        }).catch(() => {})
        console.log(`[Notification] Đã gửi thông báo cho lớp ${selectedClassId === 'all' ? 'Tất cả' : selectedClassId}`)
      }

      alert('Đã lưu thành công!')
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

              <div className="grid grid-cols-2 gap-2">
                <Select 
                  label="Mục đích"
                  options={[
                    { value: 'Assignment', label: 'Bài tập (Chấm ngầm)' },
                    { value: 'Exam', label: 'Đề thi (Chấm thủ công)' },
                  ]}
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                />
                
                <Select 
                  label="Loại hình cụ thể"
                  options={[
                    { value: 'quiz', label: 'Trắc nghiệm' },
                    { value: 'coding', label: 'Lập trình' },
                    { value: 'essay', label: 'Tự luận' },
                  ]}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                />
              </div>

              <Select 
                label="Áp dụng cho Lớp"
                options={[{value: 'all', label: 'Tất cả các lớp'}, ...classes.map(c => ({ value: c.id, label: c.code }))]}
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              />

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="notifyStudents" 
                  checked={sendNotification} 
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="notifyStudents" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Gửi thông báo (Email/App) cho sinh viên
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
