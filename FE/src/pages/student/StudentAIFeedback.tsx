import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { api } from '@/lib/api'
import { useAuth } from '@/store/AuthContext'
import { Bot, Sparkles, Target, TrendingUp, BookOpen, AlertCircle } from 'lucide-react'

export function StudentAIFeedback() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedbackData, setFeedbackData] = useState<any>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAIFeedback(user.id)
      setFeedbackData(data)
    } catch (e: any) {
      setError(e.message || 'Lỗi tải đánh giá từ AI')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen max-w-6xl mx-auto">
      <PageHeader 
        title="AI Cố vấn Học tập" 
        breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'AI Feedback' }]} 
        actions={<Button onClick={load} variant="outline" size="sm">Cập nhật dữ liệu</Button>}
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : feedbackData ? (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl dark:bg-indigo-900/40 dark:text-indigo-400">
                  <Bot size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-300">Tổng quan năng lực</h3>
                  <p className="mt-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                    {feedbackData.overview || 'Dựa trên kết quả các bài nộp gần đây, bạn đang duy trì phong độ tốt ở các môn lý thuyết nhưng cần cải thiện thêm kỹ năng thực hành.'}
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid sm:grid-cols-2 gap-6">
              <Card className="p-5 border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold mb-3">
                  <TrendingUp size={20} /> Điểm mạnh
                </div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(feedbackData.strengths || ['Tư duy logic tốt', 'Nộp bài đúng hạn', 'Mã nguồn trình bày rõ ràng']).map((s: string, i: number) => (
                    <li key={i} className="flex gap-2"><Sparkles size={16} className="text-emerald-500 shrink-0 mt-0.5" /> {s}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 border-amber-100 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold mb-3">
                  <AlertCircle size={20} /> Cần cải thiện
                </div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(feedbackData.weaknesses || ['Kỹ năng tối ưu hóa thuật toán', 'Viết Unit Test chưa đầy đủ']).map((w: string, i: number) => (
                    <li key={i} className="flex gap-2"><Target size={16} className="text-amber-500 shrink-0 mt-0.5" /> {w}</li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card className="p-0 overflow-hidden border-slate-200 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <BookOpen className="text-brand-500 w-5 h-5" />
                <CardHeader title="Lộ trình học tập đề xuất" />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {(feedbackData.recommendations || [
                    { title: 'Ôn tập Cấu trúc dữ liệu', desc: 'Làm thêm 5 bài tập về Cây Nhị Phân trên hệ thống.' },
                    { title: 'Tối ưu hiệu năng', desc: 'Đọc tài liệu về Time Complexity (O(n)).' }
                  ]).map((rec: any, i: number) => (
                    <div key={i} className="flex gap-4 p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400 font-bold text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{rec.title}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{rec.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5 bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-lg border-0">
              <div className="text-center">
                <h4 className="font-bold text-brand-100 mb-2">Chỉ số Readiness (AI)</h4>
                <div className="text-6xl font-black mb-2">
                  {feedbackData.readinessScore || 85}<span className="text-2xl text-brand-200">/100</span>
                </div>
                <p className="text-sm text-brand-100/80">Khả năng đạt kết quả tốt trong kỳ thi sắp tới.</p>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-500">
          <Bot size={48} className="mx-auto mb-4 opacity-20" />
          <p>AI đang phân tích dữ liệu học tập của bạn. Vui lòng quay lại sau.</p>
        </Card>
      )}
    </div>
  )
}
