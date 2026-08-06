import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { gradingApi as api, api as mainApi } from '@/lib/api';
import type { PublishedAssignment } from '@/types';
import {
  ListTodo, Plus, Search, Filter, Calendar, Clock,
  Users, Code, Globe, Cpu, FileText,
  ChevronRight, ChevronLeft, LayoutGrid, Trash2, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SemesterSelector } from '@/components/ui/SemesterSelector';

/**
 * Tab sentinels. They are grouping keys and sort markers, not display text, so
 * they stay language-independent and are translated only where they are rendered.
 */
const TAB_ALL = 'All';
const TAB_OTHER = 'Other';

// -- Helpers --
const getProjectTypeInfo = (type: string = '') => {
  const t = type.toLowerCase();
  if (t.includes('mobile')) return { icon: Code, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-600', lightBg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800', tag: 'MOBILE' };
  if (t.includes('web') || t.includes('frontend')) return { icon: Globe, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', tag: 'WEB' };
  if (t.includes('ai') || t.includes('algorithm')) return { icon: Cpu, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', lightBg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800', tag: 'AI & DATA' };
  if (t.includes('backend')) return { icon: LayoutGrid, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800', tag: 'BACKEND' };
  if (t.includes('fullstack')) return { icon: LayoutGrid, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-600', lightBg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800', tag: 'FULLSTACK' };
  return { icon: FileText, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-400', lightBg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', tag: 'OTHER' };
};

// -- Components --
const CircularProgress = ({ value }: { value: number }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  let strokeColor = 'text-blue-600 dark:text-blue-400';
  if (value >= 90) strokeColor = 'text-emerald-500 dark:text-emerald-400';
  else if (value < 50) strokeColor = 'text-amber-500 dark:text-amber-400';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-14 h-14 transform -rotate-90">
        <circle className="text-slate-100 dark:text-slate-700/50" strokeWidth="3.5" stroke="currentColor" fill="transparent" r={radius} cx="28" cy="28" />
        <circle
          className={`${strokeColor} transition-all duration-1000 ease-out`}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="28"
          cy="28"
        />
      </svg>
      <span className="absolute text-[12px] font-bold text-slate-700 dark:text-slate-300">{value}%</span>
    </div>
  );
};

export default function AssignmentsListPage() {
  const [assignments, setAssignments] = useState<PublishedAssignment[]>([]);
  const [rawClasses, setRawClasses] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(TAB_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const navigate = useNavigate();
  const { t } = useTranslation();

  const [deletingAssignment, setDeletingAssignment] = useState<PublishedAssignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;
    try {
      setIsDeleting(true);
      await api.deleteAssignment(deletingAssignment.id);
      setAssignments(prev => prev.filter(a => a.id !== deletingAssignment.id));
      setDeletingAssignment(null);
    } catch (err: any) {
      alert(err.message || t('lc.al.delete_failed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentsData, classesData] = await Promise.all([
        api.getAssignments(),
        mainApi.getClasses(1, 1000)
      ]);
      setAssignments(assignmentsData || []);
      setRawClasses(classesData || []);
    } catch (err: any) {
      setError(err.message || t('lc.al.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Get subjects taught by lecturer in the selectedSemester
  const semesterSubjects = useMemo(() => {
    const subs = new Set<string>();
    rawClasses.forEach((c: any) => {
      const semLabel = (c.semester?.season || c.semester?.label || c.semester?.code || '').toUpperCase().replace(/\s+/g, '');
      const semId = c.semester?.id;
      if (!selectedSemester || semLabel === selectedSemester || semId === selectedSemester) {
        const code = c.subject?.code;
        if (code) subs.add(code);
      }
    });
    return Array.from(subs).sort();
  }, [rawClasses, selectedSemester]);

  // 2. Filter assignments by selectedSemester
  const semesterAssignments = useMemo(() => {
    if (!selectedSemester) return assignments;

    return assignments.filter(a => {
      const meta = a.metadata as any;

      // Check if assignment has classIds linked to rawClasses in selectedSemester
      const classIds = meta?.classIds || (a as any).classIds || (a as any).classes || [];
      if (Array.isArray(classIds) && classIds.length > 0 && rawClasses.length > 0) {
        const isMatch = classIds.some((cId: string) => {
          const cls = rawClasses.find(c => c.id === cId || c.classId === cId);
          if (!cls?.semester) return false;
          const cSemLabel = (cls.semester.season || cls.semester.label || cls.semester.code || '').toUpperCase().replace(/\s+/g, '');
          return cSemLabel === selectedSemester || cls.semester.id === selectedSemester;
        });
        if (isMatch) return true;
      }

      // Check if assignment metadata has semester matching selectedSemester
      const metaSem = meta?.semesterLabel || meta?.semesterSeason || meta?.semester || meta?.semesterId;
      if (metaSem) {
        const cleanMetaSem = String(metaSem).toUpperCase().replace(/\s+/g, '');
        if (cleanMetaSem === selectedSemester) return true;
      }

      // Fallback: match by subject taught in that semester
      const sub = meta?.subject || (a as any).subjectCode || (a as any).subject;
      if (sub && semesterSubjects.includes(sub)) {
        return true;
      }

      return false;
    });
  }, [assignments, selectedSemester, rawClasses, semesterSubjects]);

  // Derive Tabs from subjects in selectedSemester
  const tabs = useMemo(() => {
    const counts: Record<string, number> = { [TAB_ALL]: semesterAssignments.length };

    // Initialize subjects of this semester to 0
    semesterSubjects.forEach(sub => {
      counts[sub] = 0;
    });

    // Count assignments per subject in selectedSemester
    semesterAssignments.forEach(a => {
      const sub = (a.metadata as any)?.subject;
      if (sub) {
        if (counts[sub] !== undefined) {
          counts[sub]++;
        } else {
          counts[sub] = 1;
        }
      } else {
        counts[TAB_OTHER] = (counts[TAB_OTHER] || 0) + 1;
      }
    });

    // Sort logic to ensure 'All' is first, 'Other' is last
    return Object.entries(counts).sort((a, b) => {
      if (a[0] === TAB_ALL) return -1;
      if (b[0] === TAB_ALL) return 1;
      if (a[0] === TAB_OTHER) return 1;
      if (b[0] === TAB_OTHER) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [semesterAssignments, semesterSubjects]);

  // Reset activeTab if selected subject is no longer in current semester
  useEffect(() => {
    if (activeTab !== TAB_ALL && !semesterSubjects.includes(activeTab) && activeTab !== TAB_OTHER) {
      setActiveTab(TAB_ALL);
    }
  }, [selectedSemester, semesterSubjects, activeTab]);

  // Filtering
  const filteredAssignments = useMemo(() => {
    return semesterAssignments.filter(a => {
      // Tab filter
      const sub = (a.metadata as any)?.subject || TAB_OTHER;

      if (activeTab !== TAB_ALL && sub !== activeTab) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = (a.metadata?.title || '').toLowerCase();
        const desc = (a.metadata?.description || '').toLowerCase();
        if (!title.includes(query) && !desc.includes(query)) return false;
      }

      return true;
    });
  }, [semesterAssignments, activeTab, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const paginatedAssignments = filteredAssignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page if filtered results are fewer than current page
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  return (
    <div className="max-w-[1200px] mx-auto pt-2 pb-8 px-6 lg:px-8 bg-transparent relative">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-brand-200/50 dark:border-brand-800/50">
            <ListTodo size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white text-slate-900">{t('lc.al.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{t('lc.al.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SemesterSelector
            selectedSemester={selectedSemester}
            onChange={setSelectedSemester}
          />
          <button
            onClick={() => navigate('/lecturer/grading/assignments/upload')}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap self-end sm:self-auto"
          >
            <Plus size={18} />
            {t('lc.al.new_assignment')}
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="relative w-full md:w-64">
          <select className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-10 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium text-sm">
            <option>{t('lc.al.all_subjects')}</option>
          </select>
          <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronRight size={16} className="rotate-90" />
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('lc.al.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        {tabs.map(([name, count]) => {
          const isActive = activeTab === name;
          return (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              {name === TAB_ALL ? t('lc.al.tab_all') : name === TAB_OTHER ? t('lc.al.tab_other') : name}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error / Empty State */}
      {error && (
        <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500">
          {error}
        </div>
      )}

      {!loading && filteredAssignments.length === 0 && !error && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
          <ListTodo size={48} className="mx-auto mb-4 dark:text-slate-600 text-slate-300" />
          <h3 className="text-xl font-medium dark:text-slate-300 text-slate-600 mb-2">{t('lc.al.none_found')}</h3>
          <p className="dark:text-slate-500 text-slate-400 text-sm">{t('lc.al.none_hint')}</p>
        </div>
      )}

      {/* List Layout */}
      <div className="space-y-4 mb-8">
        {paginatedAssignments.map(assignment => {
          const typeInfo = getProjectTypeInfo(assignment.metadata?.projectType);
          const Icon = typeInfo.icon;
          const stats = (assignment as any).stats || {
            totalStudents: 0,
            submitted: 0,
            percentage: 0,
            createdAt: (assignment as any).createdAt || new Date(),
            dueDate: null
          };

          const createdStr = new Date(stats.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const deadlineStr = stats.dueDate
            ? new Date(stats.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : t('lc.al.not_set');

          return (
            <div
              key={assignment.id}
              onClick={() => navigate(`/lecturer/grading/assignments/${assignment.id}`)}
              className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-5 relative cursor-pointer"
            >
              {/* Left: Icon Block */}
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.bg} text-white shadow-sm`}>
                <Icon size={28} strokeWidth={2} />
              </div>

              {/* Middle: Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[15px] font-bold text-slate-800 dark:text-white uppercase truncate" title={assignment.metadata?.title || t('lc.al.untitled')}>
                    {assignment.metadata?.title || t('lc.al.untitled')}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeInfo.lightBg} ${typeInfo.color} ${typeInfo.border} border whitespace-nowrap`}>
                    {typeInfo.tag}
                  </span>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-3 pr-4">
                  {assignment.metadata?.description || t('lc.al.no_description')}
                </p>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{t('lc.al.created', { value: createdStr })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span>{t('lc.al.due', { value: deadlineStr })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-slate-400" />
                    <span>{t('lc.al.students', { n: stats.totalStudents })}</span>
                  </div>
                </div>
              </div>

              {/* Right: Stats & Actions */}
              <div className="flex items-center gap-6 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/50 justify-between md:justify-end md:ml-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-[15px] font-bold text-slate-800 dark:text-white">
                      {stats.submitted}/{stats.totalStudents}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                      {t('lc.al.submitted')}
                    </div>
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <CircularProgress value={stats.percentage} />
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">
                      {t('lc.al.completed')}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingAssignment(assignment);
                  }}
                  className="p-2.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                  title={t('lc.al.delete_title')}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {!loading && filteredAssignments.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('lc.al.showing_prefix')} <span className="font-medium text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredAssignments.length)}</span> {t('lc.al.showing_of')} <span className="font-medium text-slate-700 dark:text-slate-300">{filteredAssignments.length}</span> {t('lc.al.showing_suffix')}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-slate-800 shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors shadow-sm ${currentPage === i + 1
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-slate-800 shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAssignment && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-rose-50/50 to-white dark:from-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('lc.al.del.title')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('lc.al.del.subtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingAssignment(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>
                {t('lc.al.del.body_prefix')} <strong className="text-slate-900 dark:text-white">{deletingAssignment.metadata?.title || t('lc.al.del.assignment_fallback')}</strong>?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-rose-50/60 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40">
                {t('lc.al.del.warning')}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingAssignment(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {t('lc.al.del.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAssignment}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{isDeleting ? t('lc.al.del.deleting') : t('lc.al.del.confirm')}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
