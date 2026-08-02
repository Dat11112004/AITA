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
import { Pencil, Trash2, Plus, Users, AlertTriangle, Loader2, X, ShieldAlert, Upload, FileSpreadsheet, CheckSquare, MoreVertical, ChevronDown } from 'lucide-react'

const ROLE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'lecturer', label: 'Lecturer' },
  { id: 'student', label: 'Student' },
]

const ActionMenu = ({ onEdit, onDelete }: { onEdit: () => void, onDelete: () => void }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      setRect(buttonRef.current.getBoundingClientRect());
    }
    setOpen(!open);
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      const handleScroll = () => setOpen(false);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition"
      >
        <MoreVertical size={16} />
      </button>
      {open && rect && createPortal(
        <div
          ref={menuRef}
          style={{ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - 160 }}
          className="absolute w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/20 border border-slate-200 dark:border-slate-700 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onClick={e => e.stopPropagation()}
        >
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
              onClick={(e) => { e.preventDefault(); setOpen(false); onEdit(); }}
            >
              <Pencil size={14} className="text-slate-400" /> Edit Info
            </button>
            <button
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              onClick={(e) => { e.preventDefault(); setOpen(false); onDelete(); }}
            >
              <Trash2 size={14} /> Delete Account
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export function AdminUsers() {
  const [activeTab, setActiveTab] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editingUserClasses, setEditingUserClasses] = useState<any[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'lecturer', externalId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showBulkEditForm, setShowBulkEditForm] = useState(false)
  const [bulkEditRole, setBulkEditRole] = useState('student')
  const [bulkEditing, setBulkEditing] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  // Kept separate from `error`, which every panel renders — a delete failure used
  // to surface inside whichever import panel happened to be open.
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showLecturerImport, setShowLecturerImport] = useState(false)
  const [showAssignmentImport, setShowAssignmentImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importLecturerFile, setImportLecturerFile] = useState<File | null>(null)
  const [importAssignmentFile, setImportAssignmentFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importingLecturer, setImportingLecturer] = useState(false)
  const [importingAssignment, setImportingAssignment] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null)
  const [availableClassCodes, setAvailableClassCodes] = useState<Record<string, { classId: string, classCode: string, studentCount: number }[]>>({})
  const [semesterFilter, setSemesterFilter] = useState<string>('')
  const [subjectsBySemester, setSubjectsBySemester] = useState<Record<string, any[]>>({})
  const [allSemesters, setAllSemesters] = useState<any[]>([])

  useEffect(() => {
    api.getSemesters().then(setAllSemesters).catch(console.error)
  }, [])

  useEffect(() => {
    if (semesterFilter && !subjectsBySemester[semesterFilter]) {
      api.getSubjectsBySemester(semesterFilter).then(subjects => {
        setSubjectsBySemester(prev => ({ ...prev, [semesterFilter]: subjects }));
      }).catch(console.error);
    }
  }, [semesterFilter, subjectsBySemester]);

  useEffect(() => {
    if (semesterFilter && subjectsBySemester[semesterFilter]) {
      const subjects = subjectsBySemester[semesterFilter];
      let hasChanges = false;
      const promises: Promise<void>[] = [];
      const newCodesMap = { ...availableClassCodes };

      subjects.forEach(subj => {
        const key = `${semesterFilter}_${subj.SubjectCode}`;
        if (!newCodesMap[key]) {
          promises.push(
            api.getClassCodes(semesterFilter, subj.SubjectCode).then(codes => {
              newCodesMap[key] = codes;
              hasChanges = true;
            })
          );
        }
      });
      if (promises.length > 0) {
        Promise.all(promises).then(() => {
          if (hasChanges) setAvailableClassCodes(newCodesMap);
        }).catch(console.error);
      }
    }
  }, [semesterFilter, subjectsBySemester]);

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.getUsers(activeTab, 1, 100, search)
      setUsers(data || [])
      setSelectedIds(new Set())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load user list'
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
    setForm({ fullName: user.name, email: user.email, password: '', role: user.role, externalId: user.studentCode || user.lecturerCode || '' })
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

      // Default filter to the most recent enrolled semester, or the first available semester
      const uniqueSems = Array.from(new Set(classes.map((c: any) => c.semesterCode).filter(Boolean))) as string[];
      uniqueSems.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numB - numA;
      });
      if (uniqueSems.length > 0) {
        setSemesterFilter(uniqueSems[0]);
      } else if (allSemesters.length > 0) {
        setSemesterFilter(allSemesters[0].Code || allSemesters[0].id || '');
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
      setError(e instanceof Error ? e.message : 'Error loading user details')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.fullName || form.fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters')
      return
    }
    if (!form.email || !form.email.includes('@')) {
      setError('Invalid email format')
      return
    }
    if (!editingUser && (!form.password || form.password.length < 6)) {
      setError('Password is required and must be at least 6 characters')
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
          .filter((c: any) => c.newClassCode && (c.newClassCode !== c.classCode || c.isNew))
          .flatMap((c: any) => {
            if (c.isNew) {
              return [{ newClassCode: c.newClassCode, newSubjectCode: c.subjectCode, semesterCode: c.semesterCode, isNew: true }];
            }
            return (c.allClassIds || [c.classId]).map((id: string) => ({
              classId: id,
              newClassCode: c.newClassCode,
              newSubjectCode: c.newSubjectCode
            }))
          });
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
      setError(e instanceof Error ? e.message : 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmDelete(null)
    setUsers(prev => prev.filter(u => u.id !== id))
    try {
      await api.deleteUser(id)
      api.getUsers(activeTab, 1, 100, search).then(data => setUsers(data || []))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      load()
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
    setBulkDeleteResult(null)
    setConfirmBulkDelete(false)
    try {
      // Single request: the server walks the ids sequentially, so the per-user
      // delete transactions no longer deadlock against each other, and ids that
      // were already removed come back as `skipped` instead of failing the batch.
      const result = await api.bulkDeleteUsers(Array.from(selectedIds))
      const parts = [`Deleted ${result.deleted.length} account(s)`]
      if (result.skipped.length > 0) parts.push(`${result.skipped.length} were already removed`)
      if (result.failed.length > 0) parts.push(`${result.failed.length} could not be deleted`)
      setBulkDeleteResult({
        tone: result.failed.length > 0 ? 'error' : 'success',
        text: parts.join(' · ') + (result.failed.length > 0 ? `\n${result.failed.map(f => f.reason).join('\n')}` : ''),
      })
    } catch (e) {
      setBulkDeleteResult({ tone: 'error', text: e instanceof Error ? e.message : 'Bulk delete failed' })
    } finally {
      setBulkDeleting(false)
      setSelectedIds(new Set())
      setIsSelectionMode(false)
      load()
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
      setError(e instanceof Error ? e.message : 'Bulk update failed')
    } finally {
      setBulkEditing(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setError('Please select an Excel file')
      return
    }

    setImporting(true)
    setError('')
    setImportSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const res = await api.importStudentsExcel(formData)

      if (res.errorCount > 0) {
        let msg = `Unable to import\nSuccess: ${res.successCount}\nErrors: ${res.errorCount}.`
        if (res.errors && res.errors.length > 0) {
          msg += `\nFirst error detail: ${res.errors[0]}`
        }
        setError(msg)
      } else {
        setImportSuccess(`Successfully imported ${res.successCount} students.`)
        setImportFile(null)
      }

      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleLecturerImport = async () => {
    if (!importLecturerFile) {
      setError('Please select an Excel file')
      return
    }

    setImportingLecturer(true)
    setError('')
    setImportSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', importLecturerFile)

      const res = await api.importLecturersExcel(formData)

      if (res.errorCount > 0) {
        let msg = `Unable to import\nSuccess: ${res.successCount}\nErrors: ${res.errorCount}.`
        if (res.errors && res.errors.length > 0) {
          msg += `\nFirst error detail: ${res.errors[0]}`
        }
        setError(msg)
      } else {
        setImportSuccess(`Successfully imported ${res.successCount} lecturers. Notification emails have been sent.`)
        setImportLecturerFile(null)
      }

      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImportingLecturer(false)
    }
  }

  const handleAssignmentImport = async () => {
    if (!importAssignmentFile) {
      setError('Please select an Excel file')
      return
    }

    setImportingAssignment(true)
    setError('')
    setImportSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', importAssignmentFile)

      const res = await api.importTeachingAssignmentsExcel(formData)

      if (res.errorCount > 0) {
        let msg = `Unable to import\nSuccess: ${res.successCount}\nErrors: ${res.errorCount}.`
        if (res.errors && res.errors.length > 0) {
          msg += `\nFirst error detail: ${res.errors[0]}`
        }
        setError(msg)
      } else {
        setImportSuccess(`Successfully imported teaching assignments.`)
        setImportAssignmentFile(null)
      }

      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImportingAssignment(false)
    }
  }

  const filteredUsers = users

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="User Management"
        description="Manage permissions and status of lecturers, students, and admins."
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Users' }]}
        actions={
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              size="sm"
              variant={isSelectionMode ? 'primary' : 'outline'}
              className={isSelectionMode ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'text-slate-700 dark:text-slate-300 border-slate-200'}
              onClick={toggleSelectionMode}
            >
              <CheckSquare size={16} className="mr-2" /> {isSelectionMode ? 'Deselect' : 'Select'}
            </Button>
            {isSelectionMode && (
              <Button
                size="sm"
                variant="outline"
                className="text-brand-700 border-brand-200 hover:bg-brand-50"
                onClick={toggleSelectAll}
              >
                {selectedIds.size === filteredUsers.length && filteredUsers.length > 0 ? 'Deselect All' : 'Select All'}
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
                  Edit {selectedIds.size} selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700 transition"
                  onClick={() => setConfirmBulkDelete(true)}
                >
                  <Trash2 size={16} />
                  Delete {selectedIds.size} selected
                </Button>
              </>
            )}
            {!isSelectionMode && (
              <>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 bg-white dark:bg-[#151821] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold"
                    onClick={() => setIsImportDropdownOpen(prev => !prev)}
                  >
                    <Upload size={16} className="text-brand-600 dark:text-brand-400" />
                    <span>Import Excel/CSV</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isImportDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {isImportDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsImportDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-2.5 transition-colors text-left"
                          onClick={() => {
                            setIsImportDropdownOpen(false);
                            setShowLecturerImport(true);
                            setShowImport(false);
                            setShowAssignmentImport(false);
                            setShowForm(false);
                            setError('');
                            setImportSuccess('');
                          }}
                        >
                          <Upload size={14} className="text-slate-400 shrink-0" />
                          <span>Import Lecturer</span>
                        </button>

                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-2.5 transition-colors text-left"
                          onClick={() => {
                            setIsImportDropdownOpen(false);
                            setShowAssignmentImport(true);
                            setShowLecturerImport(false);
                            setShowImport(false);
                            setShowForm(false);
                            setError('');
                            setImportSuccess('');
                          }}
                        >
                          <Upload size={14} className="text-slate-400 shrink-0" />
                          <span>Import Assignment</span>
                        </button>

                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-2.5 transition-colors text-left"
                          onClick={() => {
                            setIsImportDropdownOpen(false);
                            setShowImport(true);
                            setShowLecturerImport(false);
                            setShowAssignmentImport(false);
                            setShowForm(false);
                            setError('');
                            setImportSuccess('');
                          }}
                        >
                          <Upload size={14} className="text-slate-400 shrink-0" />
                          <span>Import Student</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center gap-2 active:scale-95 transition-transform shadow-sm"
                  onClick={handleOpenCreate}
                >
                  <Plus size={16} />
                  Add New User
                </Button>
              </>
            )}
          </div>
        }
      />

      {bulkDeleteResult && (
        <div
          className={`flex items-start gap-3 text-sm rounded-xl p-4 border ${bulkDeleteResult.tone === 'error'
            ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/50'
            : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/50'
            }`}
        >
          {bulkDeleteResult.tone === 'error'
            ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            : <CheckSquare className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="whitespace-pre-wrap flex-1">{bulkDeleteResult.text}</div>
          <button type="button" onClick={() => setBulkDeleteResult(null)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition">
            <X size={16} />
          </button>
        </div>
      )}

      {showBulkEditForm && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <form onSubmit={handleBulkEdit}>
              <div className="p-6">
                <div className="text-center space-y-2 mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Bulk Change Role</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Select a new role for <span className="font-bold text-blue-600">{selectedIds.size}</span> selected accounts.
                  </p>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Role</label>
                    <Select
                      value={bulkEditRole}
                      onChange={(e) => setBulkEditRole(e.target.value)}
                      options={[
                        { value: 'student', label: 'Student' },
                        { value: 'lecturer', label: 'Lecturer' },
                        { value: 'admin', label: 'Admin' }
                      ]}
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowBulkEditForm(false)} disabled={bulkEditing}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={bulkEditing} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium flex items-center justify-center">
                    {bulkEditing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {bulkEditing ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>,
        document.body
      )}

      {confirmBulkDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-red-200 dark:border-red-900/40 shadow-xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                <ShieldAlert className="text-red-600 dark:text-red-400 w-6 h-6 animate-pulse" />
              </div>
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confirm Bulk Delete?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You are about to permanently delete <span className="font-bold text-red-600">{selectedIds.size}</span> accounts. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmBulkDelete(false)} disabled={bulkDeleting}>
                  Cancel
                </Button>
                <Button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium flex items-center justify-center">
                  {bulkDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {bulkDeleting ? 'Deleting...' : 'Permanently Delete'}
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-red-200 dark:border-red-900/40 shadow-xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
                <ShieldAlert className="text-red-600 dark:text-red-400 w-6 h-6 animate-pulse" />
              </div>
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Are you sure you want to delete this account?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This action will permanently delete the account from the database. All identity information and submission history will be completely destroyed and cannot be recovered.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleDelete(confirmDelete)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium">
                  Permanently Delete
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {selectedUserDetail && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200 border-slate-200 dark:border-slate-800">
            <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10 border-b border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Account Details</h3>
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
                      {selectedUserDetail.role === 'admin' ? 'Admin' : selectedUserDetail.role === 'lecturer' ? 'Lecturer' : 'Student'}
                    </Badge>
                    {selectedUserDetail.status !== 'active' ? (
                      <Badge variant="danger">Locked</Badge>
                    ) : (
                      (() => {
                        const online = selectedUserDetail.lastLoginAt ? (new Date().getTime() - new Date(selectedUserDetail.lastLoginAt).getTime()) < 30 * 60 * 1000 : false;
                        return (
                          <Badge variant={online ? 'success' : 'neutral'} className={online ? "flex items-center gap-1.5 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"}>
                            {online && <span className="w-1.5 h-1.5 rounded-full bg-green-100 animate-pulse" />}
                            {online ? 'Active' : 'Inactive'}
                          </Badge>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">ID (Student/Lecturer)</p>
                  <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedUserDetail.studentCode || selectedUserDetail.lecturerCode || 'None'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{selectedUserDetail.role === 'lecturer' ? 'Teaching Subjects' : 'Class'}</p>
                  <p className="text-slate-900 dark:text-slate-200 font-medium">
                    {Array.from(new Set([
                      ...(selectedUserDetail.enrolledClasses || []).map((c: any) => c.classCode),
                      ...(selectedUserDetail.instructingClasses || []).map((c: any) => c.subjectCode)
                    ])).filter(Boolean).join(', ') || 'None'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Phone Number</p>
                  <p className="text-slate-900 dark:text-slate-200 font-medium">{selectedUserDetail.phone || 'None'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Last Login</p>
                  <p className="text-slate-900 dark:text-slate-200 font-medium">
                    {selectedUserDetail.lastLoginAt ? new Date(selectedUserDetail.lastLoginAt).toLocaleString('en-US') : 'Never logged in'}
                  </p>
                </div>
              </div>

              {selectedUserDetail.role === 'student' && selectedUserDetail.enrolledClasses && selectedUserDetail.enrolledClasses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">Subject list by semester</h4>
                  <div className="space-y-3">
                    {Object.entries(
                      selectedUserDetail.enrolledClasses.reduce((acc: any, c: any) => {
                        const semMatch = c.semesterCode?.match(/\d+/);
                        const semKey = semMatch ? `Semester ${semMatch[0]}` : (c.semesterCode || 'Other');
                        if (!acc[semKey]) acc[semKey] = {};

                        const classKey = c.classCode || 'Not assigned';
                        if (!acc[semKey][classKey]) acc[semKey][classKey] = [];

                        acc[semKey][classKey].push(c);
                        return acc;
                      }, {})
                    ).sort((a: any, b: any) => {
                      const numA = parseInt(a[0].match(/\d+/)?.[0] || '0');
                      const numB = parseInt(b[0].match(/\d+/)?.[0] || '0');
                      if (numA && numB) return numB - numA;
                      return String(b[0]).localeCompare(String(a[0]));
                    }).map(([semester, classes]: [string, any]) => (
                      <details key={semester} className="group/sem border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-3 last:mb-0">
                        <summary className="bg-slate-50 dark:bg-slate-800/80 p-4 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition list-none [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            {semester}
                            <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900 font-normal shrink-0">{Object.keys(classes).length} classes</Badge>
                          </span>
                          <span className="text-slate-400 group-open/sem:rotate-180 transition-transform duration-200 shrink-0 ml-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          </span>
                        </summary>
                        <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                          {Object.entries(classes).sort((a: any, b: any) => a[0].localeCompare(b[0])).map(([classCode, classItems]: [string, any]) => (
                            <details key={classCode} className="group/sub border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <summary className="bg-slate-50/50 dark:bg-slate-800/30 p-3 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex justify-between items-start hover:bg-slate-100 dark:hover:bg-slate-800 transition list-none [&::-webkit-details-marker]:hidden">
                                <span className="flex-1 pr-4 leading-relaxed">{classCode}</span>
                                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900 font-normal">{classItems.length} subjects</Badge>
                                  <span className="text-slate-400 group-open/sub:rotate-180 transition-transform duration-200">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                  </span>
                                </div>
                              </summary>
                              <div className="p-3 space-y-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                {classItems.map((c: any, idx: number) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <h5 className="font-medium text-brand-600 dark:text-brand-400 flex flex-wrap items-center gap-2">
                                      {c.subjectName ? `${c.subjectCode} - ${c.subjectName}` : c.subjectCode}
                                    </h5>
                                    {c.instructorName && (
                                      <span className="text-[13px] text-slate-500 flex items-center gap-1.5 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md shrink-0">
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
                  <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">Teaching list by semester</h4>
                  <div className="space-y-3">
                    {Object.entries(
                      selectedUserDetail.instructingClasses.reduce((acc: any, c: any) => {
                        const semMatch = c.semesterCode?.match(/\d+/);
                        const semKey = semMatch ? `Semester ${semMatch[0]}` : (c.semesterCode || 'Other');
                        if (!acc[semKey]) acc[semKey] = {};

                        const classKey = c.classCode || 'Not assigned';
                        if (!acc[semKey][classKey]) acc[semKey][classKey] = [];

                        acc[semKey][classKey].push(c);
                        return acc;
                      }, {})
                    ).sort((a: any, b: any) => {
                      const numA = parseInt(a[0].match(/\d+/)?.[0] || '0');
                      const numB = parseInt(b[0].match(/\d+/)?.[0] || '0');
                      if (numA && numB) return numB - numA;
                      return String(b[0]).localeCompare(String(a[0]));
                    }).map(([semester, classes]: [string, any]) => (
                      <details key={semester} className="group/sem border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-3 last:mb-0">
                        <summary className="bg-slate-50 dark:bg-slate-800/80 p-4 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition list-none [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            {semester}
                            <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900 font-normal shrink-0">{Object.keys(classes).length} classes</Badge>
                          </span>
                          <span className="text-slate-400 group-open/sem:rotate-180 transition-transform duration-200 shrink-0 ml-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          </span>
                        </summary>
                        <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                          {Object.entries(classes).sort((a: any, b: any) => a[0].localeCompare(b[0])).map(([classCode, classItems]: [string, any]) => (
                            <details key={classCode} className="group/sub border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <summary className="bg-slate-50/50 dark:bg-slate-800/30 p-3 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none flex justify-between items-start hover:bg-slate-100 dark:hover:bg-slate-800 transition list-none [&::-webkit-details-marker]:hidden">
                                <span className="flex-1 pr-4 leading-relaxed">{classCode}</span>
                                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900 font-normal">{classItems.length} subjects</Badge>
                                  <span className="text-slate-400 group-open/sub:rotate-180 transition-transform duration-200">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                  </span>
                                </div>
                              </summary>
                              <div className="p-3 space-y-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                {classItems.map((c: any, idx: number) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <h5 className="font-medium text-brand-600 dark:text-brand-400 flex flex-wrap items-center gap-2">
                                      {c.subjectCode} - {c.subjectName}
                                    </h5>
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
              <Button variant="outline" onClick={() => setSelectedUserDetail(null)}>Close</Button>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {showImport && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center">
            <CardHeader
              title="Import Student List (Excel)"
              description="Upload an Excel file following the standard template."
            />
            <button type="button" onClick={() => setShowImport(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="whitespace-pre-wrap"><span className="font-semibold">Error:</span> {error}</div>
            </div>
          )}

          {importSuccess ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
                <CheckSquare className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Done!</h3>
              <p className="text-center text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{importSuccess}</p>
              <Button className="mt-4 bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]" onClick={() => setShowImport(false)}>
                Back
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                <span className="text-slate-800 dark:text-slate-200 font-semibold mb-1 block">Excel template includes these columns:</span>
                <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre">
                  RollNumber | Full Name | Email | Passed Subjects | Phone Number | Semester | Class | Other Subjects (Re-study/Over) | Avatar{'\n'}
                  QE180097 | Full Name | qe180097@fpt.edu.vn | SWE201-SE1701 | 0912345678 | 8 | SE18C01 | DBI202-SE1902, PRJ301-SE1803 | https://example.com/avatar.jpg
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
                <Button type="button" variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={importing} className="bg-brand-600 hover:bg-brand-700 text-white">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                  {importing ? 'Importing...' : 'Perform Import'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {showLecturerImport && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center">
            <CardHeader
              title="Import Lecturer List (Excel)"
              description="Upload an Excel file following the standard template."
            />
            <button type="button" onClick={() => setShowLecturerImport(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="whitespace-pre-wrap"><span className="font-semibold">Error:</span> {error}</div>
            </div>
          )}

          {importSuccess ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
                <CheckSquare className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Done!</h3>
              <p className="text-center text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{importSuccess}</p>
              <Button className="mt-4 bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]" onClick={() => setShowLecturerImport(false)}>
                Back
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                <span className="text-slate-800 dark:text-slate-200 font-semibold mb-1 block">Excel template includes these columns:</span>
                <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre">
                  ID | Full Name | Email | Phone Number | Avatar{'\n'}
                  GV0001 | Nguyen Van A | nva@fpt.edu.vn | 0912345678 | https://example.com/avatar.jpg{'\n'}
                  GV0002 | Tran Thi B | ttb@fpt.edu.vn | 0987654321 | https://example.com/avatar2.jpg
                </pre>
              </div>

              <div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500"
                  onChange={(e) => setImportLecturerFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="ghost" onClick={() => setShowLecturerImport(false)}>Cancel</Button>
                <Button onClick={handleLecturerImport} disabled={importingLecturer} className="bg-brand-600 hover:bg-brand-700 text-white">
                  {importingLecturer ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                  {importingLecturer ? 'Importing...' : 'Perform Import'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {showAssignmentImport && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center">
            <CardHeader
              title="Import Teaching Assignments (Excel)"
              description="Upload an Excel file to assign subjects/classes to lecturers."
            />
            <button type="button" onClick={() => setShowAssignmentImport(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="whitespace-pre-wrap"><span className="font-semibold">Error:</span> {error}</div>
            </div>
          )}

          {importSuccess ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
                <CheckSquare className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Done!</h3>
              <p className="text-center text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{importSuccess}</p>
              <Button className="mt-4 bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]" onClick={() => setShowAssignmentImport(false)}>
                Back
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                <span className="text-slate-800 dark:text-slate-200 font-semibold mb-1 block">Excel template includes these columns:</span>
                <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre">
                  Lecturer ID | Full Name | Subject | Class{'\n'}
                  GV0001 | Nguyen Van A | DBI201 | SE18C01{'\n'}
                  GV0002 | Tran Thi B | CSD201 | SE18C03
                </pre>
              </div>

              <div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-brand-500"
                  onChange={(e) => setImportAssignmentFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="ghost" onClick={() => setShowAssignmentImport(false)}>Cancel</Button>
                <Button onClick={handleAssignmentImport} disabled={importingAssignment} className="bg-brand-600 hover:bg-brand-700 text-white">
                  {importingAssignment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                  {importingAssignment ? 'Importing...' : 'Perform Import'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {showForm && (
        <Card className="overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center">
            <CardHeader
              title={editingUser ? `Update account: ${editingUser.name}` : 'Register New System Account'}
              description={editingUser ? 'Update permissions or change email. Leave password empty to keep existing one.' : 'Grant system access for specific functional modules.'}
            />
            <button type="button" onClick={resetForm} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/50 rounded-xl p-4 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div><span className="font-semibold">Validation error:</span> {error}</div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Full Name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Example: Nguyen Van A"
                required
                hint="Minimum 2 characters"
              />
              <Input
                label="Email Address"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@fpt.edu.vn"
                required
                disabled={!!editingUser}
                hint={editingUser ? "Email cannot be changed after creation" : ""}
              />
              <Input
                label={editingUser ? 'Password (Cannot be changed through this form)' : 'Temporary Password'}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••"
                required={!editingUser}
                disabled={!!editingUser}
                hint={!editingUser ? "Minimum 6 characters" : ""}
              />
              <Select
                label="System Role"
                options={[
                  { value: 'lecturer', label: 'Lecturer' },
                  { value: 'student', label: 'Student' },
                  { value: 'admin', label: 'Admin' },
                ]}
                value={form.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, role: e.target.value })}
                required
                disabled={!!editingUser}
              />
              {!editingUser && (
                <Input
                  label="Internal ID (RollNumber/StaffCode)"
                  value={form.externalId}
                  onChange={(e) => setForm({ ...form, externalId: e.target.value })}
                  placeholder="Example: GV021 or HE180123"
                />
              )}
            </div>

            {editingUser && editingUserClasses.length > 0 && (
              <div className="col-span-full border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Class / Subject Management</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Filter by semester:</span>
                    <Select
                      value={semesterFilter}
                      onChange={(e) => setSemesterFilter(e.target.value)}
                      options={[
                        { value: '', label: 'Select semester...' },
                        ...allSemesters
                          .filter((sem: any) => {
                            const code = sem.code || sem.Code || sem.id;
                            return editingUserClasses.some((c: any) => c.semesterCode === code);
                          })
                          .sort((a: any, b: any) => {
                            const codeA = String(a.code || a.Code || a.id);
                            const codeB = String(b.code || b.Code || b.id);
                            const numA = parseInt(codeA.match(/\d+/)?.[0] || '0', 10);
                            const numB = parseInt(codeB.match(/\d+/)?.[0] || '0', 10);
                            return numB - numA;
                          })
                          .map((sem: any) => {
                            const code = sem.code || sem.Code || sem.id;
                            return {
                              value: code,
                              label: String(code)
                            };
                          })
                      ]}
                      className="w-40"
                    />
                  </div>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 font-medium w-28">Semester</th>
                        <th className="px-4 py-3 font-medium">Subject</th>
                        <th className="px-4 py-3 font-medium">Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {semesterFilter && subjectsBySemester[semesterFilter] ? subjectsBySemester[semesterFilter].map((subj: any) => {
                        const activeSubjectCode = subj.SubjectCode;
                        const codeKey = `${semesterFilter}_${activeSubjectCode}`;
                        const rawCodes = availableClassCodes[codeKey] || [];
                        const seenCodes = new Set<string>();
                        const codes = rawCodes.filter((cd: any) => {
                          if (seenCodes.has(cd.classCode)) return false;
                          seenCodes.add(cd.classCode);
                          return true;
                        });

                        const draftClass = editingUserClasses.find((c: any) => c.semesterCode === semesterFilter && c.subjectCode === activeSubjectCode);
                        const originalIndex = draftClass ? editingUserClasses.indexOf(draftClass) : -1;
                        const currentClassCode = draftClass?.newClassCode || draftClass?.classCode || '';

                        return (
                          <tr key={activeSubjectCode} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400 text-xs">
                              {semesterFilter}
                            </td>
                            <td className="px-4 py-2">
                              <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                                {subj.SubjectCode}{subj.SubjectName ? ` - ${subj.SubjectName}` : ''}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <select
                                className="w-full text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                                value={currentClassCode}
                                onChange={e => {
                                  const val = e.target.value;
                                  const newList = [...editingUserClasses];
                                  if (originalIndex >= 0) {
                                    if (!val && draftClass?.isNew) {
                                      newList.splice(originalIndex, 1);
                                    } else {
                                      newList[originalIndex] = { ...newList[originalIndex], newClassCode: val };
                                    }
                                  } else if (val) {
                                    newList.push({
                                      semesterCode: semesterFilter,
                                      subjectCode: activeSubjectCode,
                                      newClassCode: val,
                                      isNew: true
                                    });
                                  }
                                  setEditingUserClasses(newList);
                                }}
                              >
                                <option value="">-- No class assigned --</option>
                                {!codes.some((cd: any) => cd.classCode === currentClassCode) && currentClassCode && (
                                  <option key="__current_class__" value={currentClassCode}>{currentClassCode}</option>
                                )}
                                {codes.map((cd: any) => (
                                  <option key={cd.classCode} value={cd.classCode}>{cd.classCode}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-sm">
                            {semesterFilter ? 'No subject data for this semester.' : 'Please select a semester.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <Button type="button" variant="ghost" className="text-slate-500 hover:bg-slate-50" onClick={resetForm}>Cancel</Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 min-w-[120px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingUser ? 'Update data' : 'Activate account'}
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
                placeholder="Quick filter by name | student/lecturer ID"
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
              <p className="font-semibold text-red-800 dark:text-red-300">Data loading error</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{loadError}</p>
            </div>
            <button onClick={load} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm">
              Retry
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
                  header: 'System ID',
                  render: (r) => {
                    const u = r as UserRow
                    const code = u.studentCode || u.lecturerCode || '-'
                    return <span className="font-mono text-[12px] font-semibold text-slate-700 dark:text-slate-300 block max-w-[120px] truncate" title={code}>{code}</span>
                  },
                  className: 'w-32 pl-4'
                },
                {
                  key: 'avatar',
                  header: 'Avatar',
                  render: (r) => {
                    const u = r as UserRow;
                    const isLocked = u.status !== 'active';

                    const isOnline = (() => {
                      if (!u.lastLoginAt) return false;
                      let timeStr = String(u.lastLoginAt);
                      if (!timeStr.endsWith('Z') && !timeStr.includes('+')) {
                        timeStr += 'Z'; // Fix timezone issue (BE returns UTC without Z)
                      }
                      const diff = Date.now() - new Date(timeStr).getTime();
                      // Active session window: exactly 30 minutes to simulate real-time "Online" status
                      return diff > -60000 && diff < 30 * 60 * 1000;
                    })();

                    let dotColor = 'bg-slate-400';
                    if (isLocked) {
                      dotColor = 'bg-red-500';
                    } else if (isOnline) {
                      dotColor = 'bg-green-500';
                    }

                    return (
                      <div className="relative inline-block">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className={`w-[111px] h-[146px] object-cover shadow-sm ${isLocked ? 'opacity-50 grayscale' : ''}`} />
                        ) : (
                          <div className={`w-[111px] h-[146px] bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-3xl shadow-sm ${isLocked ? 'opacity-50' : ''}`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-1 -right-1 block w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm ${dotColor}`}
                          title={isLocked ? 'Locked' : isOnline ? 'Active' : 'Inactive'}
                        />
                      </div>
                    );
                  },
                  className: 'w-16'
                },
                {
                  key: 'name',
                  header: 'Full Name',
                  render: (r) => <span className="font-semibold text-slate-800 dark:text-slate-200">{(r as UserRow).name}</span>
                },
                {
                  key: 'email',
                  header: 'Email Address',
                  render: (r) => <span className="text-slate-600 dark:text-slate-400 font-medium">{(r as UserRow).email}</span>
                },
                {
                  key: 'role',
                  header: 'Role',
                  render: (r) => {
                    const u = r as UserRow
                    const variant = u.role === 'admin' ? 'info' : u.role === 'lecturer' ? 'warning' : 'success'
                    const label = u.role === 'admin' ? 'Admin' : u.role === 'lecturer' ? 'Lecturer' : 'Student'
                    return <Badge variant={variant} className="px-2.5 py-0.5 rounded-full font-medium text-[11px]">{label}</Badge>
                  },
                  className: 'w-32'
                },


                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r) => {
                    const u = r as UserRow
                    return (
                      <div className="flex gap-1 justify-end pr-2">
                        <ActionMenu
                          onEdit={() => {
                            if (selectedIds.size === 1) {
                              const id = Array.from(selectedIds)[0]
                              const su = filteredUsers.find(user => user.id === id)
                              if (su) handleOpenEdit(su)
                            } else {
                              handleOpenEdit(u)
                            }
                          }}
                          onDelete={() => {
                            if (selectedIds.size > 0) {
                              setConfirmBulkDelete(true)
                            } else {
                              setConfirmDelete(u.id)
                            }
                          }}
                        />
                      </div>
                    )
                  },
                  className: 'w-24 text-right'
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