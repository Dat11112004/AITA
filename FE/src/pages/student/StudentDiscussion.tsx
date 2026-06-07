import React, { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { api, type Option, type DiscussionThread } from '@/lib/api'
import { MessageSquare, Send, User, ChevronRight, CheckCircle } from 'lucide-react'

export function StudentDiscussion() {
  const [classes, setClasses] = useState<Option[]>([])
  const [classId, setClassId] = useState('')
  const [threads, setThreads] = useState<DiscussionThread[]>([])
  const [selectedThread, setSelectedThread] = useState<DiscussionThread | null>(null)
  const [newThread, setNewThread] = useState({ title: '', content: '' })
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getClassOptions().then(setClasses).catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getDiscussionThreads(classId || undefined)
      .then(setThreads)
      .finally(() => setLoading(false))
  }, [classId])

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classId || !newThread.title || !newThread.content) return
    try {
      await api.createDiscussionThread({ classId, ...newThread })
      setNewThread({ title: '', content: '' })
      api.getDiscussionThreads(classId).then(setThreads)
    } catch (e) {
      console.error(e)
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedThread || !reply) return
    try {
      await api.replyToThread(selectedThread.id, { content: reply })
      setReply('')
      // Refresh thread data
      const updated = await api.getDiscussionThreads(classId)
      setThreads(updated)
      setSelectedThread(updated.find(t => t.id === selectedThread.id) || null)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader
        title="Diễn đàn thảo luận"
        description="Kết nối với giảng viên và bạn học để trao đổi kiến thức, giải đáp thắc mắc chuyên môn (FE-S-06)."
        breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Thảo luận' }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader title="Lọc theo lớp" />
            <div className="p-4 sm:p-6 pt-0">
              <Select 
                label="Chọn lớp học" 
                options={[{ value: '', label: 'Tất cả lớp' }, ...classes]} 
                value={classId} 
                onChange={(e) => setClassId(e.target.value)} 
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Đặt câu hỏi mới" />
            <div className="p-4 sm:p-6 pt-0">
              <form onSubmit={handleCreateThread} className="space-y-4">
                <Input 
                  label="Tiêu đề" 
                  placeholder="VD: Thắc mắc về Clean Architecture" 
                  value={newThread.title}
                  onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                  disabled={!classId}
                />
                <Textarea 
                  label="Nội dung" 
                  placeholder="Mô tả chi tiết câu hỏi của bạn..." 
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  rows={4}
                  disabled={!classId}
                />
                <Button disabled={!classId || !newThread.title}>
                  <Send size={16} className="mr-2" /> Đăng câu hỏi
                </Button>
                {!classId && <p className="text-[10px] text-amber-600 dark:text-amber-500">Vui lòng chọn lớp học để đăng câu hỏi.</p>}
              </form>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedThread ? (
            <div className="space-y-4 animate-fade-in slide-in-from-right-4 duration-300">
              <Button variant="ghost" size="sm" onClick={() => setSelectedThread(null)}>
                <ChevronRight size={16} className="rotate-180 mr-1" /> Quay lại danh sách
              </Button>
              
              <Card>
                <div className="p-4 sm:p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedThread.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="info" className="text-[10px]">{selectedThread.className}</Badge>
                        {selectedThread.resolved && <Badge variant="success" className="text-[10px]">Đã giải quyết</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{selectedThread.author}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(selectedThread.createdAt).toLocaleString('vi')}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                    {selectedThread.content}
                  </div>

                  <div className="mt-8 space-y-6">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <MessageSquare size={16} /> Phản hồi ({selectedThread.replies.length})
                    </h4>
                    <div className="space-y-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2 pl-4">
                      {selectedThread.replies.map((r) => (
                        <div key={r.id} className="relative">
                          <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs font-bold ${r.authorRole === 'lecturer' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {r.author} {r.authorRole === 'lecturer' && '(Giảng viên)'}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(r.createdAt).toLocaleString('vi')}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">{r.content}</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleReply} className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <Textarea 
                        placeholder="Viết phản hồi của bạn..." 
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={3}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button size="sm">Gửi phản hồi</Button>
                      </div>
                    </form>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader title="Các thảo luận gần đây" />
              <div className="p-4 sm:p-6 pt-0">
                {loading ? (
                  <div className="py-20 text-center text-slate-400 dark:text-slate-500">Đang tải thảo luận...</div>
                ) : threads.length === 0 ? (
                  <div className="py-20 text-center">
                    <MessageSquare size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">Chưa có thảo luận nào. Hãy là người đầu tiên đặt câu hỏi!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {threads.map((t) => (
                      <div 
                        key={t.id} 
                        className="py-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition px-2 rounded-lg"
                        onClick={() => setSelectedThread(t)}
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">{t.title}</h4>
                            {t.resolved && <CheckCircle size={14} className="text-emerald-500" />}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1"><User size={10} /> {t.author}</span>
                            <span>{t.className}</span>
                            <span>•</span>
                            <span>{new Date(t.createdAt).toLocaleDateString('vi')}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="neutral" className="text-[10px]">{t.replies.length} phản hồi</Badge>
                          <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
