import React, { useState, useEffect, useRef } from 'react';
import { gradingApi as api, getStoredItem, AUTH_STORAGE_KEYS } from '@/lib/api';
import type { PublishedAssignment } from '@/types';
import { BookOpen, ListChecks, Upload, Layers, Clock, AlertCircle, Users, CheckCircle2, Hourglass, Star, Eye, ArrowLeft, Save, X, Calendar, ChevronDown, ChevronLeft, ChevronRight, Settings, Zap, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import classNames from 'classnames';

function CustomSelect({ value, onChange, options, className, label }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[], className?: string, label?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm font-medium text-slate-500 dark:text-slate-400 shrink-0">{label}</span>}
      <div className="relative inline-block" ref={ref}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={classNames(
            "flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-sm min-w-[140px]",
            className
          )}
        >
          <span className="truncate">{selectedOption?.label}</span>
          <ChevronDown size={16} className={classNames("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 left-0 w-full min-w-max bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-[0_4px_20px_rgb(0,0,0,0.1)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={classNames(
                    "w-full text-left px-3 py-2 text-sm transition-colors block whitespace-nowrap",
                    value === opt.value
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<PublishedAssignment | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasActiveBatch, setHasActiveBatch] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [deadlineModalError, setDeadlineModalError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isGradingSettingsModalOpen, setIsGradingSettingsModalOpen] = useState(false);
  const [selectedGradingStrategy, setSelectedGradingStrategy] = useState<'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE'>('CONTINUOUS_QUEUE');
  const [savingStrategy, setSavingStrategy] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('score_desc');
  const [classFilter, setClassFilter] = useState('ALL');
  const [classList, setClassList] = useState<{ id: string, className: string, classCode: string }[]>([]);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);



  const fetchAssignmentData = React.useCallback(async () => {
    try {
      const data = await api.getAssignment(id || 'student-management-system');
      setAssignment(data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchHistoryData = React.useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res: any = await api.getHistory(id || 'student-management-system', page, limit, debouncedSearch, statusFilter, scoreRangeFilter, sortOrder, classFilter);
      setHistory(res.history || []);
      if (res.classes && Array.isArray(res.classes)) {
        setClassList(res.classes);
      }
      if (res.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalItems(res.meta.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id, page, limit, debouncedSearch, statusFilter, scoreRangeFilter, sortOrder, classFilter]);

  useEffect(() => {
    fetchAssignmentData();
  }, [fetchAssignmentData]);

  useEffect(() => {
    fetchHistoryData(true);
  }, [fetchHistoryData]);

  // Pure Event-Driven SSE Push & Real-Time Event Listener (0 Polling / $0 Cost / Standard Web Architecture)
  useEffect(() => {
    if (!id) return;

    let eventSource: EventSource | null = null;
    try {
      const token = getStoredItem(AUTH_STORAGE_KEYS.token);
      const sseUrl = `/api/grading/assignments/${id}/events?token=${token}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SUBMISSION_CREATED' || data.type === 'SUBMISSION_GRADED') {
            console.log('[AssignmentPage] Server Pushed Assignment Event:', data);
            fetchAssignmentData();
            fetchHistoryData(false);
          }
        } catch (err) {}
      };
    } catch (e) {
      console.warn('Failed to initialize SSE assignment event stream:', e);
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('aita_submission_events');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SUBMISSION_CREATED' || event.data?.type === 'SUBMISSION_PUBLISHED' || event.data?.assignmentId === id) {
          fetchAssignmentData();
          fetchHistoryData(false);
        }
      };
    } catch (e) { }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'aita_submission_event' || e.key === 'aita_last_publish_event') {
        fetchAssignmentData();
        fetchHistoryData(false);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (eventSource) eventSource.close();
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [id, fetchAssignmentData, fetchHistoryData]);

  useEffect(() => {
    const checkBatch = () => {
      const jobsKey = id ? `batchJobs_${id}` : 'batchJobs';
      const savedJobs = localStorage.getItem(jobsKey);
      if (savedJobs) {
        try {
          const parsed = JSON.parse(savedJobs);
          setHasActiveBatch(parsed && parsed.length > 0);
        } catch (e) {
          setHasActiveBatch(false);
        }
      } else {
        setHasActiveBatch(false);
      }
    };

    checkBatch();
    window.addEventListener('storage', checkBatch);

    return () => {
      window.removeEventListener('storage', checkBatch);
    };
  }, [id]);

  const confirmDelete = async () => {
    if (!deleteModalId) return;
    try {
      if (deleteModalId === 'BULK') {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map(subId => api.deleteHistory(subId)));
        setSelectedIds(new Set());
      } else {
        await api.deleteHistory(deleteModalId);
      }
      setDeleteModalId(null);
      const res: any = await api.getHistory(id || 'student-management-system', page, limit, debouncedSearch, statusFilter, scoreRangeFilter, sortOrder, classFilter);
      setHistory(res.history || []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalItems(res.meta.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to delete history', err);
      setError('Failed to delete the grading result');
    }
  };

  const handleGradeSubmission = async (e: React.MouseEvent, submissionId: string) => {
    e.stopPropagation();
    try {
      const res = await api.gradeExistingSubmission(submissionId);
      // Immediately navigate to live grading page
      navigate(`/lecturer/grading/live/${res.submissionId}?assignmentId=${id || ''}`);
    } catch (err) {
      console.error("Failed to grade submission", err);
      setError("Failed to start grading process.");
    }
  };

  const handleGradeAll = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.gradeExistingBatch(id);
      if (res.jobs && res.jobs.length > 0) {
        // Format jobs and save to localStorage for BatchDashboard
        const newJobs = res.jobs.map((job: any) => ({
          id: job.submissionId,
          studentName: job.studentName,
          fileName: job.fileName,
          state: 'queued' as const,
          progressPercent: 0,
          currentTask: 'Waiting in queue...'
        }));

        const jobsKey = `batchJobs_${id}`;
        const startKey = `batchStartTime_${id}`;

        // Append to existing jobs or create new
        const existingJobsStr = localStorage.getItem(jobsKey);
        let existingJobs = [];
        if (existingJobsStr) {
          try { existingJobs = JSON.parse(existingJobsStr); } catch (e) { }
        }

        const combinedJobs = [...existingJobs, ...newJobs];
        localStorage.setItem(jobsKey, JSON.stringify(combinedJobs));

        if (!localStorage.getItem(startKey)) {
          localStorage.setItem(startKey, Date.now().toString());
        }

        navigate(`/lecturer/grading/assignments/${id}/submit`);
      } else {
        setError("No submissions are eligible for grading (not submitted, or already graded).");
      }
    } catch (err) {
      console.error("Failed to batch grade", err);
      setError("Failed to start batch grading process.");
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSelected = async () => {
    if (!id || selectedIds.size === 0) return;
    try {
      setLoading(true);
      setError(null);
      const submissionIds = Array.from(selectedIds);
      const res = await api.gradeSelectedBatch(id, submissionIds);
      if (res.jobs && res.jobs.length > 0) {
        // Format jobs and save to localStorage for BatchDashboard
        const newJobs = res.jobs.map((job: any) => ({
          id: job.submissionId,
          studentName: job.studentName,
          fileName: job.fileName,
          state: 'queued' as const,
          progressPercent: 0,
          currentTask: 'Waiting in queue...'
        }));

        const jobsKey = `batchJobs_${id}`;
        const startKey = `batchStartTime_${id}`;

        // Append to existing jobs or create new
        const existingJobsStr = localStorage.getItem(jobsKey);
        let existingJobs = [];
        if (existingJobsStr) {
          try { existingJobs = JSON.parse(existingJobsStr); } catch (e) { }
        }

        const combinedJobs = [...existingJobs, ...newJobs];
        localStorage.setItem(jobsKey, JSON.stringify(combinedJobs));

        if (!localStorage.getItem(startKey)) {
          localStorage.setItem(startKey, Date.now().toString());
        }

        navigate(`/lecturer/grading/assignments/${id}/submit`);
      } else {
        setError("None of the selected students have a submission eligible for grading.");
      }
    } catch (err) {
      console.error("Failed to grade selected", err);
      setError("Failed to start grading process for selected students.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(history.map(h => h.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleRowClick = (item: any) => {
    if (item.status === 'Graded') {
      navigate(`/lecturer/grading/result/${item.id}`);
    } else if (item.status === 'Submitted') {
      setError(`Sinh viên ${item.studentName || item.studentCode || item.studentId} has submitted but has no grading result yet. Press "Grade".`);
      setTimeout(() => setError(null), 4000);
    } else if (item.status === 'Grading') {
      navigate(`/lecturer/grading/live/${item.id}?assignmentId=${id || ''}`);
    } else {
      setError(`Sinh viên ${item.studentName || item.studentCode || item.studentId} has not submitted, so there is nothing to show.`);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleViewHistory = (historyId: string) => {
    navigate(`/lecturer/grading/result/${historyId}`);
  };

  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const handleOpenDeadlineModal = () => {
    setDeadlineModalError(null);
    const statsDueDate = (assignment as any)?.stats?.dueDate;
    let initialDate = new Date();
    if (statsDueDate) {
      initialDate = new Date(statsDueDate);
    } else {
      initialDate.setDate(initialDate.getDate() + 7);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    setNewDueDate(`${initialDate.getFullYear()}-${pad(initialDate.getMonth() + 1)}-${pad(initialDate.getDate())}T${pad(initialDate.getHours())}:${pad(initialDate.getMinutes())}`);
    setCalendarMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    setIsDeadlineModalOpen(true);
  };

  const handleApplyPreset = (daysToAdd: number) => {
    const baseDate = (assignment as any)?.stats?.dueDate ? new Date((assignment as any).stats.dueDate) : new Date();
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    targetDate.setHours(23, 59, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setNewDueDate(`${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`);
    setCalendarMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
  };

  const handleSaveDeadline = async () => {
    if (newDueDate) {
      const startDate = (assignment as any)?.stats?.createdAt;
      if (startDate && new Date(newDueDate) < new Date(startDate)) {
        setDeadlineModalError("The due date cannot be earlier than the assignment creation date.");
        return;
      }
    }
    setDeadlineModalError(null);

    try {
      setSavingDeadline(true);
      const updatedIso = newDueDate ? new Date(newDueDate).toISOString() : null;
      await api.updateAssignment(id!, {
        title: assignment?.metadata?.title,
        description: assignment?.metadata?.description,
        dueDate: updatedIso
      });
      const data = await api.getAssignment(id!);
      setAssignment(data);
      setIsDeadlineModalOpen(false);

      // Real-time broadcast to student pages
      try {
        const channel = new BroadcastChannel('aita_assignment_updates');
        channel.postMessage({ type: 'ASSIGNMENT_DEADLINE_UPDATED', id: id!, dueDate: updatedIso, timestamp: Date.now() });
        channel.close();
      } catch (e) { }

      try {
        localStorage.setItem('aita_last_assignment_update', JSON.stringify({
          id: id!,
          dueDate: updatedIso,
          timestamp: Date.now()
        }));
      } catch (e) { }

      window.dispatchEvent(new CustomEvent('aita_assignment_updated', {
        detail: { id: id!, dueDate: updatedIso }
      }));
    } catch (err: any) {
      console.error(err);
      setDeadlineModalError(err.message || "Failed to update the due date.");
    } finally {
      setSavingDeadline(false);
    }
  };

  useEffect(() => {
    if (assignment) {
      const strat = (assignment as any)?.metadata?.gradingStrategy || (assignment as any)?.stats?.gradingStrategy || 'CONTINUOUS_QUEUE';
      setSelectedGradingStrategy(strat);
    }
  }, [assignment]);

  const handleSaveGradingStrategy = async (strategy: 'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE') => {
    try {
      setSavingStrategy(true);
      await api.updateAssignment(id!, {
        title: assignment?.metadata?.title,
        description: assignment?.metadata?.description,
        dueDate: (assignment as any)?.stats?.dueDate || (assignment as any)?.metadata?.dueDate,
        gradingStrategy: strategy
      });
      setSelectedGradingStrategy(strategy);
      const data = await api.getAssignment(id!);
      setAssignment(data);
      setIsGradingSettingsModalOpen(false);
    } catch (err: any) {
      // Previously this only console.error'd: a failed save looked identical to a
      // successful one, so the lecturer believed the strategy had been applied.
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Could not save the grading strategy. Please try again.');
    } finally {
      setSavingStrategy(false);
    }
  };

  // Calendar helpers for embedded modal calendar
  const selectedDateObj = newDueDate ? new Date(newDueDate) : null;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handlePrevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

  const daysInMonthCalc = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstDayCalc = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const totalSlotsCalc = Math.ceil((firstDayCalc + daysInMonthCalc) / 7) * 7;
  const daysList = Array.from({ length: totalSlotsCalc }, (_, i) => {
    const day = i - firstDayCalc + 1;
    if (day <= 0 || day > daysInMonthCalc) return null;
    return day;
  });

  const handleCalendarDaySelect = (day: number) => {
    const target = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day, 23, 59, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setNewDueDate(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  if (loading && !assignment) return <div className="text-center py-20 text-slate-400">Loading assignment...</div>;
  if (!assignment) return <div className="text-center py-20 text-red-400">Assignment not found</div>;

  return (
    <div className="max-w-6xl mx-auto pb-2 -mt-2 sm:-mt-4">
      <div className="mb-6 animate-fade-in">
        <button onClick={() => navigate(`/lecturer/grading/assignments`)} className="text-slate-400 hover:text-brand-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium">
          <ArrowLeft size={20} />
          Back to assignments
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 shadow-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm mb-8 relative z-10">
        <div className="p-6 border-b dark:border-slate-800 border-slate-100 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-400 mb-2">
              <BookOpen size={20} />
              <span className="font-semibold uppercase tracking-wider text-sm">Assignment details</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/lecturer/grading/assignments/${id}/rubric`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors shadow-sm text-base"
              >
                <ListChecks size={20} />
                Review rubric
              </button>
              <button
                onClick={() => navigate(`/lecturer/grading/assignments/${id}/submit`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors shadow-sm text-base"
              >
                <Upload size={20} />
                Upload file (Manual)
              </button>
              <button
                onClick={hasActiveBatch ? () => navigate(`/lecturer/grading/assignments/${id}/submit`) : handleGradeAll}
                className={classNames(
                  "flex items-center gap-2 px-7 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-white text-base",
                  hasActiveBatch ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-brand-600 hover:bg-brand-700"
                )}
              >
                {hasActiveBatch ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                    Live grading status
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Grade all
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold dark:text-white text-slate-900">{assignment.metadata?.title || 'Assignment'}</h1>
          </div>

          {assignment.metadata?.projectType && (
            <div className="flex flex-wrap items-center gap-2.5 mt-3 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-sm font-bold rounded-full border border-brand-200 dark:border-brand-500/20 shadow-sm">
                <Layers size={16} />
                <span className="uppercase tracking-wider">{assignment.metadata.projectType}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-3">
            <ListChecks size={22} className="text-brand-500" />
            <h2 className="text-xl font-semibold dark:text-white text-slate-800">Details</h2>
          </div>
          <div className="space-y-4">
            {assignment.metadata?.description ? (
              <p className="dark:text-slate-300 text-slate-600 text-base leading-relaxed whitespace-pre-wrap">
                {assignment.metadata.description}
              </p>
            ) : (
              <p className="dark:text-slate-500 text-slate-400 italic">No description provided.</p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4">
              <div className="flex items-center gap-2.5 text-base font-medium text-slate-700 dark:text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <span>
                  Due:{' '}
                  <strong className="text-brand-600 dark:text-brand-400 font-bold ml-1">
                    {(assignment as any)?.stats?.dueDate
                      ? `${new Date((assignment as any).stats.dueDate).toLocaleDateString('vi-VN')} ${new Date((assignment as any).stats.dueDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Not set'}
                  </strong>
                </span>
              </div>

              <button
                onClick={handleOpenDeadlineModal}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl text-sm font-semibold transition-all border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 shadow-sm whitespace-nowrap"
              >
                <Clock size={16} className="text-brand-500" />
                <span>Adjust due date</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {(() => {
        const stats = (assignment as any).stats || {
          totalStudents: 0,
          submitted: 0,
          notSubmitted: 0,
          grading: 0,
          averageScore: 0,
          submittedPercentage: 0,
          notSubmittedPercentage: 0,
          gradingPercentage: 0
        };

        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.totalStudents}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Students <br /><span className="font-normal opacity-80">Total</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.submitted}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Submitted <br /><span className="font-normal opacity-80">{stats.submittedPercentage}%</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.notSubmitted}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Not submitted <br /><span className="font-normal opacity-80">{stats.notSubmittedPercentage}%</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Hourglass size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.grading}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Grading <br /><span className="font-normal opacity-80">{stats.gradingPercentage}%</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Star size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.averageScore}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Average score <br /><span className="font-normal opacity-80">/10</span></div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search students or student IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-4">
            <CustomSelect
              label="Status:"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All' },
                { value: 'NotSubmitted', label: 'Not submitted' },
                { value: 'Submitted', label: 'Submitted' },
                { value: 'Grading', label: 'Grading' },
                { value: 'Graded', label: 'Graded' }
              ]}
            />
            <CustomSelect
              label="Score range:"
              value={scoreRangeFilter}
              onChange={setScoreRangeFilter}
              options={[
                { value: 'ALL', label: 'All' },
                { value: '9-10', label: '9 - 10' },
                { value: '8-9', label: '8 - 8.9' },
                { value: '7-8', label: '7 - 7.9' },
                { value: '5-7', label: '5 - 6.9' },
                { value: '<5', label: 'Below 5' }
              ]}
            />
            <CustomSelect
              label="Sort:"
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: 'score_desc', label: 'Score high → low' },
                { value: 'score_asc', label: 'Score low → high' },
                { value: 'name_asc', label: 'Name A → Z' },
                { value: 'time_desc', label: 'Recently submitted' }
              ]}
            />
            <CustomSelect
              label="Class:"
              value={classFilter}
              onChange={(v) => {
                setClassFilter(v);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All classes' },
                ...classList.map(c => ({ value: c.id, label: c.className || c.classCode }))
              ]}
            />
          </div>
        </div>

        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={classNames("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors", viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            Table
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={classNames("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors", viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Cards
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-brand-50 border border-brand-200 dark:bg-brand-900/20 dark:border-brand-800 rounded-lg p-3 mb-6 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
          <span className="text-brand-700 dark:text-brand-300 font-medium text-sm px-2">{selectedIds.size} students selected</span>
          <button
            onClick={() => handleGradeSelected()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Hourglass size={16} /> Grade {selectedIds.size} submissions
          </button>
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Clock className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">No history found</h3>
          <p className="text-slate-500 dark:text-slate-400">You haven't graded any submissions for this assignment yet.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto mb-12 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex justify-center pt-20 z-10">
              <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
            </div>
          )}
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-4 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={history.length > 0 && selectedIds.size === history.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4">Student</th>
                <th className="py-4 px-4">Student ID</th>
                <th className="py-4 px-4">Class</th>
                <th className="py-4 px-4">Submitted at</th>
                <th className="py-4 px-4 min-w-[120px]">Score</th>
                <th className="py-4 px-4 text-center">Grade</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {history.map((item) => {
                const percentage = item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0;
                let textClass = 'text-slate-600';
                let rank = 'D';
                let rankBg = 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400';

                if (percentage >= 90) { textClass = 'text-emerald-600 dark:text-emerald-400'; rank = 'A+'; rankBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'; }
                else if (percentage >= 80) { textClass = 'text-emerald-600 dark:text-emerald-400'; rank = 'A'; rankBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'; }
                else if (percentage >= 70) { textClass = 'text-blue-600 dark:text-blue-400'; rank = 'B+'; rankBg = 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-800'; }
                else if (percentage >= 60) { textClass = 'text-indigo-600 dark:text-indigo-400'; rank = 'B'; rankBg = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'; }
                else if (percentage >= 50) { textClass = 'text-amber-600 dark:text-amber-400'; rank = 'C+'; rankBg = 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-800'; }
                else { textClass = 'text-red-600 dark:text-red-400'; rank = 'D'; rankBg = 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-800'; }

                return (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs shrink-0 overflow-hidden">
                          <img src={item.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.studentName || item.studentId || '')}&background=random&color=fff`} alt={item.studentName || item.studentId} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{item.studentName || item.studentId}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">{item.studentCode || item.studentId}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.className || item.classCode || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {item.status === 'NotSubmitted' ? (
                        <div className="text-slate-400 font-medium">-</div>
                      ) : (
                        <>
                          <div className="text-slate-900 dark:text-slate-200 font-medium">{new Date(item.assessedAt).toLocaleDateString('vi-VN')} {new Date(item.assessedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="text-xs text-emerald-600 dark:text-emerald-400">(On time)</div>
                        </>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {item.status === 'Graded' ? (
                        <div className={classNames("text-lg font-bold", textClass)}>
                          {Number(item.score).toLocaleString('vi-VN')}
                        </div>
                      ) : (
                        <div className="text-slate-400 font-medium">-</div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.status === 'Graded' ? (
                        <span className={classNames("px-3 py-1 rounded-full text-xs font-bold", rankBg)}>
                          {rank}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.status === 'Graded' && (
                        <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Graded
                        </div>
                      )}
                      {item.status === 'Grading' && (
                        <div className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-medium">
                          <Hourglass size={16} className="animate-pulse" />
                          Grading
                        </div>
                      )}
                      {item.status === 'Submitted' && (
                        <div className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-sm font-medium">
                          <CheckCircle2 size={16} />
                          Submitted
                        </div>
                      )}
                      {item.status === 'NotSubmitted' && (
                        <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm font-medium">
                          <Clock size={16} />
                          Not submitted
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                      {item.status === 'Graded' && (
                        <button
                          onClick={() => handleViewHistory(item.id)}
                          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <Eye size={16} /> Xem
                        </button>
                      )}
                      {item.status === 'Grading' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/lecturer/grading/live/${item.id}?assignmentId=${id || ''}`);
                          }}
                          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 rounded-lg text-sm font-semibold transition-all cursor-pointer border border-amber-200/80 dark:border-amber-800/80 shadow-sm"
                          title="Click to watch background grading in real time"
                        >
                          <Loader2 size={16} className="animate-spin text-amber-600 dark:text-amber-400" />
                          Grading...
                        </button>
                      )}
                      {item.status === 'Submitted' && (
                        <button
                          onClick={(e) => handleGradeSubmission(e, item.id)}
                          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 dark:text-brand-400 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Grade
                        </button>
                      )}
                      {item.status === 'NotSubmitted' && (
                        <button disabled className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-slate-50 text-slate-300 dark:bg-slate-800/30 dark:text-slate-600 rounded-lg text-sm font-semibold cursor-not-allowed">
                          -
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex justify-center pt-20 z-10">
              <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
            </div>
          )}
          {history.map((item) => {
            const displayName = item.studentName || item.studentId || item.id.split('-')[0];

            const avatarColors = ['bg-yellow-50 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400', 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'];
            const avatarColor = avatarColors[displayName.charCodeAt(displayName.length - 1) % avatarColors.length] || avatarColors[0];

            return (
              <div
                key={item.id}
                onClick={() => handleRowClick(item)}
                className="group bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 transition-all cursor-pointer relative overflow-hidden hover:border-brand-300 flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={classNames("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden", avatarColor)}>
                        <img src={item.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`} alt={displayName} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] leading-snug">
                          {displayName}
                        </h3>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-slate-500 font-medium">{item.studentCode || item.studentId}</p>
                          {item.className && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                              {item.className}
                            </span>
                          )}
                        </div>
                        {item.status !== 'NotSubmitted' ? (
                          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Submitted: {new Date(item.assessedAt).toLocaleDateString()} {new Date(item.assessedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ) : (
                          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Not submitted
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                      <span>FINAL SCORE</span>
                      <span className="normal-case tracking-normal">
                        {item.status === 'Graded' && <span className="text-emerald-500">Graded</span>}
                        {item.status === 'Grading' && <span className="text-amber-500">Grading</span>}
                        {item.status === 'Submitted' && <span className="text-blue-500">Submitted</span>}
                        {item.status === 'NotSubmitted' && <span className="text-slate-400">Not submitted</span>}
                      </span>
                    </div>
                    {item.status === 'Graded' ? (
                      <div className="flex justify-between items-end mb-2 h-[30px]">
                        <div className="text-[26px] font-bold text-slate-900 dark:text-white leading-none">
                          {Number(item.score).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-end mb-2 h-[30px]">
                        <div className="text-[26px] font-bold text-slate-300 dark:text-slate-600 leading-none">
                          -
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 mt-auto flex items-center gap-2">
                  {item.status === 'Graded' && (
                    <button
                      onClick={() => handleViewHistory(item.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-transparent rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Eye size={16} /> View result
                    </button>
                  )}
                  {item.status === 'Grading' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/lecturer/grading/live/${item.id}?assignmentId=${id || ''}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200/80 dark:border-amber-800/80 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm"
                      title="Click to watch background grading in real time"
                    >
                      <Loader2 size={16} className="animate-spin text-amber-600 dark:text-amber-400" />
                      Grading...
                    </button>
                  )}
                  {item.status === 'Submitted' && (
                    <button
                      onClick={(e) => handleGradeSubmission(e, item.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-transparent rounded-lg text-sm font-semibold transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Grade
                    </button>
                  )}
                  {item.status === 'NotSubmitted' && (
                    <button disabled className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-300 dark:bg-slate-800/30 dark:text-slate-600 border border-transparent rounded-lg text-sm font-semibold cursor-not-allowed">
                      -
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 0 && history.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-900 dark:text-white">{Math.min((page - 1) * limit + 1, totalItems)}</span> - <span className="font-medium text-slate-900 dark:text-white">{Math.min(page * limit, totalItems)}</span> of <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> students
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && p - arr[idx - 1] > 1 && (
                    <span className="px-3 py-2 text-slate-400">...</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={classNames(
                      "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                      page === p
                        ? "bg-brand-600 text-white shadow-md shadow-brand-500/20 border border-brand-600"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalId && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">Confirm deletion</h3>
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
                Delete {deleteModalId === 'BULK' ? `${selectedIds.size} grading results` : 'this grading result'}? This cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-slate-100 dark:border-slate-700/50">
              <button
                onClick={() => setDeleteModalId(null)}
                className="flex-1 px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Cancel
              </button>
              <div className="w-px bg-slate-100 dark:bg-slate-700/50"></div>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Deadline Adjustment Modal */}
      {isDeadlineModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
                  <Clock size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Adjust the due date
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px] font-medium">
                    {assignment?.metadata?.title || 'Assignment'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeadlineModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {deadlineModalError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{deadlineModalError}</span>
                </div>
              )}

              {/* Current Deadline Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                  <Calendar size={15} className="text-slate-400" />
                  <span>Current due date:</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 px-2.5 py-0.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700">
                  {(assignment as any)?.stats?.dueDate
                    ? `${new Date((assignment as any).stats.dueDate).toLocaleDateString('vi-VN')} ${new Date((assignment as any).stats.dueDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Not set'}
                </span>
              </div>

              {/* Quick Extension Chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Quick extend
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '+1 day', days: 1 },
                    { label: '+3 days', days: 3 },
                    { label: '+7 days', days: 7 },
                    { label: '+14 days', days: 14 }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset.days)}
                      className="py-2 px-1 bg-slate-50 dark:bg-slate-700/40 hover:bg-brand-50 dark:hover:bg-brand-500/15 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl text-xs font-bold transition-all border border-slate-200/60 dark:border-slate-700/60 hover:border-brand-300 dark:hover:border-brand-500/40 text-center"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Integrated Calendar Box */}
              <div className="border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 bg-white dark:bg-slate-800/90 shadow-2xs">

                {/* Month Header */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Day of Week Labels */}
                <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                    <div key={day} className="text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {daysList.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} className="w-8 h-8"></div>;
                    const isSelected = selectedDateObj?.getDate() === day && selectedDateObj?.getMonth() === calendarMonth.getMonth() && selectedDateObj?.getFullYear() === calendarMonth.getFullYear();
                    const isToday = new Date().getDate() === day && new Date().getMonth() === calendarMonth.getMonth() && new Date().getFullYear() === calendarMonth.getFullYear();

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleCalendarDaySelect(day)}
                        className={classNames(
                          "w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-150 relative",
                          isSelected
                            ? "bg-brand-600 text-white shadow-md shadow-brand-600/30 scale-105"
                            : isToday
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 hover:bg-brand-100"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                        )}
                      >
                        {day}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-500"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Result Preview Banner */}
              <div className="p-3 bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/30 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">New due date:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {selectedDateObj ? (
                    `${selectedDateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} 23:59`
                  ) : (
                    'No date selected'
                  )}
                </span>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsDeadlineModalOpen(false)}
                disabled={savingDeadline}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeadline}
                disabled={savingDeadline}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-md shadow-brand-600/25 transition-all disabled:opacity-50"
              >
                {savingDeadline ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={16} />
                )}
                <span>Update due date</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Grading Strategy Settings Modal */}
      {isGradingSettingsModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
                  <Settings size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Grading mode settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px] font-medium">
                    {assignment?.metadata?.title || 'Assignment'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGradingSettingsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">

              {/* Option 1: Continuous queue (background grading) */}
              <div
                onClick={() => !savingStrategy && handleSaveGradingStrategy('CONTINUOUS_QUEUE')}
                className={classNames(
                  "p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group",
                  selectedGradingStrategy === 'CONTINUOUS_QUEUE'
                    ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                    : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={classNames(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    selectedGradingStrategy === 'CONTINUOUS_QUEUE'
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  )}>
                    <Zap size={24} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        ⚡ Background queue grading
                      </h4>
                      {selectedGradingStrategy === 'CONTINUOUS_QUEUE' && (
                        <span className="px-2.5 py-0.5 bg-emerald-500 text-white text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                          In use
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Each submission enters a FIFO queue as it arrives and the AI autograder starts on it immediately.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-lg border border-emerald-200/60 dark:border-emerald-500/20">
                        🚀 First in, first graded
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg">
                        Fully automated
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Batch after deadline */}
              <div
                onClick={() => !savingStrategy && handleSaveGradingStrategy('BATCH_POST_DEADLINE')}
                className={classNames(
                  "p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group",
                  selectedGradingStrategy === 'BATCH_POST_DEADLINE'
                    ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10"
                    : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/50"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={classNames(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    selectedGradingStrategy === 'BATCH_POST_DEADLINE'
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  )}>
                    <Clock size={24} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        📦 Batch grade once
                      </h4>
                      {selectedGradingStrategy === 'BATCH_POST_DEADLINE' && (
                        <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                          In use
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Submissions stay pending. Batch grading starts only when the lecturer presses Grade all.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-bold rounded-lg border border-amber-200/60 dark:border-amber-500/20">
                        ⚖️ Triggered manually
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg">
                        Batch grades when the lecturer presses Grade all
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-medium">
                {savingStrategy ? 'Saving settings...' : 'Click a mode to apply it'}
              </span>
              <button
                type="button"
                onClick={() => setIsGradingSettingsModalOpen(false)}
                className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}




