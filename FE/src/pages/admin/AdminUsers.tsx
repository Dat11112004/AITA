import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import { api, type UserRow } from '@/lib/api'
import { Plus } from 'lucide-react'

const ROLE_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'lecturer', label: 'Giảng viên' },
  { id: 'student', label: 'Sinh viên' },
  { id: 'admin', label: 'Quản trị' },
]

export function AdminUsers() {
  const [activeTab, setActiveTab] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'lecturer', externalId: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    api.getUsers(activeTab).then(setUsers).catch(console.error)
  }, [activeTab])

  useEffect(() => {
    load()
  }, [load])

  const [error, setError] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.fullName || form.fullName.trim().length < 2) {
      setError('Họ tên phải có ít nhất 2 ký tự')
      return
    }
    if (!form.email || !form.email.includes('@')) {
      setError('Email không hợp lệ')
      return
    }
    if (!form.password || form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setSaving(true)
    try {
      await api.createUser({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
        externalId: form.externalId || undefined,
      })
      setShowForm(false)
      setForm({ fullName: '', email: '', password: '', role: 'lecturer', externalId: '' })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng ký thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Quản lý người dùng"
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Người dùng' }]}
        actions={
          <Button size="sm" onClick={() => { setShowForm(!showForm); setError(''); }}>
            <Plus size={16} />
            Thêm người dùng
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader title="Thêm tài khoản" description="Tạo tài khoản cho Giảng viên hoặc Quản trị viên. Sinh viên tự đăng ký qua trang đăng nhập." />
          
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input 
                label="Họ tên" 
                value={form.fullName} 
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} 
                placeholder="Nguyễn Văn Giảng"
                required
                hint="Tối thiểu 2 ký tự"
              />
              <Input 
                label="Email" 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                placeholder="lecturer@fpt.edu.vn"
                required
              />
              <Input 
                label="Mật khẩu" 
                type="password" 
                value={form.password} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                placeholder="••••••"
                required
                hint="Tối thiểu 6 ký tự"
              />
              <Select
                label="Vai trò"
                options={[
                  { value: 'lecturer', label: 'Giảng viên' },
                  { value: 'student', label: 'Sinh viên' },
                  { value: 'admin', label: 'Quản trị' },
                ]}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                required
              />
              <Input 
                label="Mã / ID" 
                value={form.externalId} 
                onChange={(e) => setForm({ ...form, externalId: e.target.value })} 
                placeholder="VD: GV002 hoặc HE170002"
              />
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setError(''); }}>Hủy</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <Tabs items={ROLE_TABS} activeId={activeTab} onChange={setActiveTab} />
        <div className="mt-4">
          <DataTable
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Họ tên' },
              { key: 'email', header: 'Email' },
              { key: 'role', header: 'Vai trò' },
              { key: 'status', header: 'Trạng thái' },
            ]}
            data={users}
            keyExtractor={(r) => r.id}
          />
        </div>
      </Card>
    </div>
  )
}
