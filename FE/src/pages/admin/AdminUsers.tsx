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
import { Pencil, Trash2, Plus, Users, AlertTriangle, Loader2, X, ShieldAlert, Upload, FileSpreadsheet, CheckSquare } from 'lucide-react'

const ROLE_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'lecturer', label: 'Giảng viên' },
  { id: 'student', label: 'Sinh viên' },
]

export function AdminUsers() {
  const [activeTab, setActiveTab] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editingUserClasses, setEditingUserClasses] = useState<any[]>([])
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
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null)
  const [availableClassCodes, setAvailableClassCodes] = useState<Record<string, {classId: string, classCode: string, studentCount: number}[]>>({})
  const [semesterFilter, setSemesterFilter] = useState<string>('')
  const [subjectsBySemester, setSubjectsBySemester] = useState<Record<string, any[]>>({})


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
    setEditingUserClasses([])
    setShowForm(false)
    setError('')
  }

  const handleOpenCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const handleOpenEdit = async (user: UserRow) => {
    setEditingUser(user)
    setForm({ fullName: user.name, email: user.email, password: '', role: user.role, externalId: user.studentCode || '' })
    setEditingUserClasses([])
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      const details = await api.getUser(user.id)
      const classes = [...(details.enrolledClasses || []), ...(details.instructingClasses || [])]
      
      // Deduplicate: keep only one row per subject+semester combo (pick the most-recent)
      const seen = new Map<string, any>();
      for (const c of classes) {
        const key = `${c.semesterCode}_${c.subjectCode}`;
        if (!seen.has(key)) {
          seen.set(key, { ...c, newClassCode: c.classCode, allClassIds: [c.classId] });
        } else {
          // Track all classIds so backend can clean up duplicates
          seen.get(key).allClassIds.push(c.classId);
        }
      }
      const dedupedClasses = Array.from(seen.values());
      setEditingUserClasses(dedupedClasses)
      
      // Lấy danh sách class codes có sẵn cho từng môn học + học kỳ
      const codesMap: Record<string, any[]> = {}
      await Promise.all(classes.map(async (c) => {
        if (!c.semesterCode || !c.subjectCode) return;
        const key = `${c.semesterCode}_${c.subjectCode}`;
        if (!codesMap[key]) {
          try {
            const codes = await api.getClassCodes(c.semesterCode, c.subjectCode);
            codesMap[key] = codes;
          } catch (err) {
            console.error(`Failed to fetch class codes for ${key}`, err);
          }
        }
      }));
      setAvailableClassCodes(codesMap);
      
      // Pre-fetch subjects for each unique semester the user is enrolled in
      const uniqueSems = Array.from(new Set(classes.map((c: any) => c.semesterCode).filter(Boolean))) as string[];
      try {
        const semResults = await Promise.all(
          uniqueSems.map(sem => api.getSubjectsBySemester(sem).then(subjects => ({ sem, subjects })))
        );
        const newSubMap: Record<string, any[]> = {};
        for (const { sem, subjects } of semResults) newSubMap[sem] = subjects;
        setSubjectsBySemester(newSubMap);
      } catch (err) {
        console.error('Failed to fetch subjects by semester', err);
      }
      
      // Default filter to the first available semester or empty
      if (uniqueSems.length > 0) {
        setSemesterFilter(uniqueSems[0] as string);
      } else {
        setSemesterFilter('');
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenDetail = async (id: string) => {
    setError('')
    try {
      const data = await api.getUser(id)
      setSelectedUserDetail(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải chi tiết người dùng')
    }
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
        const updateBody: any = {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
        }
        if (form.password) updateBody.password = form.password
        const updatedClasses = editingUserClasses
          .filter(c => c.newClassCode && (c.newClassCode !== c.classCode || c.newSubjectCode))
          .flatMap(c => (c.allClassIds || [c.classId]).map((id: string) => ({
            classId: id,
            newClassCode: c.newClassCode,
            newSubjectCode: c.newSubjectCode
          })));
        if (updatedClasses.length > 0) updateBody.updatedClasses = updatedClasses;
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
    setConfirmDelete(null)
    setUsers(prev => prev.filter(u => u.id !== id))
    try {
      await api.deleteUser(id)
      // Chạy ngầm load để đảm bảo đồng bộ hoàn toàn, nhưng không await để UI mượt
      api.getUsers(activeTab, 1, 100, search).then(data => setUsers(data || []))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa tài khoản thất bại')
      load() // Phục hồi dữ liệu nếu lỗi
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
      // Cập nhật giao diện realtime
      setUsers(prev => prev.filter(u => !selectedIds.has(u.id)))
      await Promise.all(Array.from(selectedIds).map(id => api.deleteUser(id)))
      setConfirmBulkDelete(false)
      setSelectedIds(new Set())
      setIsSelectionMode(false)
      api.getUsers(activeTab, 1, 100, search).then(data => setUsers(data || []))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa hàng loạt thất bại')
      load()
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
            <Button
              size="sm"
              variant={isSelectionMode ? 'primary' : 'outline'}
              className={isSelectionMode ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'text-slate-700 dark:text-slate-300 border-slate-200'}
              onClick={toggleSelectionMode}
            >
              <CheckSquare size={16} className="mr-2" /> {isSelectionMode ? 'Hủy chọn' : 'Chọn'}
            </Button>
            {isSelectionMode && (
              <Button
                size="sm"
                variant="outline"
                className="text-brand-700 border-brand-200 hover:bg-brand-50"
                onClick={toggleSelectAll}
              >
                {selectedIds.size === filteredUsers.length && filteredUsers.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            )}
            {isSelectionMode && selectedIds.size > 0 && (
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
            {!isSelectionMode && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
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

      {/* User Detail Modal */}
      {selectedUserDetail && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200 border-slate-200 dark:border-slate-800">
            <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10 border-b border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chi tiết tài khoản</h3>
              <button onClick={() => setSelectedUserDetail(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-8">
              <div className="flex items-start gap-4">
                {selectedUserDetail.avatar ? (
                  <img src={selectedUserDetail.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-brand-100 dark:border-brand-900" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-2xl border-2 border-brand-100 dark:border-brand-900">
                    {selectedUserDetail.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{selectedUserDetail.name}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-3">{selectedUserDetail.email}</p>
                  <div className="flex gap-2">
                    <Badge variant={selectedUserDetail.role === 'admin' ? 'info' : selectedUserDetail.role === 'lecturer' ? 'warning' : 'success'}>
                      {selectedUserDetail.role === 'admin' ? 'Quản trị viên' : selectedUserDetail.role === 'lecturer' ? 'Giảng viên' : 'Sinh viên'}
                    </Badge>
                    {selectedUserDetail.status !== 'active' ? (
                      <Badge variant="danger">Đã khóa</Badge>
                    ) : (
                      (() => {
                        const online = selectedUserDetail.lastLoginAt ? (new Date().getTime() - new Date(selectedUserDetail.lastLoginAt).getTime()) < 30 * 60 * 1000 : false;
                        return (
                          <Badge variant={online ? 'success' : 'neutral'} className={online ? "flex items-center gap-1.5 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"}>
                            {online && <span className="w-1.5 h-1.5 rounded-full bg-green-100 animate-pulse" />}
                            {online ? 'Đang hoạt động' : 'Không hoạt động'}
                          </Badge>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Mã định danh (MSSV/MSGV)</p>
                  <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedUserDetail.studentCode || 'Không có'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{selectedUserDetail.role === 'lecturer' ? 'Môn giảng dạy' : 'Lớp'}</p>
                  <p className="text-slate-900 dark:text-slate-200 font-medium">
                    {Array.from(new Set([
                      ...(selectedUserDetail.enrolledClasses || []).map((c: any) => c.classCode),
                      ...(selectedUserDetail.instructingClasses || []).map((c: any) => c.subjectCode)
                    ])).filter(Boolean).join(', ') || 'Không có'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Số điện thoại</p>
                  <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedUserDetail.phone || 'Không có'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Lần đăng nhập cuối</p>
                  <p className="text-slate-900 dark:text-slate-200 font-medium">
                    {selectedUserDetail.lastLoginAt ? new Date(selectedUserDetail.lastLoginAt).toLocaleString('vi-VN') : 'Chưa từng đăng nhập'}
                  </p>
                </div>
              </div>

              {selectedUserDetail.role === 'student' && selectedUserDetail.enrolledClasses && selectedUserDetail.enrolledClasses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">Danh sách môn học theo học kỳ</h4>
                  <div className="space-y-3">
                    {Object.entries(
                      selectedUserDetail.enrolledClasses.reduce((acc: any, c: any) => {
                        const semKey = c.semesterCode || 'Khác';
                        if (!acc[semKey]) acc[semKey] = {};

                        const subKey = `${c.subjectCode} - ${c.subjectName}`;
                        if (!acc[semKey][subKey]) acc[semKey][subKey] = [];

                        acc[semKey][subKey].push(c);
                        return acc;
                      }, {})
                    ).sort((a: any, b: any) => {
                      const numA = Number(a[0]);
                      const numB = Number(b[0]);
                      if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
                      return String(b[0]).localeCompare(String(a[0]));
                    }).map(([semester, subjects]: [string, any]) => (
                      <details key={semester} className="group/sem border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-3 last:mb-0">
                        <summary className="bg-slate-50 dark:bg-slate-800/80 p-4 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition list-none [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            Kỳ {semester}
                            <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900 font-normal shrink-0">{Object.keys(subjects).length} môn</Badge>
                          </span>
                          <span className="text-slate-400 group-open/sem:rotate-180 transition-transform duration-200 shrink-0 ml-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          </span>
                        </summary>
                        <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                          {Object.entries(subjects).sort((a: any, b: any) => a[0].localeCompare(b[0])).map(([subject, classes]: [string, any]) => (
                            <details key={subject} className="group/sub border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <summary className="bg-slate-50/50 dark:bg-slate-800/30 p-3 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex justify-between items-start hover:bg-slate-100 dark:hover:bg-slate-800 transition list-none [&::-webkit-details-marker]:hidden">
                                <span className="flex-1 pr-4 leading-relaxed">{subject}</span>
                                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900 font-normal">{classes.length} lớp</Badge>
                                  <span className="text-slate-400 group-open/sub:rotate-180 transition-transform duration-200">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                  </span>
                                </div>
                              </summary>
                              <div className="p-3 space-y-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                {classes.map((c: any, idx: number) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <h5 className="font-medium text-brand-600 dark:text-brand-400">
                                      {c.classCode}
                                      {c.isPending && <span className="ml-2 text-xs font-normal text-amber-600 italic bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">(Chờ tạo lớp)</span>}
                                    </h5>
                                    {c.instructorName && (
                                      <span className="text-[13px] text-slate-500 flex items-center gap-1.5 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                        <Users size={14} className="text-brand-600 dark:text-brand-400" />
                                        {c.instructorName}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {selectedUserDetail.role === 'lecturer' && selectedUserDetail.instructingClasses && selectedUserDetail.instructingClasses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">Danh sách giảng dạy theo học kỳ</h4>
                  <div className="space-y-3">
                    {Object.entries(
                      selectedUserDetail.instructingClasses.reduce((acc: any, c: any) => {
                        const semKey = c.semesterCode || 'Khác';
                        if (!acc[semKey]) acc[semKey] = {};

                        const subKey = `${c.subjectCode} - ${c.subjectName}`;
                        if (!acc[semKey][subKey]) acc[semKey][subKey] = [];

                        acc[semKey][subKey].push(c);
                        return acc;
                      }, {})
                    ).sort((a: any, b: any) => {
                      const numA = Number(a[0]);
                      const numB = Number(b[0]);
                      if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
                      return String(b[0]).localeCompare(String(a[0]));
                    }).map(([semester, subjects]: [string, any]) => (
                      <details key={semester} className="group/sem border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-3 last:mb-0">
                        <summary className="bg-slate-50 dark:bg-slate-800/80 p-4 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition list-none [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            Kỳ {semester}
                            <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900 font-normal shrink-0">{Object.keys(subjects).length} môn</Badge>
                          </span>
                          <span className="text-slate-400 group-open/sem:rotate-180 transition-transform duration-200 shrink-0 ml-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          </span>
                        </summary>
                        <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                          {Object.entries(subjects).sort((a: any, b: any) => a[0].localeCompare(b[0])).map(([subject, classes]: [string, any]) => (
                            <details key={subject} className="group/sub border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <summary className="bg-slate-50/50 dark:bg-slate-800/30 p-3 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex justify-between items-start hover:bg-slate-100 dark:hover:bg-slate-800 transition list-none [&::-webkit-details-marker]:hidden">
                                <span className="flex-1 pr-4 leading-relaxed">{subject}</span>
                                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900 font-normal">{classes.length} lớp</Badge>
                                  <span className="text-slate-400 group-open/sub:rotate-180 transition-transform duration-200">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                  </span>
                                </div>
                              </summary>
                              <div className="p-3 space-y-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                {classes.map((c: any, idx: number) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <h5 className="font-medium text-brand-600 dark:text-brand-400">{c.classCode}</h5>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3 rounded-b-xl">
              <Button variant="outline" onClick={() => setSelectedUserDetail(null)}>Đóng</Button>
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
              <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre">
                MSSV | Họ và tên | Email | môn đã học vượt thành công | Số điện thoại | Kỳ học | Lớp học | Môn khác kì hiện tại (nợ/học vượt) | Hình ảnh{'\n'}
                QE180097 | Nguyễn Văn A | qe180097@fpt.edu.vn | SWE201-SE1701 | 0912345678 | 8 | SE18C01 | DBI202-SE1902, PRJ301-SE1803 | https://example.com/avatar.jpg
              </pre>
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

            {editingUser && editingUserClasses.length > 0 && (
              <div className="col-span-full border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Quản lý Lớp học / Môn học</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Lọc theo kỳ:</span>
                    <Select
                      value={semesterFilter}
                      onChange={(e) => setSemesterFilter(e.target.value)}
                      options={[
                        { value: '', label: 'Tất cả các kỳ' },
                        ...Array.from(new Set(editingUserClasses.map(c => c.semesterCode).filter(Boolean))).map(sem => ({
                          value: sem,
                          label: `Kỳ ${sem}`
                        }))
                      ]}
                      className="w-40"
                    />
                  </div>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 font-medium w-28">Kỳ học</th>
                        <th className="px-4 py-3 font-medium">Môn học</th>
                        <th className="px-4 py-3 font-medium">Lớp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {editingUserClasses
                        .filter(c => !semesterFilter || c.semesterCode === semesterFilter)
                        .map((c, i) => {
                          const originalIndex = editingUserClasses.indexOf(c);
                          const activeSubjectCode = c.newSubjectCode || c.subjectCode;
                          const codeKey = `${c.semesterCode}_${activeSubjectCode}`;
                          const codes = availableClassCodes[codeKey] || [];
                          const subjectsInSem = subjectsBySemester[c.semesterCode] || [];

                          return (
                            <tr key={c.classId || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400 text-xs">
                                {c.semesterCode || '-'}
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  className="w-full text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                                  value={c.newSubjectCode || c.subjectCode || ''}
                                  onChange={async e => {
                                    const newList = [...editingUserClasses];
                                    newList[originalIndex] = { ...newList[originalIndex], newSubjectCode: e.target.value, newClassCode: '' };
                                    setEditingUserClasses(newList);
                                    const k = `${c.semesterCode}_${e.target.value}`;
                                    if (e.target.value && !availableClassCodes[k]) {
                                      try {
                                        const fetched = await api.getClassCodes(c.semesterCode, e.target.value);
                                        setAvailableClassCodes(prev => ({ ...prev, [k]: fetched }));
                                      } catch {}
                                    }
                                  }}
                                >
                                  {subjectsInSem.length > 0
                                    ? subjectsInSem.map((sub: any) => (
                                        <option key={sub.SubjectCode} value={sub.SubjectCode}>{sub.SubjectCode}</option>
                                      ))
                                    : <option value={c.subjectCode || ''}>{c.subjectCode || '-'}</option>
                                  }
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                {codes.length > 0 ? (
                                  <select
                                    className="w-full text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                                    value={c.newClassCode || c.classCode || ''}
                                    onChange={e => {
                                      const newList = [...editingUserClasses];
                                      newList[originalIndex] = { ...newList[originalIndex], newClassCode: e.target.value };
                                      setEditingUserClasses(newList);
                                    }}
                                  >
                                    {codes.map(cd => (
                                      <option key={cd.classCode} value={cd.classCode}>{cd.classCode}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    className="w-full text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                                    placeholder="Mã lớp..."
                                    value={c.newClassCode || ''}
                                    onChange={e => {
                                      const newList = [...editingUserClasses];
                                      newList[originalIndex] = { ...newList[originalIndex], newClassCode: e.target.value };
                                      setEditingUserClasses(newList);
                                    }}
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })
                      }
                      {editingUserClasses.filter(c => !semesterFilter || c.semesterCode === semesterFilter).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-sm">
                            Không có dữ liệu lớp học trong kỳ này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

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

      {/* Users List Card - Always visible so search doesn't lose focus */}
      <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="text-slate-400 w-5 h-5 ml-2" />
            <Tabs items={ROLE_TABS} activeId={activeTab} onChange={setActiveTab} />
          </div>

          <div className="relative max-w-xs w-full sm:ml-auto flex items-center">
            <div className="relative w-full">
              <Input
                placeholder="Lọc nhanh họ tên | mã SV/GV"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-10"
              />
              {loading && !loadError && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error State inside Card */}
        {loadError && (
          <div className="flex items-start gap-3 bg-red-50/40 dark:bg-red-950/10 p-4 rounded-xl border border-red-200 dark:border-red-900/40 mb-4">
            <AlertTriangle className="text-red-600 dark:text-red-400 w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 dark:text-red-300">Lỗi tải dữ liệu</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{loadError}</p>
            </div>
            <button onClick={load} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm">
              Thử lại
            </button>
          </div>
        )}

        {/* Always show the table, but lower opacity if loading */}
        {!loadError && (
          <div className={`overflow-x-auto relative transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <DataTable
              columns={[
                ...(isSelectionMode ? [{
                  key: 'select',
                  header: '',
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
                  render: (r) => {
                    const u = r as UserRow
                    const code = u.studentCode || '-'
                    return <span className="font-mono text-[12px] font-semibold text-slate-700 dark:text-slate-300 block max-w-[120px] truncate" title={code}>{code}</span>
                  },
                  className: 'w-32 pl-4'
                },
                {
                  key: 'avatar',
                  header: 'Hình ảnh',
                  render: (r) => {
                    const u = r as UserRow
                    return u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-medium text-xs border border-slate-200">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )
                  },
                  className: 'w-16'
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
                    const u = r as UserRow;
                    if (u.status !== 'active') {
                      return <Badge variant="danger" className="px-2.5 py-0.5 rounded-full font-medium text-[11px]">Đã khóa</Badge>;
                    }
                    const isOnline = u.lastLoginAt ? (new Date().getTime() - new Date(u.lastLoginAt).getTime()) < 30 * 60 * 1000 : false;
                    return (
                      <Badge variant={isOnline ? 'success' : 'neutral'} className={`px-2.5 py-0.5 rounded-full font-medium text-[11px] ${isOnline ? "flex items-center gap-1.5 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-100 animate-pulse" />}
                        {isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
                      </Badge>
                    );
                  },
                  className: 'w-40'
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
                          onClick={(e) => {
                            e.stopPropagation();
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
                          onClick={(e) => {
                            e.stopPropagation();
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
              keyExtractor={(r) => (r as UserRow).id}
              onRowClick={isSelectionMode ? (row) => toggleSelect((row as UserRow).id) : (row) => handleOpenDetail((row as UserRow).id)}
            />
          </div>
        )}
      </Card>
    </div>
  )
}