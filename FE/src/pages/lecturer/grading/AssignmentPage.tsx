import React, { useState, useEffect, useRef } from 'react';
import { gradingApi as api } from '@/lib/api';
import type { PublishedAssignment } from '@/types';
import { BookOpen, ListChecks, Upload, Layers, Trash2, Clock, MoreVertical, AlertCircle, Users, CheckCircle2, Hourglass, Star, Eye, ArrowLeft, Edit2, Save, X, Calendar, ChevronDown } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

function CustomSelect({ value, onChange, options, className, label }: { value: string, onChange: (v: string) => void, options: {value: string, label: string}[], className?: string, label?: string }) {
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasActiveBatch, setHasActiveBatch] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;
  
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('score_desc');
  
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
      const handler = setTimeout(() => {
          setDebouncedSearch(searchQuery);
          setPage(1);
      }, 500);
      return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadAssignment() {
        try {
            const data = await api.getAssignment(id || 'student-management-system');
            setAssignment(data);
        } catch (err) {
            console.error(err);
        }
    }
    loadAssignment();
  }, [id]);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const res: any = await api.getHistory(id || 'student-management-system', page, limit, debouncedSearch, statusFilter, scoreRangeFilter, sortOrder);
        setHistory(res.history || []);
        if (res.meta) {
            setTotalPages(res.meta.totalPages || 1);
            setTotalItems(res.meta.total || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [id, page, limit, debouncedSearch, statusFilter, scoreRangeFilter, sortOrder]);

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
    // Use interval to catch any same-tab localStorage changes immediately
    const intervalId = setInterval(checkBatch, 1000);
    window.addEventListener('storage', checkBatch);

    return () => {
        clearInterval(intervalId);
        window.removeEventListener('storage', checkBatch);
    };
  }, [id]);

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
            try { existingJobs = JSON.parse(existingJobsStr); } catch (e) {}
        }
        
        const combinedJobs = [...existingJobs, ...newJobs];
        localStorage.setItem(jobsKey, JSON.stringify(combinedJobs));
        
        if (!localStorage.getItem(startKey)) {
            localStorage.setItem(startKey, Date.now().toString());
        }
        
        navigate(`/lecturer/grading/assignments/${id}/submit`);
      } else {
        setError("Không có bài tập nào hợp lệ để chấm (chưa nộp hoặc đã chấm xong).");
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
            try { existingJobs = JSON.parse(existingJobsStr); } catch (e) {}
        }
        
        const combinedJobs = [...existingJobs, ...newJobs];
        localStorage.setItem(jobsKey, JSON.stringify(combinedJobs));
        
        if (!localStorage.getItem(startKey)) {
            localStorage.setItem(startKey, Date.now().toString());
        }
        
        navigate(`/lecturer/grading/assignments/${id}/submit`);
      } else {
        setError("Trong các sinh viên được chọn, không có bài tập nào hợp lệ để chấm.");
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
      setError(`Sinh viên ${item.studentName || item.studentCode || item.studentId} đã nộp bài nhưng chưa có kết quả chấm điểm. Vui lòng nhấn "Chấm".`);
      setTimeout(() => setError(null), 4000);
    } else if (item.status === 'Grading') {
      navigate(`/lecturer/grading/live/${item.id}?assignmentId=${id || ''}`);
    } else {
      setError(`Sinh viên ${item.studentName || item.studentCode || item.studentId} chưa nộp bài, không có dữ liệu để hiển thị.`);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleViewHistory = (historyId: string) => {
    navigate(`/lecturer/grading/result/${historyId}`);
  };

  const handleEdit = () => {
      setEditTitle(assignment?.metadata?.title || '');
      setEditDescription(assignment?.metadata?.description || '');
      
      const statsDueDate = (assignment as any)?.stats?.dueDate;
      if (statsDueDate) {
          const d = new Date(statsDueDate);
          const pad = (n: number) => n.toString().padStart(2, '0');
          const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setEditDueDate(formattedDate);
      } else {
          setEditDueDate('');
      }
      setIsEditing(true);
  };

  const handleSave = async () => {
      if (editDueDate) {
          const startDate = (assignment as any)?.stats?.createdAt;
          if (startDate && new Date(editDueDate) < new Date(startDate)) {
              setError("Hạn nộp không được sớm hơn ngày tạo bài tập.");
              return;
          }
      }
      setError(null);

      try {
          setSaving(true);
          await api.updateAssignment(id!, {
              title: editTitle,
              description: editDescription,
              dueDate: editDueDate ? new Date(editDueDate).toISOString() : null
          });
          const data = await api.getAssignment(id!);
          setAssignment(data);
          setIsEditing(false);
      } catch (err) {
          console.error(err);
      } finally {
          setSaving(false);
      }
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
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors shadow-sm text-base"
                >
                  <Edit2 size={18} />
                  Edit
                </button>
              )}
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors shadow-sm text-base disabled:opacity-50"
                  >
                    <X size={20} />
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors shadow-sm text-base disabled:opacity-50"
                  >
                    {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={20} />}
                    Lưu
                  </button>
                </>
              ) : (
                <>
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
                        Chấm tất cả
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
          {isEditing ? (
              <div className="mb-4 space-y-4">

                  <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tiêu đề bài tập</label>
                      <input 
                          type="text" 
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                  </div>
              </div>
          ) : (
              <h1 className="text-3xl font-bold dark:text-white text-slate-900">{assignment.metadata?.title || 'Assignment'}</h1>
          )}
          {assignment.metadata?.projectType && !isEditing && (
            <div className="flex items-center mt-3 animate-fade-in">
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
          {isEditing ? (
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mô tả bài tập</label>
                      <textarea 
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                  </div>
                  <div className="max-w-xs">
                      <DateTimePicker 
                          label="Hạn nộp"
                          value={editDueDate}
                          onChange={(val) => setEditDueDate(val)}
                      />
                  </div>
              </div>
          ) : (
              <ul className="space-y-3">
                {assignment.metadata?.description ? (
                  <li className="dark:text-slate-300 text-slate-600 text-base leading-relaxed whitespace-pre-wrap">
                     {assignment.metadata.description}
                  </li>
                ) : (
                  <li className="dark:text-slate-500 text-slate-400 italic">No description provided.</li>
                )}
                {(assignment as any).stats?.dueDate && (
                  <li className="dark:text-slate-300 text-slate-600 text-base flex items-center gap-2 mt-4 font-medium">
                     <Calendar size={18} className="text-brand-500" />
                     Hạn nộp: <span className="text-brand-600 dark:text-brand-400">{new Date((assignment as any).stats.dueDate).toLocaleDateString('vi-VN')} {new Date((assignment as any).stats.dueDate).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                  </li>
                )}
              </ul>
          )}
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
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Sinh viên <br/><span className="font-normal opacity-80">Tổng số</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.submitted}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Đã nộp <br/><span className="font-normal opacity-80">{stats.submittedPercentage}%</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.notSubmitted}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Chưa nộp <br/><span className="font-normal opacity-80">{stats.notSubmittedPercentage}%</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Hourglass size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.grading}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Đang chấm <br/><span className="font-normal opacity-80">{stats.gradingPercentage}%</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Star size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.averageScore}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Điểm trung bình <br/><span className="font-normal opacity-80">/10</span></div>
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
              placeholder="Tìm kiếm sinh viên, mã SV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-4">
            <CustomSelect
              label="Trạng thái:"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'NotSubmitted', label: 'Chưa nộp' },
                { value: 'Submitted', label: 'Đã nộp' },
                { value: 'Grading', label: 'Đang chấm' },
                { value: 'Graded', label: 'Đã chấm' }
              ]}
            />
            <CustomSelect
              label="Khoảng điểm:"
              value={scoreRangeFilter}
              onChange={setScoreRangeFilter}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: '9-10', label: '9 - 10 điểm' },
                { value: '8-9', label: '8 - 8.9 điểm' },
                { value: '7-8', label: '7 - 7.9 điểm' },
                { value: '5-7', label: '5 - 6.9 điểm' },
                { value: '<5', label: 'Dưới 5 điểm' }
              ]}
            />
            <CustomSelect
              label="Sắp xếp:"
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: 'score_desc', label: 'Điểm cao → thấp' },
                { value: 'score_asc', label: 'Điểm thấp → cao' },
                { value: 'name_asc', label: 'Tên A → Z' },
                { value: 'time_desc', label: 'Nộp gần đây' }
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
            Bảng
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={classNames("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors", viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Thẻ
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-brand-50 border border-brand-200 dark:bg-brand-900/20 dark:border-brand-800 rounded-lg p-3 mb-6 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
          <span className="text-brand-700 dark:text-brand-300 font-medium text-sm px-2">Đã chọn {selectedIds.size} sinh viên</span>
          <button 
            onClick={() => handleGradeSelected()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Hourglass size={16} /> Chấm {selectedIds.size} bài
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
                <th className="py-4 px-4">Sinh viên</th>
                <th className="py-4 px-4">Mã sinh viên</th>
                <th className="py-4 px-4">Thời gian nộp</th>
                <th className="py-4 px-4 min-w-[120px]">Điểm</th>
                <th className="py-4 px-4 text-center">Xếp loại</th>
                <th className="py-4 px-4 text-center">Trạng thái</th>
                <th className="py-4 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {history.map((item) => {
                const percentage = item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0;
                let colorClass = 'text-slate-600 bg-slate-200';
                let textClass = 'text-slate-600';
                let rank = 'D';
                let rankBg = 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400';
                
                if (percentage >= 90) { colorClass = 'bg-emerald-500'; textClass = 'text-emerald-600 dark:text-emerald-400'; rank = 'A+'; rankBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'; }
                else if (percentage >= 80) { colorClass = 'bg-emerald-400'; textClass = 'text-emerald-600 dark:text-emerald-400'; rank = 'A'; rankBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'; }
                else if (percentage >= 70) { colorClass = 'bg-blue-500'; textClass = 'text-blue-600 dark:text-blue-400'; rank = 'B+'; rankBg = 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-800'; }
                else if (percentage >= 60) { colorClass = 'bg-indigo-400'; textClass = 'text-indigo-600 dark:text-indigo-400'; rank = 'B'; rankBg = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'; }
                else if (percentage >= 50) { colorClass = 'bg-amber-500'; textClass = 'text-amber-600 dark:text-amber-400'; rank = 'C+'; rankBg = 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-800'; }
                else { colorClass = 'bg-red-500'; textClass = 'text-red-600 dark:text-red-400'; rank = 'D'; rankBg = 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-800'; }

                const displayId = item.studentId || item.id.split('-')[0];

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
                      {item.status === 'NotSubmitted' ? (
                        <div className="text-slate-400 font-medium">-</div>
                      ) : (
                        <>
                          <div className="text-slate-900 dark:text-slate-200 font-medium">{new Date(item.assessedAt).toLocaleDateString('vi-VN')} {new Date(item.assessedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</div>
                          <div className="text-xs text-emerald-600 dark:text-emerald-400">(Đúng hạn)</div>
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
                          Đã chấm
                        </div>
                      )}
                      {item.status === 'Grading' && (
                        <div className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-medium">
                          <Hourglass size={16} className="animate-pulse" />
                          Đang chấm
                        </div>
                      )}
                      {item.status === 'Submitted' && (
                        <div className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-sm font-medium">
                          <CheckCircle2 size={16} />
                          Đã nộp
                        </div>
                      )}
                      {item.status === 'NotSubmitted' && (
                        <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm font-medium">
                          <Clock size={16} />
                          Chưa nộp
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
                          <div className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 rounded-lg text-sm font-semibold cursor-not-allowed">
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            Đang chấm
                          </div>
                        )}
                        {item.status === 'Submitted' && (
                          <button
                            onClick={(e) => handleGradeSubmission(e, item.id)}
                            className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 dark:text-brand-400 rounded-lg text-sm font-semibold transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Chấm
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
            const percentage = item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0;
            let barColor = 'bg-red-500';
            let textColor = 'text-red-500';
            if (percentage >= 80) {
                barColor = 'bg-emerald-500'; textColor = 'text-emerald-500';
            } else if (percentage >= 70) {
                barColor = 'bg-blue-500'; textColor = 'text-blue-500';
            } else if (percentage >= 50) {
                barColor = 'bg-orange-500'; textColor = 'text-orange-500';
            }

            const displayName = item.studentName || item.studentId || item.id.split('-')[0];
            const initials = displayName.substring(0, 2).toUpperCase();
            
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
                        <p className="text-xs text-slate-500 font-medium mb-1">{item.studentCode || item.studentId}</p>
                        {item.status !== 'NotSubmitted' ? (
                          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Nộp lúc: {new Date(item.assessedAt).toLocaleDateString('vi-VN')} {new Date(item.assessedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        ) : (
                          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Chưa nộp bài
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                      <span>ĐIỂM CUỐI CÙNG</span>
                      <span className="normal-case tracking-normal">
                        {item.status === 'Graded' && <span className="text-emerald-500">Đã chấm</span>}
                        {item.status === 'Grading' && <span className="text-amber-500">Đang chấm</span>}
                        {item.status === 'Submitted' && <span className="text-blue-500">Đã nộp</span>}
                        {item.status === 'NotSubmitted' && <span className="text-slate-400">Chưa nộp</span>}
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
                          <Eye size={16} /> Xem kết quả
                      </button>
                    )}
                    {item.status === 'Grading' && (
                      <div className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 border border-transparent rounded-lg text-sm font-semibold cursor-not-allowed">
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                          Đang chấm...
                      </div>
                    )}
                    {item.status === 'Submitted' && (
                      <button 
                        onClick={(e) => handleGradeSubmission(e, item.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-transparent rounded-lg text-sm font-semibold transition-colors"
                      >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Chấm điểm
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
            Hiển thị <span className="font-medium text-slate-900 dark:text-white">{Math.min((page - 1) * limit + 1, totalItems)}</span> - <span className="font-medium text-slate-900 dark:text-white">{Math.min(page * limit, totalItems)}</span> trong <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> sinh viên
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
              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">Xác nhận xóa</h3>
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
                Bạn có chắc chắn muốn xóa {deleteModalId === 'BULK' ? `${selectedIds.size} kết quả chấm điểm` : 'kết quả chấm điểm này'} không? Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex border-t border-slate-100 dark:border-slate-700/50">
              <button 
                onClick={() => setDeleteModalId(null)}
                className="flex-1 px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Hủy bỏ
              </button>
              <div className="w-px bg-slate-100 dark:bg-slate-700/50"></div>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}




