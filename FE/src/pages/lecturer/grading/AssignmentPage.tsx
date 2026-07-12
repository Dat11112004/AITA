import React, { useState, useEffect } from 'react';
import { gradingApi as api } from '@/lib/api';
import type { PublishedAssignment } from '@/types';
import { BookOpen, ListChecks, Upload, Layers, Trash2, Clock, MoreVertical, AlertCircle, Users, CheckCircle2, Hourglass, Star, Eye, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import classNames from 'classnames';

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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;
  
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
        const res: any = await api.getHistory(id || 'student-management-system', page, limit, debouncedSearch);
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
  }, [id, page, limit, debouncedSearch]);

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

  const handleDeleteHistory = (e: React.MouseEvent, historyId: string) => {
    e.stopPropagation();
    setDeleteModalId(historyId);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (!deleteModalId) return;
    try {
      if (deleteModalId === 'BULK') {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map(id => api.deleteHistory(id)));
        setHistory(history.filter(x => !selectedIds.has(x.id)));
        setSelectedIds(new Set());
      } else {
        await api.deleteHistory(deleteModalId);
        setHistory(history.filter(x => x.id !== deleteModalId));
        const newSelected = new Set(selectedIds);
        newSelected.delete(deleteModalId);
        setSelectedIds(newSelected);
      }
      setDeleteModalId(null);
    } catch (err) {
      console.error("Failed to delete", err);
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

  const handleViewHistory = (historyId: string) => {
    navigate(`/lecturer/grading/result/${historyId}`);
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b dark:border-slate-800 border-slate-100 bg-slate-50 dark:bg-slate-800/50">
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
                    <Upload size={20} />
                    Submit submissions
                  </>
                )}
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold dark:text-white text-slate-900">{assignment.metadata?.title || 'Assignment'}</h1>
          {assignment.metadata?.projectType && (
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
          <ul className="space-y-3">
            {assignment.metadata?.description ? (
              <li className="dark:text-slate-300 text-slate-600 text-base leading-relaxed">
                 {assignment.metadata.description}
              </li>
            ) : (
              <li className="dark:text-slate-500 text-slate-400 italic">No description provided.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">44</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Sinh viên <br/><span className="font-normal opacity-80">Tổng số</span></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">28</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Đã nộp <br/><span className="font-normal opacity-80">63.6%</span></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">10</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Chưa nộp <br/><span className="font-normal opacity-80">22.7%</span></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Hourglass size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">6</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Đang chấm <br/><span className="font-normal opacity-80">13.6%</span></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Star size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">9.12</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">Điểm trung bình <br/><span className="font-normal opacity-80">/10</span></div>
          </div>
        </div>
      </div>

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

          <div className="flex items-center gap-2">
            <select className="border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-200 focus:outline-none">
              <option>Trạng thái: Tất cả</option>
            </select>
            <select className="border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-200 focus:outline-none">
              <option>Khoảng điểm: Tất cả</option>
            </select>
            <select className="border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-200 focus:outline-none">
              <option>Sắp xếp: Điểm cao → thấp</option>
            </select>
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
            onClick={() => setDeleteModalId('BULK')}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={16} /> Xóa {selectedIds.size} kết quả
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
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto mb-12">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex justify-center pt-20 z-10">
                   <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
                </div>
              )}
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
                    onClick={() => handleViewHistory(item.id)}
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
                          <img src={`https://ui-avatars.com/api/?name=${displayId}&background=random&color=fff`} alt={displayId} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{displayId}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">{displayId}</td>
                    <td className="py-4 px-4">
                      <div className="text-slate-900 dark:text-slate-200 font-medium">{new Date(item.assessedAt).toLocaleDateString('vi-VN')} {new Date(item.assessedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">(Đúng hạn)</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-baseline gap-1 mb-1.5">
                        <span className={classNames("text-lg font-bold", textClass)}>{item.score}</span>
                        <span className="text-sm text-slate-400">/ {item.maxScore}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={classNames("h-full rounded-full", colorClass)} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={classNames("px-3 py-1 rounded-full text-xs font-bold", rankBg)}>
                        {rank}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Đã chấm
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center relative" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-md transition-colors inline-block"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === item.id && (
                          <div className="absolute right-8 top-10 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10 overflow-hidden animate-fade-in-up origin-top-right">
                            <button
                              onClick={(e) => handleDeleteHistory(e, item.id)}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 size={16} />
                              Xóa
                            </button>
                          </div>
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

            const displayId = item.studentId || item.id.split('-')[0];
            const initials = displayId.substring(0, 2).toUpperCase();
            
            const avatarColors = ['bg-yellow-50 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400', 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'];
            const avatarColor = avatarColors[displayId.charCodeAt(displayId.length - 1) % avatarColors.length];

            return (
              <div 
                key={item.id} 
                onClick={() => handleViewHistory(item.id)}
                className="group bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 transition-all cursor-pointer relative overflow-hidden hover:border-brand-300 flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={classNames("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0", avatarColor)}>
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] leading-snug">
                          {displayId}
                        </h3>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Nộp lúc: {new Date(item.assessedAt).toLocaleDateString('vi-VN')} {new Date(item.assessedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      ĐIỂM CUỐI CÙNG
                    </div>
                    <div className="flex justify-between items-end mb-2">
                        <div className="text-[26px] font-bold text-slate-900 dark:text-white leading-none">
                            {item.score} <span className="text-[15px] font-medium text-slate-400">/ {item.maxScore || 10}</span>
                        </div>
                        <div className={classNames("text-sm font-bold", textColor)}>
                            {percentage % 1 === 0 ? percentage : percentage.toFixed(1)}%
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={classNames("h-full rounded-full transition-all duration-300", barColor)} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 pt-0 mt-auto flex items-center gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Eye size={16} className="text-slate-400" />
                        Xem chi tiết
                    </button>
                    <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.id ? null : item.id);
                        }}
                        className="p-2 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                      >
                        <MoreVertical size={16} />
                        
                      {openMenuId === item.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10 overflow-hidden animate-fade-in-up">
                          <div
                            onClick={(e) => handleDeleteHistory(e, item.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                            Xóa
                          </div>
                        </div>
                      )}
                    </button>
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




