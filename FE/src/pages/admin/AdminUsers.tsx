import React, { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { api, type UserRow } from '@/lib/api'
import { Plus, Pencil, Trash2, Lock, Unlock, Users, AlertTriangle, Loader2, X, ShieldAlert, Upload, FileSpreadsheet } from 'lucide-react'

const ROLE_TABS = [
  { id: 'all', label: 'Tất cả tài khoản' },
  { id: 'lecturer', label: 'Giảng viên' },
  { id: 'student', label: 'Sinh viên' },
  { id: 'admin', label: 'Quản trị' },
]

export function AdminUsers() {
  const [activeTab, setActiveTab] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'lecturer', externalId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.getUsers(activeTab)
      setUsers(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách người dùng'
      setLoadError(msg)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setForm({ fullName: '', email: '', password: '', role: 'lecturer', externalId: '' })
    setEditingUser(null)
    setShowForm(false)
    setError('')
  }

  const handleOpenCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const handleOpenEdit = (user: UserRow) => {
    setEditingUser(user)
    setForm({ fullName: user.name, email: user.email, password: '', role: user.role, externalId: '' })
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.fullName || form.fullName.trim().length < 2) {
      setError('Họ tên phải có ít nhất 2 ký tự')
      return
    }
    if (!form.email || !form.email.includes('@')) {
      setError('Email định dạng không hợp lệ')
      return
    }
    if (!editingUser && (!form.password || form.password.length < 6)) {
      setError('Mật khẩu bắt buộc và phải từ 6 ký tự trở lên')
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        const updateBody: Record<string, string | undefined> = {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
        }
        if (form.password) updateBody.password = form.password
        await api.updateUser(editingUser.id, updateBody)
      } else {
        await api.createUser({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          externalId: form.externalId || undefined,
        })
      }
      resetForm()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteUser(id)
      setConfirmDelete(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa tài khoản thất bại')
    }
  }

  const handleToggleLock = async (user: UserRow) => {
    const isLocked = ['inactive', 'banned', 'locked'].includes(user.status?.toLowerCase() || '')
    try {
      await api.toggleUserLock(user.id, !isLocked)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thay đổi trạng thái khóa thất bại')
    }
  }

  const handleImport = async () => {
    if (!importText.trim()) {
      setError('Vui lòng dán dữ liệu CSV')
      return
    }
    
    setImporting(true)
    setError('')
    try {
      const lines = importText.trim().split('\n')
      // Skip header if it exists
      const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0
      
      const usersToImport = []
      for (let i = startIndex; i < lines.length; i++) {
        // Split by either tab (Excel) or comma (CSV)
        const parts = lines[i].split(/\t|,/).map(p => p.trim())
        if (parts.length < 2) continue
        
        usersToImport.push({
          fullName: parts[0],
          email: parts[1],
          classCode: parts[2] || undefined,
          semesterCode: parts[3] || undefined,
          subjectCode: parts[4] || undefined,
          role: (parts[5]?.toUpperCase() || 'STUDENT') as any,
          status: (parts[6]?.toUpperCase() || 'ACTIVE') as any
        })
      }
      
      if (usersToImport.length === 0) {
        throw new Error('Không tìm thấy dữ liệu hợp lệ để import')
      }

      await api.importUsers({ users: usersToImport })
      setImportText('')
      setShowImport(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import thất bại')
    } finally {
      setImporting(false)
    }
  }

  const filteredUsers = search
    ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="Quản lý người dùng"
        description="Quản trị phân quyền, thiết lập trạng thái vận hành tài khoản giảng viên, sinh viên và nhân sự quản trị."
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Người dùng' }]}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-2 bg-white"
              onClick={() => { setShowImport(true); setShowForm(false); setError(''); }}
            >
              <Upload size={16} />
              Import CSV
            </Button>
            <Button
              size="sm"
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center gap-2 active:scale-95 transition-transform shadow-sm"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              Thêm người dùng mới
            </Button>
          </div>
        }
      />

      {/* Delete Confirmation */}
      {confirmDelete && (
        <Card className="border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10 p-4 shadow-sm animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-red-600 dark:text-red-400 w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300 text-sm">Xác nhận gỡ bỏ tài khoản vĩnh viễn?</p>
                <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">Mọi thông tin định danh, lịch sử làm bài nộp hoặc tiến trình chấm bài AI gắn liền sẽ bị hủy bỏ hoàn toàn.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:bg-slate-100" onClick={() => setConfirmDelete(null)}>Hủy</Button>
              <Button size="sm" onClick={() => handleDelete(confirmDelete)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-4">Xóa vĩnh viễn</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Import Form */}
      {showImport && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center">
            <CardHeader
              title="Import Danh sách người dùng (CSV)"
              description="Dán nội dung file CSV. Cột bắt buộc: Tên, Email. Cột tùy chọn: Lớp, Kì học, Môn học, Vai trò (STUDENT/LECTURER/ADMIN), Trạng thái (ACTIVE/LOCKED)."
            />
            <button type="button" onClick={() => setShowImport(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div><span className="font-semibold">Lỗi:</span> {error}</div>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
              <span className="text-slate-800 dark:text-slate-200 font-semibold mb-1 block">Định dạng mẫu (có hoặc không có header):</span>
              FullName, Email, ClassCode, SemesterCode, SubjectCode, Role, Status<br/>
              Nguyễn Văn A, a@fpt.edu.vn, 18A01, FALL26, PRO, STUDENT, ACTIVE<br/>
              Trần Thị B, b@fpt.edu.vn, , , , LECTURER, ACTIVE
            </div>
            
            <div>
              <textarea
                className="w-full h-48 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500 font-mono"
                placeholder="Dán dữ liệu CSV vào đây..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="ghost" onClick={() => setShowImport(false)}>Hủy bỏ</Button>
              <Button onClick={handleImport} disabled={importing} className="bg-brand-600 hover:bg-brand-700 text-white">
                {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                {importing ? 'Đang Import...' : 'Tiến hành Import'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Form */}
      {showForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center">
            <CardHeader
              title={editingUser ? `Cập nhật tài khoản: ${editingUser.name}` : 'Đăng ký tài khoản hệ thống mới'}
              description={editingUser ? 'Cập nhật phân quyền hoặc đổi email. Để trống ô mật khẩu nếu muốn giữ nguyên.' : 'Cấp quyền truy cập trực tiếp cho các phân hệ chức năng.'}
            />
            <button type="button" onClick={resetForm} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div><span className="font-semibold">Lỗi xác thực form:</span> {error}</div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Họ và tên thành viên"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Ví dụ: Nguyễn Văn A"
                required
                hint="Độ dài tối thiểu 2 ký tự chữ"
              />
              <Input
                label="Địa chỉ Email định danh"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@fpt.edu.vn"
                required
                disabled={!!editingUser}
                hint={editingUser ? "Không thể thay đổi email sau khi tạo" : ""}
              />
              <Input
                label={editingUser ? 'Mật khẩu (Không thể đổi qua form này)' : 'Mật khẩu khởi tạo'}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••"
                required={!editingUser}
                disabled={!!editingUser}
                hint={!editingUser ? "Độ dài chuỗi an toàn tối thiểu 6 ký tự" : ""}
              />
              <Select
                label="Phân quyền vai trò hệ thống"
                options={[
                  { value: 'lecturer', label: 'Giảng viên (Lecturer)' },
                  { value: 'student', label: 'Sinh viên (Student)' },
                  { value: 'admin', label: 'Quản trị viên (Site Admin)' },
                ]}
                value={form.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, role: e.target.value })}
                required
                disabled={!!editingUser}
              />
              {!editingUser && (
                <Input
                  label="Mã định danh nội bộ (External ID / RollNumber)"
                  value={form.externalId}
                  onChange={(e) => setForm({ ...form, externalId: e.target.value })}
                  placeholder="Ví dụ: GV021 hoặc HE180123"
                />
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <Button type="button" variant="ghost" className="text-slate-500 hover:bg-slate-50" onClick={resetForm}>Hủy bỏ</Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 min-w-[120px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingUser ? 'Cập nhật dữ liệu' : 'Kích hoạt tài khoản'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card className="flex items-center justify-center p-12 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Đang tải danh sách người dùng...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {loadError && (
        <Card className="border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10 p-4 animate-in slide-in-from-top-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 dark:text-red-300">Lỗi tải dữ liệu</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{loadError}</p>
            </div>
            <button onClick={load} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm">
              Thử lại
            </button>
          </div>
        </Card>
      )}

      {/* Users List - Only show when not loading and no error */}
      {!loading && !loadError && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-slate-400 w-5 h-5 ml-2" />
              <Tabs items={ROLE_TABS} activeId={activeTab} onChange={setActiveTab} />
            </div>

            <div className="relative max-w-xs w-full sm:ml-auto">
              <Input
                placeholder="Lọc nhanh họ tên, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <DataTable
              columns={[
                {
                  key: 'id',
                  header: 'Mã số hệ thống',
                  render: (r) => <span className="font-mono text-[11px] text-slate-400 block max-w-[80px] truncate" title={(r as UserRow).id}>{(r as UserRow).id}</span>,
                  className: 'w-24 pl-4'
                },
                {
                  key: 'name',
                  header: 'Họ và tên',
                  render: (r) => <span className="font-semibold text-slate-800 dark:text-slate-200">{(r as UserRow).name}</span>
                },
                {
                  key: 'email',
                  header: 'Địa chỉ Email',
                  render: (r) => <span className="text-slate-600 dark:text-slate-400 font-medium">{(r as UserRow).email}</span>
                },
                {
                  key: 'role',
                  header: 'Phân quyền',
                  render: (r) => {
                    const u = r as UserRow
                    const variant = u.role === 'admin' ? 'info' : u.role === 'lecturer' ? 'warning' : 'success'
                    const label = u.role === 'admin' ? 'Quản trị' : u.role === 'lecturer' ? 'Giảng viên' : 'Sinh viên'
                    return <Badge variant={variant} className="px-2.5 py-0.5 rounded-full font-medium text-[11px]">{label}</Badge>
                  },
                  className: 'w-32'
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (r) => {
                    const u = r as UserRow
                    const isLocked = ['inactive', 'banned', 'locked'].includes(u.status?.toLowerCase() || '')
                    return (
                      <Badge variant={isLocked ? 'danger' : 'success'} className="shadow-none px-2 py-0.5 text-[11px]">
                        {isLocked ? 'Locked' : 'Active'}
                      </Badge>
                    )
                  },
                  className: 'w-32'
                },
                {
                  key: 'actions',
                  header: 'Thao tác bảo mật',
                  render: (r) => {
                    const u = r as UserRow
                    const isLocked = ['inactive', 'banned', 'locked'].includes(u.status?.toLowerCase() || '')
                    return (
                      <div className="flex gap-1 justify-end pr-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition"
                          title="Sửa thông tin tài khoản"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLock(u)}
                          className={`rounded-lg p-1.5 transition ${isLocked ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30'}`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa truy cập'}
                        >
                          {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(u.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
                          title="Xóa tài khoản vĩnh viễn"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  },
                  className: 'w-32 text-right'
                },
              ]}
              data={filteredUsers}
              keyExtractor={(r) => r.id}
            />
          </div>
        </Card>
      )}
    </div>
  )
}