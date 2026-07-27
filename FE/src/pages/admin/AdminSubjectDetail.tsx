import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, type SubjectRow } from '@/lib/api'
import { getStaticSyllabus } from '@/data/syllabi'
import { 
  ArrowLeft, Clock, Award, 
  Wrench, FileText, Loader2,
  ChevronRight, ShieldCheck, Check, ListOrdered, Calendar,
  Search, Download, Key, AlertCircle
} from 'lucide-react'

type TabType = 'syllabus' | 'clos' | 'sessions' | 'assessment'

export function AdminSubjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [subject, setSubject] = useState<SubjectRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('syllabus')
  const [sessionSearch, setSessionSearch] = useState('')
  const [downloadingSession, setDownloadingSession] = useState<number | null>(null)

  // Handles download for both Cloudinary (fl_attachment) and Google Drive URLs.
  // Google Drive's virus-scan redirect breaks <a download>, so we fetch as blob.
  const handleDownload = useCallback(async (url: string, filename: string, sessionNo: number) => {
    const isGoogleDrive = url.includes('drive.google.com')
    if (!isGoogleDrive) {
      // Cloudinary with fl_attachment — server sends Content-Disposition: attachment, just open
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    // Google Drive: fetch blob to bypass virus-scan warning page
    try {
      setDownloadingSession(sessionNo)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch {
      // Fallback: open in new tab if fetch fails (e.g. CORS)
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadingSession(null)
    }
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.getSubjects(1, 1000)
      .then(res => {
        const found = res.find(s => s.id === id || s.code.toLowerCase() === id.toLowerCase())
        if (found) {
          setSubject(found)
        } else {
          const staticSyllabus = getStaticSyllabus(id)
          setSubject({
            id: id,
            code: id.toUpperCase(),
            name: staticSyllabus?.name || 'Course Subject',
            description: staticSyllabus?.description || ''
          })
        }
      })
      .catch(() => {
        const staticSyllabus = getStaticSyllabus(id)
        setSubject({
          id: id,
          code: id.toUpperCase(),
          name: staticSyllabus?.name || 'Course Subject',
          description: staticSyllabus?.description || ''
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  const hasSyllabusData = useMemo(() => {
    const codeUpper = (subject?.code || id || '').toUpperCase()
    if (subject?.syllabusData) {
      try {
        const parsed = typeof subject.syllabusData === 'string' ? JSON.parse(subject.syllabusData) : subject.syllabusData
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0 && (parsed.clos?.length > 0 || parsed.sessions?.length > 0 || parsed.description)) return true
      } catch (e) {
        // ignore
      }
    }
    return !!getStaticSyllabus(codeUpper)
  }, [subject, id])

  const rawSyllabus = useMemo(() => {
    const codeUpper = (subject?.code || id || '').toUpperCase()
    if (subject?.syllabusData) {
      try {
        const parsed = typeof subject.syllabusData === 'string' ? JSON.parse(subject.syllabusData) : subject.syllabusData
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed
      } catch (e) {
        // ignore
      }
    }
    return getStaticSyllabus(codeUpper)
  }, [subject, id])

  const syllabus = useMemo(() => {
    if (!rawSyllabus) return null
    const s = rawSyllabus as any
    const credits = s.credits ?? s.noCredit ?? 3
    const degreeLevel = s.degreeLevel || 'Bachelor'
    const timeAllocation = s.timeAllocation || 'Study hour (150h) = 45h contact hours + 1h final exam + 104h self-study'
    const prerequisites = s.prerequisites || s.preRequisite || 'None'
    const description = s.description || subject?.description || ''

    const studentTasksList: string[] = Array.isArray(s.studentTasks)
      ? s.studentTasks
      : s.studentTasks ? [s.studentTasks] : [
          'Students must attend at least 80% of contact sessions in order to be accepted to the final examination.',
          'Student is responsible to do all assigned exercises given by instructor in class or at home and submit on time.',
          'Use laptop in class only for learning purpose.',
          'Promptly access to the https://flm.fpt.edu.vn/ for up-to-date course information.'
        ]

    const tools: string[] = s.tools || ['Internet', 'C language utility (ex.DevC++ 6.3)']

    const defaultLearningOutcomes = [
      {
        category: '1. Knowledge',
        code: '(ABET e)',
        items: [
          'Explain the way to solve a real problem using computer.',
          'Understand the basic concepts computer system, and software development.',
          'Understand the basic concepts of programming, focus on procedure programming, testing and debugging, unit testing.'
        ]
      },
      {
        category: '2. Skills in programming',
        code: '(ABET k)',
        items: [
          'Read and understand the simple C programs;',
          'Solve real problems using C.'
        ]
      },
      {
        category: '3. Apply learning methods effectively',
        code: '(ABET i)',
        items: [
          'Academic reading.',
          'Individual and team work behaviors.'
        ]
      }
    ]

    const learningOutcomes = s.learningOutcomes || defaultLearningOutcomes

    const clos = (s.clos || []).map((c: any) => ({
      code: c.code || c.cloName || 'CLO',
      details: c.details || c.cloDetails || '',
      loDetails: c.loDetails || ''
    }))

    const abetBreakdown = learningOutcomes.map((item: any) => ({
      domain: `${item.category} ${item.code || ''}`.trim(),
      clos: item.items || []
    }))

    const assessments = (s.assessments || s.assessmentScheme || []).map((a: any) => ({
      category: a.category || a.name || 'Assessment',
      weightPercent: (a.weightPercent ?? parseFloat(String(a.weight || '0').replace('%', ''))) || 0
    }))

    const sessions = (s.sessions || []).map((ses: any, index: number) => ({
      sessionNo: ses.sessionNo ?? ses.session ?? (index + 1),
      topic: ses.topic || '',
      type: ses.type || 'Offline',
      clo: ses.clo || 'CLO1',
      itu: ses.itu || 'I',
      studentTasks: Array.isArray(ses.studentTasks) ? ses.studentTasks.join(', ') : (ses.studentTasks || ''),
      materialsDownloadUrl: ses.materialsDownloadUrl || ses.cloudinaryUrl || (ses.sDownload ? '#' : undefined),
      sDownload: ses.sDownload || 'Slide PDF'
    }))

    const totalAssessmentWeight = assessments.reduce((acc: number, item: any) => acc + (item.weightPercent || 0), 0)

    return {
      code: s.code || subject?.code || 'PRF192',
      name: s.name || subject?.name || 'Programming Fundamentals',
      description,
      credits,
      degreeLevel,
      timeAllocation,
      prerequisites,
      studentTasksList,
      tools,
      learningOutcomes,
      clos,
      abetBreakdown,
      assessments,
      totalAssessmentWeight,
      sessions
    }
  }, [rawSyllabus, subject])

  const filteredSessions = useMemo(() => {
    if (!syllabus || !sessionSearch.trim()) return syllabus?.sessions || []
    const q = sessionSearch.toLowerCase()
    return syllabus.sessions.filter(
      (s: any) => s.topic.toLowerCase().includes(q) ||
           s.studentTasks.toLowerCase().includes(q) ||
           String(s.sessionNo).includes(q)
    )
  }, [syllabus, sessionSearch])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
        <p className="text-sm text-slate-500 font-medium">Loading course syllabus details...</p>
      </div>
    )
  }

  // Handle courses without syllabus data yet (Not provided yet)
  if (!hasSyllabusData || !syllabus) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/subjects')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Subjects
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link to="/admin" className="hover:underline">Admin</Link>
            <ChevronRight size={12} />
            <Link to="/admin/subjects" className="hover:underline">Subjects</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 dark:text-slate-200 font-bold">{subject?.code || id}</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-[#121629] text-white p-6 sm:p-8 shadow-xl border border-slate-800">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Subject Code: {subject?.code || id}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-slate-200 border border-white/15">
                Degree Level: Bachelor
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Semester: {subject?.semester ? `Semester ${subject.semester}` : 'Semester 1'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {subject?.name || 'Course Subject'}
            </h1>
          </div>
        </div>

        {/* Empty State Card in English */}
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Syllabus Not Provided Yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Detailed syllabus content for <strong className="text-slate-700 dark:text-slate-200 font-semibold">{subject?.code || id} - {subject?.name}</strong> has not been provided yet.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/admin/subjects')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <ArrowLeft size={14} /> Back to Subjects Directory
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
      
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/subjects')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Subjects
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link to="/admin" className="hover:underline">Admin</Link>
          <ChevronRight size={12} />
          <Link to="/admin/subjects" className="hover:underline">Subjects</Link>
          <ChevronRight size={12} />
          <span className="text-slate-700 dark:text-slate-200 font-bold">{syllabus.code}</span>
        </div>
      </div>

      {/* Hero Banner Header - Slate Dark Background */}
      <div className="relative overflow-hidden rounded-3xl bg-[#121629] text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Subject Code: {syllabus.code}
            </span>
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-slate-200 border border-white/15">
              Degree Level: {syllabus.degreeLevel}
            </span>
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Semester: {subject?.semester ? (String(subject.semester).toLowerCase().startsWith('semester') ? subject.semester : `Semester ${subject.semester}`) : 'Semester 1'}
            </span>
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Credits: {syllabus.credits}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {syllabus.name}
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl font-normal">
            Detailed course syllabus, Learning Outcomes (CLO/ABET), 60-session schedule, and assessment scheme.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-300 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-brand-400" />
              <span>Time Allocation: <strong className="text-white font-semibold">{syllabus.timeAllocation}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Award size={16} className="text-emerald-400" />
              <span>Prerequisites: <strong className="text-white font-semibold">{syllabus.prerequisites}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ListOrdered size={16} className="text-purple-400" />
              <span>Total Sessions: <strong className="text-white font-semibold">{syllabus.sessions.length} sessions</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pill Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-2 bg-white dark:bg-[#151821] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs w-fit">
        <button
          onClick={() => setActiveTab('syllabus')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'syllabus'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText size={16} /> 📄 Syllabus Overview
        </button>

        <button
          onClick={() => setActiveTab('clos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'clos'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck size={16} /> 🎯 CLO List ({syllabus.clos.length})
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'sessions'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar size={16} /> 📅 60-Session Schedule ({syllabus.sessions.length})
        </button>

        <button
          onClick={() => setActiveTab('assessment')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'assessment'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award size={16} /> 📊 Assessment Scheme ({syllabus.assessments.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'syllabus' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-extrabold text-lg">
                <FileText className="text-brand-500" size={20} />
                <h3>Course Description</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                {syllabus.description}
              </p>
            </div>

            {/* ABET Course Learning Outcomes Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-extrabold text-lg">
                  <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
                  <h3>Course Learning Outcomes (ABET)</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">Upon completing the course</span>
              </div>

              <div className="space-y-6">
                {syllabus.learningOutcomes.map((section: any, idx: number) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {section.category}
                      </h4>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold rounded">
                        {section.code}
                      </span>
                    </div>

                    <ul className="space-y-2 pl-1">
                      {section.items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Tasks Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-extrabold text-lg">
                <Check className="text-emerald-500" size={20} />
                <h3>Student Tasks</h3>
              </div>
              <div className="space-y-3">
                {syllabus.studentTasksList.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {task}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (1/3 width) */}
          <div className="space-y-6">
            {/* Tools Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-extrabold text-base">
                  <Wrench className="text-amber-500" size={18} />
                  <h3>Tools & Software</h3>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {syllabus.tools.map((t: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
                    <Key size={14} className="text-amber-500 shrink-0" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment Summary Box */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-extrabold text-base">
                  <Award className="text-indigo-500" size={18} />
                  <h3>Assessment Weight Distribution</h3>
                </div>
                <button onClick={() => setActiveTab('assessment')} className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">
                  View Details
                </button>
              </div>
              <div className="space-y-2.5">
                {syllabus.assessments.map((a: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{a.category}</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded-lg">
                      {a.weightPercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLOS */}
      {activeTab === 'clos' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="text-brand-500" size={20} />
                Course Learning Outcomes (CLO List)
              </h3>
              <span className="text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-950 px-3 py-1 rounded-full">
                Total: {syllabus.clos.length} CLOs
              </span>
            </div>

            {/* Stacked vertical cards */}
            <div className="space-y-4">
              {syllabus.clos.map((clo: any, idx: number) => (
                <div key={idx} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 hover:border-brand-500 transition-all shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-brand-600 text-white uppercase tracking-wider">
                      {clo.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                      {clo.loDetails || clo.code.replace('CLO', 'LO')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {clo.details}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: 60 SESSIONS SCHEDULE */}
      {activeTab === 'sessions' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="text-brand-500" size={20} />
                60-Session Teaching Schedule
              </h3>
              <p className="text-xs text-slate-500 mt-1">Complete session list with lecture topics, delivery types, and student tasks.</p>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search session, topic..."
                value={sessionSearch}
                onChange={e => setSessionSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-16 text-center">Session</th>
                  <th className="p-3">Topic / Lesson Content</th>
                  <th className="p-3 w-24 text-center">Type</th>
                  <th className="p-3 w-24 text-center">CLO</th>
                  <th className="p-3 w-16 text-center">ITU</th>
                  <th className="p-3">Student Tasks</th>
                  <th className="p-3 w-36 text-center">Materials & Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
                {filteredSessions.map((session: any, idx: number) => (
                  <tr key={`session-${session.sessionNo}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 text-center font-extrabold text-brand-600 dark:text-brand-400 bg-slate-50/50 dark:bg-slate-900/20">
                      #{session.sessionNo}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {session.topic}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        session.type === 'Online' 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : session.type === 'Offline'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {session.type}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        {session.clo}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                      {session.itu}
                    </td>
                    <td className="p-3 leading-relaxed">
                      {session.studentTasks || 'N/A'}
                    </td>
                    <td className="p-3 text-center">
                      {session.materialsDownloadUrl ? (
                        <button
                          onClick={() => handleDownload(
                            session.materialsDownloadUrl!,
                            session.sDownload || 'download',
                            session.sessionNo
                          )}
                          disabled={downloadingSession === session.sessionNo}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 hover:bg-brand-100 font-bold transition-all text-xs disabled:opacity-60 disabled:cursor-wait"
                        >
                          {downloadingSession === session.sessionNo
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Download size={14} />
                          }
                          {session.sDownload || 'Slide PDF'}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Textbook</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ASSESSMENT SCHEME */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Award className="text-brand-500" size={20} />
                Assessment Scheme & Weight Distribution
              </h3>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full">
                Total: {syllabus.totalAssessmentWeight.toFixed(1)}%
              </span>
            </div>

            {/* Individual Progress Bars */}
            <div className="space-y-5">
              {syllabus.assessments.map((a: any, idx: number) => {
                const colors = [
                  { bg: 'bg-brand-500', text: 'text-brand-600 dark:text-brand-400' },
                  { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                  { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
                  { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
                  { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
                ]
                const color = colors[idx % colors.length]
                return (
                  <div key={idx} className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{a.category}</span>
                      <span className={`font-extrabold text-sm ${color.text}`}>{a.weightPercent}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color.bg} transition-all duration-500 rounded-full`}
                        style={{ width: `${a.weightPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dynamic Cumulative Total Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm font-extrabold text-slate-800 dark:text-slate-100">
                <span>Total Assessment Weight</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-base">{syllabus.totalAssessmentWeight.toFixed(1)}%</span>
              </div>
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                {syllabus.assessments.map((a: any, idx: number) => {
                  const colors = ['bg-brand-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500']
                  return (
                    <div
                      key={idx}
                      className={`h-full ${colors[idx % colors.length]}`}
                      style={{ width: `${a.weightPercent}%` }}
                      title={`${a.category}: ${a.weightPercent}%`}
                    />
                  )
                })}
              </div>

              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                <Check size={14} strokeWidth={3} /> Achieved {syllabus.totalAssessmentWeight.toFixed(1)}% total assessment weight according to curriculum standard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
