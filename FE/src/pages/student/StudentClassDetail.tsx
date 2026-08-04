import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { api } from '@/lib/api'
import { 
  BookOpen, 
  Users, 
  ArrowLeft, 
  UserCheck, 
  Mail, 
  Loader2, 
  GraduationCap,
  LayoutGrid,
  List
} from 'lucide-react'
import classNames from 'classnames'

type Student = {
  id: string
  studentCode: string
  fullName: string
  email: string
  avatar: string | null
  joinedAt: string | null
}

type ClassDetailData = {
  id: string
  classCode: string
  subject: { id: string; code: string; name: string } | null
  lecturers: { id: string; name: string; email: string; avatar?: string | null }[]
  students: Student[]
}

export function StudentClassDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ClassDetailData | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  const fetchClassDetail = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await api.getStudentClassDetail(id)
      if (res && res.data) {
        setData(res.data)
      } else if (res && (res as any).classCode) {
        setData(res as any)
      }
    } catch (err) {
      console.error('Failed to load class detail:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchClassDetail()
  }, [fetchClassDetail])

  // Filter students by search term (Name or MSSV)
  const filteredStudents = data?.students || []

  const getAvatarUrl = (avatar: string | null, name: string) => {
    if (avatar) {
      if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar
      return `${window.location.origin}${avatar.startsWith('/') ? '' : '/'}${avatar}`
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Student')}&background=4f46e5&color=fff&bold=true`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 dark:text-brand-400" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading class information...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white dark:bg-[#151821] rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <GraduationCap className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Class information not found</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">This class does not exist, or you have not been assigned to it.</p>
          <button
            onClick={() => navigate('/student/classes')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to class list
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/student/classes')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Class list
          </button>
          <PageHeader
            title={data.subject?.name || data.classCode || 'Class details'}
            description={`Class code: ${data.classCode || 'N/A'} • ${data.subject?.code || ''}`}
          />
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 text-white p-6 sm:p-8 shadow-lg">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{data.subject?.code || 'SUBJECT'}</span>
              <span className="opacity-60">•</span>
              <span>Class: {data.classCode}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {data.subject?.name || data.classCode}
            </h1>

            {/* Lecturers */}
            {data.lecturers && data.lecturers.length > 0 && (
              <div className="flex items-center gap-3 pt-2 text-sm text-brand-100">
                <span className="font-semibold text-white/80">Lecturers:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {data.lecturers.map(lecturer => (
                    <div key={lecturer.id} className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                      <img
                        src={getAvatarUrl(lecturer.avatar || null, lecturer.name)}
                        alt={lecturer.name}
                        className="w-5 h-5 rounded-full object-cover border border-white/30"
                        onError={(e) => {
                          ;(e.target as HTMLElement).setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(lecturer.name)}&background=ffffff&color=4f46e5`)
                        }}
                      />
                      <span className="font-medium text-white">{lecturer.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Class size */}
          <div className="flex justify-end border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6">
            <div className="w-full bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-white/15">
                <Users className="w-6 h-6 text-brand-200" />
              </div>
              <div>
                <p className="text-xs text-brand-200 font-semibold uppercase tracking-wider">Total students</p>
                <p className="text-2xl font-black">{data.students?.length || 0} Students</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="space-y-4">
        {/* Title & Controls Bar: Search & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#151821] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Students in this class ({filteredStudents.length})
            </h3>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={classNames(
                  'p-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                )}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={classNames(
                  'p-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                )}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Students List View */}
        {filteredStudents.length === 0 ? (
          <div className="bg-white dark:bg-[#151821] rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center py-12">
            <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-700 dark:text-slate-300 font-semibold">No matching students found</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search, or check the name / student ID again.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="bg-white dark:bg-[#151821] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">STT</th>
                    <th className="py-3.5 px-4">Photo</th>
                    <th className="py-3.5 px-4">Full name</th>
                    <th className="py-3.5 px-4">Student ID</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredStudents.map((student, idx) => (
                    <tr 
                      key={student.id || idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center text-slate-400 text-xs font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="relative w-[111px] h-[146px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 bg-[#4f46e5] flex items-center justify-center">
                          {student.avatar ? (
                            <img
                              src={student.avatar}
                              alt={student.fullName}
                              className="w-full h-full object-cover relative z-10"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <span
                            style={{ display: student.avatar ? 'none' : 'block' }}
                            className="font-extrabold text-white text-3xl tracking-wider select-none"
                          >
                            {((student.fullName || 'ST').trim().split(/\s+/).pop()?.[0] || 'S').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {student.fullName}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                          {student.studentCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{student.email || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          <UserCheck className="w-3 h-3" /> Enrolled
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* CARD GRID VIEW */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map((student, idx) => (
              <div 
                key={student.id || idx}
                className="bg-white dark:bg-[#151821] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all flex flex-col items-center text-center relative group"
              >
                <img
                  src={getAvatarUrl(student.avatar, student.fullName)}
                  alt={student.fullName}
                  className="w-[111px] h-[146px] object-cover shadow-sm mb-3 group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    ;(e.target as HTMLElement).setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName || 'Student')}&background=4f46e5&color=fff&bold=true`)
                  }}
                />
                <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                  {student.fullName}
                </h4>
                <span className="inline-block my-2 px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  MSSV: {student.studentCode}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-full flex items-center justify-center gap-1">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{student.email}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
