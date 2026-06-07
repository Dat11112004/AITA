import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { api } from '@/lib/api'
import { Save, Settings, ShieldCheck, BellRing, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

const SETTINGS_TABS = [
  { id: 'general', label: 'Chung' },
  { id: 'security', label: 'Bảo mật' },
  { id: 'notifications', label: 'Thông báo' },
]

export function AdminSettings() {
  const [tab, setTab] = useState('general')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setError('')
    api
      .getSettings()
      .then(setSettings)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Lỗi tải cài đặt')
      })
  }, [])

  const save = async () => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.updateSettings(settings)
      setSuccess('Đã cập nhật cấu hình hệ thống thành công!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu cấu hình')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="Cài đặt hệ thống"
        description="Cấu hình thông số vận hành, thiết lập chính sách bảo mật và luồng truyền tin."
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Cài đặt' }]}
      />

      {/* Phân hệ Tabs điều hướng */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-1">
        <Tabs items={SETTINGS_TABS} activeId={tab} onChange={setTab} />
      </div>

      {/* Khối quản lý cấu hình */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-6 mt-6">

        {/* Khối hiển thị thông báo lỗi / thành công */}
        {error && (
          <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div><span className="font-semibold">Lỗi cấu hình:</span> {error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div><span className="font-semibold">Thành công:</span> {success}</div>
          </div>
        )}

        {/* Nội dung tương ứng từng phân hệ Tab */}
        <div className="min-h-[220px]">
          {tab === 'general' && (
            <div className="grid gap-5 max-w-2xl animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-sm mb-1">
                <Settings size={16} className="text-brand-500" />
                <span>Thông tin ứng dụng tổng quan</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Tên hệ thống (AppName)" placeholder="Ví dụ: SORMS Portal" value={settings.appName ?? ''} onChange={(e) => setSettings({ ...settings, appName: e.target.value })} />
                <Input label="Tổ chức / Đơn vị chủ quản" placeholder="Ví dụ: FPT University" value={settings.organization ?? ''} onChange={(e) => setSettings({ ...settings, organization: e.target.value })} />
              </div>
              <Textarea label="Mô tả hệ thống" placeholder="Mô tả vắn tắt mục đích sử dụng hoặc ghi chú bản quyền..." value={settings.description ?? ''} onChange={(e) => setSettings({ ...settings, description: e.target.value })} rows={4} />
            </div>
          )}

          {tab === 'security' && (
            <div className="grid gap-5 max-w-xl animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-sm mb-1">
                <ShieldCheck size={16} className="text-amber-500" />
                <span>Chính sách kiểm soát phiên đăng nhập</span>
              </div>
              <Input
                label="Thời hạn phiên làm việc (Session timeout - phút)"
                type="number"
                min="5"
                placeholder="60"
                value={settings.sessionTimeout ?? '60'}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
              />
              <p className="text-xs text-slate-400 leading-relaxed -mt-2">
                * Sau khoảng thời gian không thao tác này, tài khoản của sinh viên/giảng viên sẽ tự động đăng xuất để bảo mật dữ liệu.
              </p>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 max-w-2xl animate-in fade-in-50 duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-brand-500 rounded-lg shadow-sm">
                  <BellRing size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Kênh cấu hình luồng thông báo</h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Hệ thống lưu cấu hình nhận thông báo qua Email SMTP và In-app alert trực tiếp vào trường dữ liệu `settings`. Bạn có thể mở rộng thêm các key kết nối webhook tại đây trong giai đoạn tiếp theo.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chân form chứa nút Lưu thay đổi */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
            {saving ? 'Đang lưu cấu hình...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </Card>
    </div>
  )
}