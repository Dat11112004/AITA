import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { api } from '@/lib/api'

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
    try {
      await api.updateSettings(settings)
      setSuccess('Đã lưu cài đặt')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu cài đặt')
    }
  }

  return (
    <div>
      <PageHeader title="Cài đặt hệ thống" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Cài đặt' }]} />
      <Tabs items={SETTINGS_TABS} activeId={tab} onChange={setTab} />
      <Card className="mt-6">
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl p-3">
            ✓ {success}
          </div>
        )}
        {tab === 'general' && (
          <div className="grid gap-4 max-w-xl">
            <Input label="Tên hệ thống" value={settings.appName ?? ''} onChange={(e) => setSettings({ ...settings, appName: e.target.value })} />
            <Input label="Tổ chức" value={settings.organization ?? ''} onChange={(e) => setSettings({ ...settings, organization: e.target.value })} />
            <Textarea label="Mô tả" value={settings.description ?? ''} onChange={(e) => setSettings({ ...settings, description: e.target.value })} rows={3} />
          </div>
        )}
        {tab === 'security' && (
          <Input label="Session timeout (phút)" value={settings.sessionTimeout ?? '60'} onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })} />
        )}
        {tab === 'notifications' && (
          <p className="text-sm text-slate-600">Cấu hình thông báo email / in-app (lưu vào settings).</p>
        )}
        <Button className="mt-6" onClick={save}>Lưu thay đổi</Button>
      </Card>
    </div>
  )
}
