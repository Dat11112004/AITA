import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { api, type UserRow } from '@/lib/api'
import { Plus, Pencil, Trash2, Users, AlertTriangle, Loader2, X, ShieldAlert, Upload, FileSpreadsheet } from 'lucide-react'

const ROLE_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'lecturer', label: 'Giảng viên' },
  { id: 'student', label: 'Sinh viên' },
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showBulkEditForm, setShowBulkEditForm] = useState(false)
  const [bulkEditRole, setBulkEditRole] = useState('student')
  const [bulkEditing, setBulkEditing] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.getUsers(activeTab, 1, 100, search)
      setUsers(data || [])
      setSelectedIds(new Set())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách người dùng'
      setLoadError(msg)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, search])

  useEffect(() => {
    const timer = setTimeout(() => {
      load()
    }, 400)
    return () => clearTimeout(timer)
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

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    if (isSelectionMode) {
      setSelectedIds(new Set())
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    setError('')
    try {
      await Promise.all(Array.from(selectedIds).map(id => api.deleteUser(id)))
      setConfirmBulkDelete(false)
      setSelectedIds(new Set())
      setIsSelectionMode(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa hàng loạt thất bại')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.size === 0) return
    setBulkEditing(true)
    setError('')
    try {
      await Promise.all(Array.from(selectedIds).map(id => api.updateUser(id, { role: bulkEditRole })))
      setShowBulkEditForm(false)
      setSelectedIds(new Set())
      setIsSelectionMode(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật hàng loạt thất bại')
    } finally {
      setBulkEditing(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setError('Vui lòng chọn file Excel')
      return
    }
    
    setImporting(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      await api.importStudentsExcel(formData)
      setImportFile(null)
      setShowImport(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import thất bại')
    } finally {
      setImporting(false)
    }
  }

  const filteredUsers = users

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="Quản lý người dùng"
        description="Quản trị phân quyền, thiết lập trạng thái vận hành tài khoản giảng viên, sinh viên và nhân sự quản trị."
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Người dùng' }]}
        actions={
          <div className="flex gap-2 items-center flex-wrap">
            {isSelectionMode ? (
              <>
                <Button variant="ghost" size="sm" onClick={toggleSelectionMode} className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                  Hủy chọn
                </Button>
                {selectedIds.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700 transition"
                      onClick={() => {
                        if (selectedIds.size === 1) {
                          const id = Array.from(selectedIds)[0]
                          const u = users.find(u => u.id === id)
                          if (u) {
                            handleOpenEdit(u)
                            toggleSelectionMode()
                          }
                        } else {
                          setShowBulkEditForm(true)
                        }
                      }}
                    >
                      <Pencil size={16} />
                      Sửa {selectedIds.size} đã chọn
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700 transition"
                      onClick={() => setConfirmBulkDelete(true)}
                    >
                      <Trash2 size={16} />
                      Xóa {selectedIds.size} đã chọn
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  onClick={toggleSelectionMode}
                >
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 rounded-sm"></div>
                  Chọn
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 bg-white"
                  onClick={() => { setShowImport(true); setShowForm(false); setError(''); }}
                >
                  <Upload size={16} />
                  Import Sinh viên (Excel)
                </Button>
                <Button
                  size="sm"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center gap-2 active:scale-95 transition-transform shadow-sm"
                  onClick={handleOpenCreate}
                >
                  <Plus size={16} />
                  Thêm người dùng mới
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Bulk Edit Form Modal */}
      {showBulkEditForm && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <form onSubmit={handleBulkEdit}>
              <div className="p-6">
                <div className="text-center space-y-2 mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Thay đổi vai trò hàng loạt</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Chọn vai trò mới cho <span className="font-bold text-blue-600">{selectedIds.size}</span> tài khoản đã chọn.
                  </p>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Vai trò mới</label>
                    <Select 
                      value={bulkEditRole} 
                      onChange={(e) => setBulkEditRole(e.target.value)}
                      options={[
                        { value: 'student', label: 'Sinh viên' },
                        { value: 'lecturer', label: 'Giảng viên' },
                        { value: 'admin', label: 'Quản trị viên' }
                      ]}
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowBulkEditForm(false)} disabled={bulkEditing}>
                    Hủy bỏ
                  </Button>
                  <Button type="submit" disabled={bulkEditing} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center justify-center">
                    {bulkEditing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {bulkEditing ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>,
        document.body
      )}

      {/* Bulk Delete Confirmation Modal */}
      {confirmBulkDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-red-200 dark:border-red-900/40 shadow-xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                <ShieldAlert className="text-red-600 dark:text-red-400 w-6 h-6 animate-pulse" />
              </div>
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Xác nhận xóa hàng loạt?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Bạn đang chuẩn bị xóa vĩnh viễn <span className="font-bold text-red-600">{selectedIds.size}</span> tài khoản. Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmBulkDelete(false)} disabled={bulkDeleting}>
                  Hủy bỏ
                </Button>
                <Button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium flex items-center justify-center">
                  {bulkDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {bulkDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-red-200 dark:border-red-900/40 shadow-xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                <ShieldAlert className="text-red-600 dark:text-red-400 w-6 h-6 animate-pulse" />
              </div>
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Bạn có chắc chắn muốn xóa tài khoản này?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hành động này sẽ xóa vĩnh viễn tài khoản khỏi cơ sở dữ liệu. Mọi thông tin định danh, lịch sử làm bài nộp sẽ bị hủy bỏ hoàn toàn và không thể khôi phục.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
                  Hủy bỏ
                </Button>
                <Button onClick={() => handleDelete(confirmDelete)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium">
                  Xóa vĩnh viễn
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* Import Form */}
      {showImport && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center">
            <CardHeader
              title="Import Danh sách Sinh viên (Excel)"
              description="Tải lên file Excel theo chuẩn template quy định."
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
              <span className="text-slate-800 dark:text-slate-200 font-semibold mb-1 block">Template Excel gồm các cột:</span>
              MSSV | Họ và tên | Email | Số điện thoại | Kỳ học | Lớp học | Môn khác kỳ hiện tại (nợ/học vượt) | Môn đã học vượt thành công<br/>
              QE180097 | Nguyễn Văn A | qe180097@fpt.edu.vn | 0912345678 | 8 | SE18C01 | DBI202-SE1902, PRJ301-SE1803 | SWE201-SE1701
            </div>
            
            <div>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
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
                ...(isSelectionMode ? [{
                  key: 'select',
                  header: (
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length}
                      onChange={toggleSelectAll}
                    />
                  ),
                  render: (r: any) => (
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      checked={selectedIds.has((r as UserRow).id)}
                      onChange={() => toggleSelect((r as UserRow).id)}
                    />
                  ),
                  className: 'w-12 pl-4'
                }] : []),
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
                  key: 'actions',
                  header: 'Thao tác bảo mật',
                  render: (r) => {
                    const u = r as UserRow
                    return (
                      <div className="flex gap-1 justify-end pr-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedIds.size === 1) {
                              const id = Array.from(selectedIds)[0]
                              const su = filteredUsers.find(u => u.id === id)
                              if (su) handleOpenEdit(su)
                            } else {
                              handleOpenEdit(u)
                            }
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition"
                          title="Sửa thông tin tài khoản"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (selectedIds.size > 0) {
                              handleBulkDelete()
                            } else {
                              setConfirmDelete(u.id)
                            }
                          }}
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