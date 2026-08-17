import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { gradingApi as api, api as mainApi } from '@/lib/api';
import type { PublishedAssignment } from '@/types';
import {
  ListTodo, Plus, Search, Filter, Calendar, Clock,
  Users, Code, Globe, Cpu, FileText,
  ChevronRight, ChevronLeft, LayoutGrid, Trash2, X,
  RotateCcw, AlertTriangle, ArrowLeft, CheckSquare, Square, RefreshCw
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
  const [trashAssignments, setTrashAssignments] = useState<any[]>([]);
  const [rawClasses, setRawClasses] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(TAB_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const navigate = useNavigate();
  const { t } = useTranslation();

  // Soft Delete state
  const [deletingAssignment, setDeletingAssignment] = useState<PublishedAssignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Trash Bin selection & actions state
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
  const [hardDeletingAssignment, setHardDeletingAssignment] = useState<any | null>(null);
  const [isHardDeleting, setIsHardDeleting] = useState(false);
  const [showBulkHardDeleteModal, setShowBulkHardDeleteModal] = useState(false);
  const [isBulkActioning, setIsBulkActioning] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Load active assignments, trash assignments & classes
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentsData, trashData, classesData] = await Promise.all([
        api.getAssignments(),
        api.getTrashAssignments(),
        mainApi.getClasses(1, 1000)
      ]);
      setAssignments(assignmentsData || []);
      setTrashAssignments(trashData || []);
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

  // Soft Delete (move to Trash)
  const handleSoftDeleteAssignment = async () => {
    if (!deletingAssignment) return;
    try {
      setIsDeleting(true);
      await api.deleteAssignment(deletingAssignment.id);
      
      // Move from active list to trash list
      setAssignments(prev => prev.filter(a => a.id !== deletingAssignment.id));
      setTrashAssignments(prev => [
        { ...deletingAssignment, deletedAt: new Date().toISOString() },
        ...prev
      ]);
      setDeletingAssignment(null);
    } catch (err: any) {
      alert(err.message || t('lc.al.delete_failed'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore single assignment from trash
  const handleRestoreAssignment = async (assignment: any) => {
    try {
      setRestoringId(assignment.id);
      await api.restoreAssignment(assignment.id);
      
      // Move from trash list back to active list
      setTrashAssignments(prev => prev.filter(a => a.id !== assignment.id));
      setAssignments(prev => [assignment, ...prev]);
      
      // Clear from selected set if present
      setSelectedTrashIds(prev => {
        const next = new Set(prev);
        next.delete(assignment.id);
        return next;
      });
    } catch (err: any) {
      alert(err.message || 'Failed to restore assignment');
    } finally {
      setRestoringId(null);
    }
  };

  // Hard Delete single assignment from trash
  const handleHardDeleteAssignment = async () => {
    if (!hardDeletingAssignment) return;
    try {
      setIsHardDeleting(true);
      await api.hardDeleteAssignment(hardDeletingAssignment.id);
      
      setTrashAssignments(prev => prev.filter(a => a.id !== hardDeletingAssignment.id));
      setSelectedTrashIds(prev => {
        const next = new Set(prev);
        next.delete(hardDeletingAssignment.id);
        return next;
      });
      setHardDeletingAssignment(null);
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete assignment');
    } finally {
      setIsHardDeleting(false);
    }
  };

  // Bulk Restore selected items in trash
  const handleBulkRestore = async () => {
    const ids = Array.from(selectedTrashIds);
    if (ids.length === 0) return;
    try {
      setIsBulkActioning(true);
      await api.bulkRestoreAssignments(ids);
      
      const restoredItems = trashAssignments.filter(a => selectedTrashIds.has(a.id));
      setTrashAssignments(prev => prev.filter(a => !selectedTrashIds.has(a.id)));
      setAssignments(prev => [...restoredItems, ...prev]);
      setSelectedTrashIds(new Set());
    } catch (err: any) {
      alert(err.message || 'Failed to restore selected assignments');
    } finally {
      setIsBulkActioning(false);
    }
  };

  // Bulk Hard Delete selected items in trash
  const handleBulkHardDelete = async () => {
    const ids = Array.from(selectedTrashIds);
    if (ids.length === 0) return;
    try {
      setIsBulkActioning(true);
      await api.bulkHardDeleteAssignments(ids);
      
      setTrashAssignments(prev => prev.filter(a => !selectedTrashIds.has(a.id)));
      setSelectedTrashIds(new Set());
      setShowBulkHardDeleteModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete selected assignments');
    } finally {
      setIsBulkActioning(false);
    }
  };

  // Toggle trash selection
  const toggleTrashSelection = (id: string) => {
    setSelectedTrashIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all trash selection
  const toggleSelectAllTrash = () => {
    if (selectedTrashIds.size === trashAssignments.length) {
      setSelectedTrashIds(new Set());
    } else {
      setSelectedTrashIds(new Set(trashAssignments.map(a => a.id)));
    }
  };

  // 1. Get all subjects taught by lecturer
  const teacherSubjects = useMemo(() => {
    const subs = new Set<string>();
    rawClasses.forEach((c: any) => {
      const code = c.subject?.code;
      if (code) subs.add(code);
    });
    return Array.from(subs).sort();
  }, [rawClasses]);

  // 2. Filter assignments strictly by selectedSemester
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
        return false;
      }

      // Check if assignment metadata has semester matching selectedSemester
      const metaSem = meta?.semesterLabel || meta?.semesterSeason || meta?.semester || meta?.semesterId || (a as any).semesterId;
      if (metaSem) {
        const cleanMetaSem = String(metaSem).toUpperCase().replace(/\s+/g, '');
        return cleanMetaSem === selectedSemester;
      }

      return false;
    });
  }, [assignments, selectedSemester, rawClasses]);

  // Derive Tabs from subjects taught by lecturer
  const tabs = useMemo(() => {
    const counts: Record<string, number> = { [TAB_ALL]: semesterAssignments.length };

    teacherSubjects.forEach(sub => {
      counts[sub] = 0;
    });

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

    return Object.entries(counts).sort((a, b) => {
      if (a[0] === TAB_ALL) return -1;
      if (b[0] === TAB_ALL) return 1;
      if (a[0] === TAB_OTHER) return 1;
      if (b[0] === TAB_OTHER) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [semesterAssignments, teacherSubjects]);

  // Reset activeTab if selected subject is no longer in teacherSubjects
  useEffect(() => {
    if (activeTab !== TAB_ALL && !teacherSubjects.includes(activeTab) && activeTab !== TAB_OTHER) {
      setActiveTab(TAB_ALL);
    }
  }, [selectedSemester, teacherSubjects, activeTab]);

  // Filtering
  const filteredAssignments = useMemo(() => {
    return semesterAssignments.filter(a => {
      const sub = (a.metadata as any)?.subject || TAB_OTHER;

      if (activeTab !== TAB_ALL && sub !== activeTab) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = (a.metadata?.title || '').toLowerCase();
        const desc = (a.metadata?.description || '').toLowerCase();
        if (!title.includes(query) && !desc.includes(query)) return false;
      }

      return true;
    });
  }, [semesterAssignments, activeTab, searchQuery]);

  // Filtered trash assignments by search query
  const filteredTrashAssignments = useMemo(() => {
    if (!searchQuery) return trashAssignments;
    const query = searchQuery.toLowerCase();
    return trashAssignments.filter(a => {
      const title = (a.metadata?.title || '').toLowerCase();
      const desc = (a.metadata?.description || '').toLowerCase();
      return title.includes(query) || desc.includes(query);
    });
  }, [trashAssignments, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const paginatedAssignments = filteredAssignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  return (
    <div className="max-w-[1200px] mx-auto pt-2 pb-8 px-6 lg:px-8 bg-transparent relative">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-brand-200/50 dark:border-brand-800/50">
            {viewMode === 'trash' ? (
              <Trash2 size={28} className="text-rose-500 dark:text-rose-400" strokeWidth={2.5} />
            ) : (
              <ListTodo size={28} strokeWidth={2.5} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white text-slate-900">
              {viewMode === 'trash' ? 'Assignment Trash Bin' : t('lc.al.title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              {viewMode === 'trash'
                ? 'Manage soft-deleted assignments. You can restore them or permanently delete them.'
                : t('lc.al.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'active' ? (
            <>
              <SemesterSelector
                selectedSemester={selectedSemester}
                onChange={setSelectedSemester}
              />
              <button
                onClick={() => setViewMode('trash')}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 rounded-xl font-medium transition-all shadow-sm whitespace-nowrap"
                title="Open Assignment Trash Bin"
              >
                <Trash2 size={18} />
                <span>Trash Bin</span>
                {trashAssignments.length > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full ml-0.5 animate-in zoom-in duration-200">
                    {trashAssignments.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => navigate('/lecturer/grading/assignments/upload')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap self-end sm:self-auto"
              >
                <Plus size={18} />
                {t('lc.al.new_assignment')}
              </button>
            </>
          ) : (
            <button
              onClick={() => setViewMode('active')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-colors shadow-sm"
            >
              <ArrowLeft size={18} />
              <span>Back to assignments</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE: TRASH BIN */}
      {viewMode === 'trash' ? (
        <div className="space-y-4">

          {/* Trash Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={toggleSelectAllTrash}
                disabled={trashAssignments.length === 0}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-50"
              >
                {selectedTrashIds.size > 0 && selectedTrashIds.size === trashAssignments.length ? (
                  <CheckSquare size={18} className="text-brand-600 dark:text-brand-400" />
                ) : (
                  <Square size={18} className="text-slate-400" />
                )}
                <span>Select All ({trashAssignments.length})</span>
              </button>

              {selectedTrashIds.size > 0 && (
                <span className="text-xs bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-bold px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800">
                  Selected {selectedTrashIds.size}
                </span>
              )}
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                type="button"
                disabled={selectedTrashIds.size === 0 || isBulkActioning}
                onClick={handleBulkRestore}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isBulkActioning ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                <span>Restore selected ({selectedTrashIds.size})</span>
              </button>

              <button
                type="button"
                disabled={selectedTrashIds.size === 0 || isBulkActioning}
                onClick={() => setShowBulkHardDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-rose-600/20"
              >
                <Trash2 size={14} />
                <span>Permanently delete selected ({selectedTrashIds.size})</span>
              </button>
            </div>
          </div>

          {/* Trash Items List */}
          {filteredTrashAssignments.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
              <Trash2 size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-2">Trash bin is empty</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">No soft-deleted assignments found in the system.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrashAssignments.map(assignment => {
                const typeInfo = getProjectTypeInfo(assignment.metadata?.projectType);
                const Icon = typeInfo.icon;
                const isSelected = selectedTrashIds.has(assignment.id);
                const deletedDateStr = assignment.deletedAt
                  ? new Date(assignment.deletedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Unknown';

                return (
                  <div
                    key={assignment.id}
                    className={`bg-white dark:bg-slate-800 border ${isSelected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200 dark:border-slate-700'} rounded-2xl p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center gap-5`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleTrashSelection(assignment.id)}
                      className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors self-start md:self-center"
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="text-brand-600 dark:text-brand-400" />
                      ) : (
                        <Square size={20} className="text-slate-400" />
                      )}
                    </button>

                    {/* Icon Block */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.bg} text-white shadow-sm opacity-80`}>
                      <Icon size={24} strokeWidth={2} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-bold text-slate-800 dark:text-white uppercase truncate" title={assignment.metadata?.title || 'Untitled Assignment'}>
                          {assignment.metadata?.title || 'Untitled Assignment'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeInfo.lightBg} ${typeInfo.color} ${typeInfo.border} border whitespace-nowrap`}>
                          {typeInfo.tag}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                          SOFT DELETED
                        </span>
                      </div>

                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                        {assignment.metadata?.description || 'No description available'}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-1 text-rose-500 dark:text-rose-400">
                          <Trash2 size={13} />
                          <span>Deleted on: {deletedDateStr}</span>
                        </div>
                        {assignment.metadata?.subject && (
                          <div className="flex items-center gap-1">
                            <Code size={13} />
                            <span>Subject: {assignment.metadata.subject}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/50">
                      <button
                        type="button"
                        disabled={restoringId === assignment.id}
                        onClick={() => handleRestoreAssignment(assignment)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        title="Restore to main list"
                      >
                        {restoringId === assignment.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <RotateCcw size={14} />
                        )}
                        <span>Restore</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHardDeletingAssignment(assignment)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold transition-all shadow-sm"
                        title="Permanently delete from database"
                      >
                        <Trash2 size={14} />
                        <span>Permanently delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE: ACTIVE ASSIGNMENTS */
        <>
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

              const createdStr = new Date(stats.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
              const deadlineStr = stats.dueDate
                ? new Date(stats.dueDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

                    {/* Soft Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingAssignment(assignment);
                      }}
                      className="p-2.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                      title="Move assignment to Trash bin"
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
        </>
      )}

      {/* 1. SOFT DELETE CONFIRMATION MODAL */}
      {deletingAssignment && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-amber-50/50 to-white dark:from-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Move to Trash Bin</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Soft-delete this assignment</p>
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
                Are you sure you want to move assignment <strong className="text-slate-900 dark:text-white">{deletingAssignment.metadata?.title || 'this item'}</strong> to the Trash bin?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-amber-50/60 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40">
                Soft-deleted assignments will be hidden from the Student Portal and main list. You can visit the <strong>Trash bin</strong> to restore this assignment at any time.
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSoftDeleteAssignment}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{isDeleting ? 'Moving...' : 'Move to Trash'}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 2. SINGLE HARD DELETE CONFIRMATION MODAL */}
      {hardDeletingAssignment && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-rose-200/80 dark:border-rose-900/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="px-6 py-4 border-b border-rose-100 dark:border-rose-900/40 bg-gradient-to-r from-rose-50 to-white dark:from-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Permanently Delete Assignment</h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Warning: Action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setHardDeletingAssignment(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>
                Are you sure you want to <strong className="text-rose-600 dark:text-rose-400">PERMANENTLY DELETE</strong> assignment <strong className="text-slate-900 dark:text-white">{hardDeletingAssignment.metadata?.title || 'this item'}</strong>?
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed bg-rose-50 dark:bg-rose-950/50 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60">
                All assignment data, blueprint, rubric, and student submissions will be <strong>HARD DELETED from the database</strong> permanently and cannot be recovered!
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setHardDeletingAssignment(null)}
                disabled={isHardDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleHardDeleteAssignment}
                disabled={isHardDeleting}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/25 transition-all disabled:opacity-50"
              >
                {isHardDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{isHardDeleting ? 'Deleting...' : 'Permanently delete'}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 3. BULK HARD DELETE CONFIRMATION MODAL */}
      {showBulkHardDeleteModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-rose-200/80 dark:border-rose-900/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="px-6 py-4 border-b border-rose-100 dark:border-rose-900/40 bg-gradient-to-r from-rose-50 to-white dark:from-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Permanently Delete Multiple Assignments</h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Warning: Action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkHardDeleteModal(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>
                Are you sure you want to <strong className="text-rose-600 dark:text-rose-400">PERMANENTLY DELETE {selectedTrashIds.size} SELECTED ASSIGNMENTS</strong>?
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed bg-rose-50 dark:bg-rose-950/50 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60">
                All data for these {selectedTrashIds.size} assignments and associated submission histories will be <strong>HARD DELETED from the database</strong> permanently!
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkHardDeleteModal(false)}
                disabled={isBulkActioning}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkHardDelete}
                disabled={isBulkActioning}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/25 transition-all disabled:opacity-50"
              >
                {isBulkActioning ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{isBulkActioning ? 'Deleting...' : `Permanently delete ${selectedTrashIds.size} items`}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
