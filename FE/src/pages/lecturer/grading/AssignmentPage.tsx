import { useState, useEffect } from 'react';
import { gradingApi as api } from '@/lib/api';
import type { PublishedAssignment } from '@/types';
import { BookOpen, ListChecks, Upload, Trash2, Clock, MoreVertical } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getAssignment(id || 'student-management-system');
        setAssignment(data);
        const histData = await api.getHistory(id || 'student-management-system');
        setHistory(histData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();

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

  const handleDeleteHistory = async (e: React.MouseEvent, historyId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this graded assignment?")) {
      try {
        await api.deleteHistory(historyId);
        setHistory(history.filter(x => x.id !== historyId));
      } catch (err) {
        alert("Failed to delete.");
      }
    }
    setOpenMenuId(null);
  };

  const handleViewHistory = (historyId: string) => {
    navigate(`/lecturer/grading/result/${historyId}`);
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading assignment...</div>;
  if (!assignment) return <div className="text-center py-20 text-red-400">Assignment not found</div>;

  const filteredHistory = history.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const displayId = (item.studentId || item.id.split('-')[0]).toLowerCase();
    return displayId.includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto pb-8 -mt-2 sm:-mt-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="p-8 border-b dark:border-slate-800 border-slate-100 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-400 mb-2">
              <BookOpen size={24} />
              <span className="font-semibold uppercase tracking-wider text-sm">Assignment details</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/lecturer/grading/assignments/${id}/rubric`)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors shadow-sm"
              >
                <ListChecks size={18} />
                Review rubric
              </button>
              <button
                onClick={() => navigate(`/lecturer/grading/assignments/${id}/submit`)}
                className={classNames(
                  "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors shadow-sm text-white",
                  hasActiveBatch ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-brand-600 hover:bg-brand-700"
                )}
              >
                {hasActiveBatch ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    Live grading status
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Submit submissions
                  </>
                )}
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold dark:text-white text-slate-900 mb-4">{assignment.metadata?.title || 'Assignment'}</h1>
          <p className="dark:text-slate-300 text-slate-600 leading-relaxed text-lg">Project type: {assignment.metadata?.projectType}</p>
        </div>
        
        <div className="p-8">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-6">
            <ListChecks size={24} className="text-brand-500" />
            <h2 className="text-xl font-semibold dark:text-white text-slate-800">Details</h2>
          </div>
          <ul className="space-y-3">
            {assignment.metadata?.description ? (
              <li className="dark:text-slate-300 text-slate-600">
                 {assignment.metadata.description}
              </li>
            ) : (
              <li className="dark:text-slate-500 text-slate-400 italic">No description provided.</li>
            )}
          </ul>
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

      {filteredHistory.length === 0 ? (
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
                <th className="py-4 px-4 w-10 text-center"><input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" /></th>
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
              {filteredHistory.map((item) => {
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
                      <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredHistory.map((item) => {
            const percentage = item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0;
            let scoreColor = 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-900/50';
            if (percentage >= 80) scoreColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
            else if (percentage >= 50) scoreColor = 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';

            const displayId = item.studentId || item.id.split('-')[0];

            return (
              <div 
                key={item.id} 
                onClick={() => handleViewHistory(item.id)}
                className="group bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${displayId}&background=random&color=fff`} alt={displayId} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                          {displayId}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date(item.assessedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === item.id ? null : item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-md transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === item.id && (
                        <div className="absolute right-0 top-8 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10 overflow-hidden animate-fade-in-up">
                          <button
                            onClick={(e) => handleDeleteHistory(e, item.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={14} />
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Final Score
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                        {item.score} <span className="text-sm font-medium text-slate-400">/ {item.maxScore}</span>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${scoreColor}`}>
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}




