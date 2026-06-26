import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { api } from '@/lib/api'
import { Save, Settings, ShieldAlert, Globe } from 'lucide-react'

export function AdminSettings() {
  const [config, setConfig] = useState({
    appName: 'AITA Platform',
    maintenanceMode: false,
    maxUploadSizeMB: 10,
    supportEmail: 'support@aita.edu.vn'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getSettingsConfig()
      if (data) {
        setConfig((prev) => ({ ...prev, ...data }))
      }
    } catch (e: any) {
      setError(e.message || 'Lỗi tải cấu hình hệ thống')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateSettingsConfig(config)
      alert('Cập nhật cấu hình thành công!')
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu cấu hình')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-8 p-1 sm:p-4 max-w-4xl mx-auto animate-in fade-in">
      <PageHeader 
        title="Cài đặt Hệ thống" 
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Cài đặt chung' }]} 
        actions={
          <Button onClick={handleSave} disabled={saving} className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2 px-6">
            <Save size={16} />
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        }
      />

      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <Settings className="text-slate-500 w-5 h-5 ml-1" />
          <CardHeader title="Thông số Cơ bản" />
        </div>

        <div className="p-6 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Globe size={18} /> Định danh Ứng dụng
              </h4>
              
              <Input 
                label="Tên ứng dụng" 
                value={config.appName}
                onChange={(e) => setConfig({ ...config, appName: e.target.value })}
              />
              
              <Input 
                label="Email Hỗ trợ" 
                type="email"
                value={config.supportEmail}
                onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <ShieldAlert size={18} /> Giới hạn & Bảo mật
              </h4>
              
              <Input 
                label="Kích thước Tệp Tối đa (MB)" 
                type="number"
                min="1"
                max="100"
                value={config.maxUploadSizeMB.toString()}
                onChange={(e) => setConfig({ ...config, maxUploadSizeMB: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={config.maintenanceMode}
                  onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${config.maintenanceMode ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${config.maintenanceMode ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <div>
                <div className="font-bold text-red-600 dark:text-red-400">Chế độ Bảo trì (Maintenance Mode)</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Khi bật, chỉ Admin mới có thể truy cập hệ thống. Sinh viên và giảng viên sẽ thấy trang thông báo bảo trì.</div>
              </div>
            </label>
          </div>
        </div>
      </Card>
    </div>
  )
}
