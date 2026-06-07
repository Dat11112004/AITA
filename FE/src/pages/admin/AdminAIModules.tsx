import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AI_MODULES } from '@/constants/content'
import { api } from '@/lib/api'
import { Brain, Sparkles, Settings2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

export function AdminAIModules() {
  const [config, setConfig] = useState({ aiEndpoint: '', aiModel: 'stub', aiTimeout: '60', aiStubMode: 'false' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setError('')
    setIsLoading(true)
    api
      .getAIConfig()
      .then((data) => {
        setConfig(data)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Lỗi tải cấu hình AI')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const save = async () => {
    setError('')
    setSuccess('')
    setIsSaving(true)
    try {
      await api.updateAIConfig(config)
      setSuccess('Đã cập nhật cấu hình AI Engine thành công!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu cấu hình AI')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header Section */}
      <PageHeader
        title="Module AI"
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Module AI' }]}
      />

      {/* Grid danh sách Module AI */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-brand-500 w-5 h-5 animate-pulse" />
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Tính năng AI đang khả dụng</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AI_MODULES.map((mod) => (
            <Card key={mod.id} className="p-6 transition-all duration-300 border border-slate-100 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white dark:bg-slate-900 group">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Brain size={24} className="transition-transform group-hover:scale-110 duration-300" />
                </div>
                <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/10">
                  Ready
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 transition-colors">
                {mod.name}
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {mod.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Form Cấu Hình Chung */}
      <Card className="mt-8 overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        {/* Giữ nguyên cấu trúc CardHeader gốc của bạn và bọc ngoài bằng class định hình giao diện */}
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <Settings2 className="text-slate-500 w-5 h-5 ml-2" />
          <CardHeader title="Cấu hình chung AI Engine" />
        </div>

        <div className="p-6 relative">
          {/* Trạng thái Loading hệ thống */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-[2px] z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                Đang tải cấu hình hệ thống...
              </div>
            </div>
          )}

          {/* Khu vực thông báo lỗi / thành công */}
          {error && (
            <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">⚠️ Thao tác thất bại:</span> {error}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-start gap-3 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl p-4 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">✓ Thành công:</span> {success}
              </div>
            </div>
          )}

          {/* Form Controls nhập liệu */}
          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label="Endpoint AI"
              placeholder="https://api.openai.com/v1"
              value={config.aiEndpoint}
              onChange={(e) => setConfig({ ...config, aiEndpoint: e.target.value })}
            />
            <Input
              label="Model"
              placeholder="gpt-4o, claude-3-5-sonnet..."
              value={config.aiModel}
              onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
            />
            <Input
              label="Timeout (giây)"
              type="number"
              value={config.aiTimeout}
              onChange={(e) => setConfig({ ...config, aiTimeout: e.target.value })}
            />

            {/* Custom dropdown cho Stub Mode gọn gàng và tránh gõ lỗi chữ */}
            <div className="flex flex-col justify-end">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Stub mode</label>
              <select
                value={config.aiStubMode}
                onChange={(e) => setConfig({ ...config, aiStubMode: e.target.value })}
                className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              >
                <option value="false">False - Chạy trực tiếp API thực</option>
                <option value="true">True - Giả lập kiểm thử (Stub)</option>
              </select>
            </div>
          </div>

          {/* Nút lưu đồng bộ UI/UX */}
          <div className="mt-8 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button
              className="mt-4 px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              onClick={save}
              disabled={isSaving || isLoading}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang lưu cấu hình...
                </>
              ) : (
                'Lưu cấu hình'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}