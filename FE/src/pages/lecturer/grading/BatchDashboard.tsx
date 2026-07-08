import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MultiFileUpload from '@/components/modules/grading/MultiFileUpload';
import { gradingApi as api } from '@/lib/api';
import { CheckCircle2, XCircle, Clock, Loader2, ArrowRight, Terminal, ArrowLeft, Search, AlertCircle, PlayCircle, Info } from 'lucide-react';
import classNames from 'classnames';

interface JobStatus {
    id: string;
    studentName: string;
    fileName: string;
    state: 'queued' | 'processing' | 'completed' | 'failed';
    progressPercent: number;
    currentTask: string;
    error?: string;
    score?: number;
    maxScore?: number;
}

export default function BatchDashboard() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const [filterState, setFilterState] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();
  const [assignmentTitle, setAssignmentTitle] = useState<string>('Automated Assessment');
  const { id: assignmentId } = useParams<{ id: string }>();

  const [jobs, setJobs] = useState<JobStatus[]>(() => {
    const jobsKey = assignmentId ? `batchJobs_${assignmentId}` : 'batchJobs';
    const savedJobs = localStorage.getItem(jobsKey);
    if (savedJobs) {
      try {
        return JSON.parse(savedJobs);
      } catch (e) {}
    }
    return [];
  });

  const [batchStartTime, setBatchStartTime] = useState<number | null>(() => {
    const startKey = assignmentId ? `batchStartTime_${assignmentId}` : 'batchStartTime';
    const savedStartTime = localStorage.getItem(startKey);
    if (savedStartTime) {
      return parseInt(savedStartTime, 10);
    }
    return null;
  });

  useEffect(() => {
    if (assignmentId) {
      api.getAssignment(assignmentId)
        .then(res => setAssignmentTitle(res.metadata?.title || 'Automated Assessment'))
        .catch(err => console.error("Failed to fetch assignment details:", err));
    }
  }, [assignmentId]);

  useEffect(() => {
      const jobsKey = assignmentId ? `batchJobs_${assignmentId}` : 'batchJobs';
      if (jobs.length > 0) {
          localStorage.setItem(jobsKey, JSON.stringify(jobs));
      } else {
          localStorage.removeItem(jobsKey);
      }
  }, [jobs, assignmentId]);

  // Timer for total elapsed time
  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (batchStartTime) {
          const activeJobs = jobs.filter(j => j.state === 'queued' || j.state === 'processing');
          if (activeJobs.length > 0) {
              interval = setInterval(() => {
                  setElapsedSeconds(Math.floor((Date.now() - batchStartTime) / 1000));
              }, 1000);
          } else if (jobs.length > 0) {
              // Recalculate one last time if everything just finished
              setElapsedSeconds(Math.floor((Date.now() - batchStartTime) / 1000));
          }
      }
      return () => clearInterval(interval);
  }, [batchStartTime, jobs]);

  // Polling for batch status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    const activeJobs = jobs.filter(j => j.state === 'queued' || j.state === 'processing');
    
    if (activeJobs.length > 0) {
        interval = setInterval(async () => {
            try {
                const ids = activeJobs.map(j => j.id);
                const res = await api.getBatchStatus(ids);
                
                setJobs(prevJobs => {
                    const newJobs = [...prevJobs];
                    let changed = false;
                    
                    for (let i = 0; i < newJobs.length; i++) {
                        const updatedData = res.statuses[newJobs[i].id];
                        if (updatedData) {
                            if (newJobs[i].state !== updatedData.state || 
                                newJobs[i].progressPercent !== updatedData.progressPercent ||
                                newJobs[i].currentTask !== updatedData.currentTask) {
                                
                                newJobs[i] = {
                                    ...newJobs[i],
                                    ...updatedData
                                };
                                changed = true;
                            }
                        }
                    }
                    
                    return changed ? newJobs : prevJobs;
                });
            } catch (err) {
                console.error("Failed to poll batch status:", err);
            }
        }, 2000);
    }
    
    return () => clearInterval(interval);
  }, [jobs]);

  const handleUpload = async (files: File[]) => {
    setError(null);
    setIsUploading(true);
    
    try {
      const result = await api.submitBatchProject(files, assignmentId);
      
      const newJobs: JobStatus[] = result.jobs.map((job: any) => ({
          id: job.submissionId,
          studentName: job.studentName,
          fileName: job.fileName,
          state: 'queued' as const,
          progressPercent: 0,
          currentTask: 'Waiting in queue...'
      }));
      
      const now = Date.now();
      setBatchStartTime(now);
      const startKey = assignmentId ? `batchStartTime_${assignmentId}` : 'batchStartTime';
      localStorage.setItem(startKey, now.toString());
      setJobs(newJobs);
      setIsUploading(false);
      
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to submit batch");
      setIsUploading(false);
    }
  };

  const handleClearBatch = () => {
      const jobsKey = assignmentId ? `batchJobs_${assignmentId}` : 'batchJobs';
      const startKey = assignmentId ? `batchStartTime_${assignmentId}` : 'batchStartTime';
      localStorage.removeItem(jobsKey);
      localStorage.removeItem(startKey);
      setJobs([]);
      setBatchStartTime(null);
      setElapsedSeconds(0);
      navigate(`/lecturer/grading/assignments/${assignmentId}`);
  };

  const completedCount = jobs.filter(j => j.state === 'completed').length;
  const failedCount = jobs.filter(j => j.state === 'failed').length;
  const inProgressCount = jobs.filter(j => j.state === 'processing').length;
  const queuedCount = jobs.filter(j => j.state === 'queued').length;
  const totalCount = jobs.length;

  const isAllDone = totalCount > 0 && (completedCount + failedCount === totalCount);
  const overallProgress = totalCount > 0 ? ((completedCount + failedCount) / totalCount) * 100 : 0;
  
  const elapsedMins = elapsedSeconds / 60;
  const processedSoFar = completedCount + failedCount;
  // Use a min elapsed of 0.1 to avoid infinity speed
  const speed = elapsedMins > 0.05 ? processedSoFar / elapsedMins : 0; 
  const remainingJobs = totalCount - processedSoFar;
  const etaSeconds = speed > 0 ? (remainingJobs / speed) * 60 : 0;

  const formatTime = (seconds: number) => {
      if (!isFinite(seconds) || seconds < 0) return "--:--";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (spd: number) => {
      if (spd === 0) return "--";
      if (spd < 1) return "< 1";
      return Math.round(spd).toString();
  };

  const currentProcessingJob = useMemo(() => {
      return jobs.find(j => j.state === 'processing') || jobs.find(j => j.state === 'queued');
  }, [jobs]);

  const filteredJobs = useMemo(() => {
      return jobs.filter(j => {
          if (filterState !== 'all' && j.state !== filterState && !(filterState === 'processing' && j.state === 'queued')) {
              return false;
          }
          if (searchQuery) {
              return j.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     j.id.toLowerCase().includes(searchQuery.toLowerCase());
          }
          return true;
      });
  }, [jobs, filterState, searchQuery]);

  const queueJobs = filteredJobs.filter(j => j.state === 'processing' || j.state === 'queued');
  const finishedJobs = filteredJobs.filter(j => j.state === 'completed' || j.state === 'failed');
  const avgScore = completedCount > 0 
    ? jobs.filter(j => j.state === 'completed').reduce((sum, j) => sum + (j.score || 0), 0) / completedCount 
    : 0;

  if (totalCount === 0) {
      return (
        <div className="max-w-7xl mx-auto pb-12 px-4 -mt-2 sm:-mt-4">
          <div className="mb-8 animate-fade-in">
              <button onClick={() => navigate(`/lecturer/grading/assignments/${assignmentId}`)} className="text-slate-400 hover:text-brand-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                <ArrowLeft size={20} />
                Back to assignment
              </button>
          </div>
          
          <div className="relative text-center mb-12 animate-fade-in">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400 mb-4">
              Submit student submissions
            </h1>
            <p className="text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Upload student projects as .zip files. The AI will immediately begin evaluating them in the background.
            </p>
            {assignmentId && (
                <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
                    <CheckCircle2 size={18} /> Validating against: {assignmentTitle}
                </p>
            )}
          </div>
          <MultiFileUpload onUpload={handleUpload} isUploading={isUploading} />
          {error && (
            <div className="mt-8 p-4 dark:bg-red-500/10 bg-red-50 border dark:border-red-500/30 border-red-200 rounded-lg dark:text-red-400 text-red-600 text-center max-w-3xl mx-auto">
              <p className="font-semibold">Batch upload failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}
        </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto pb-8 px-4 -mt-2 sm:-mt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
          <button onClick={() => navigate(`/lecturer/grading/assignments/${assignmentId}`)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold dark:text-white text-slate-900">Grading Status</h1>
            <p className="text-sm dark:text-slate-400 text-slate-500">AI is grading submissions in real time.</p>
          </div>
      </div>

      {/* Top Metrics Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm mb-8 flex flex-wrap divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800/50">
        <div className="flex-1 p-6 flex flex-col justify-center min-w-[150px]">
          <span className="text-4xl font-bold text-slate-800 dark:text-white">{totalCount}</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Total Submissions</span>
        </div>
        <div className="flex-1 p-6 flex flex-col justify-center min-w-[150px]">
          <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</span>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Completed</span>
             <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">
                {(totalCount > 0 ? (completedCount / totalCount * 100) : 0).toFixed(1)}%
             </span>
          </div>
        </div>
        <div className="flex-1 p-6 flex flex-col justify-center min-w-[150px]">
          <span className="text-4xl font-bold text-brand-600 dark:text-brand-400">{inProgressCount}</span>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Processing</span>
             {inProgressCount > 0 && <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>}
          </div>
        </div>
        <div className="flex-1 p-6 flex flex-col justify-center min-w-[150px]">
          <span className="text-4xl font-bold text-amber-600 dark:text-amber-400">{queuedCount}</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Waiting</span>
        </div>
        <div className="flex-1 p-6 flex flex-col justify-center min-w-[150px] bg-slate-50 dark:bg-slate-800/50">
          <span className="text-3xl font-bold text-slate-800 dark:text-slate-200 font-mono">{isAllDone ? formatTime(elapsedSeconds) : formatTime(etaSeconds)}</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">{isAllDone ? 'Total Duration' : 'ETA'}</span>
          {!isAllDone && (
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatSpeed(speed)} submissions/min</span>
          )}
        </div>
      </div>

      {/* Hero Section / All Submissions Completed Banner */}
      {isAllDone ? (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 mb-8 text-center flex flex-col items-center animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mb-2">All submissions completed</h2>
              <p className="text-emerald-600 dark:text-emerald-400 mb-6 font-medium text-lg">{completedCount} / {totalCount} successfully graded</p>
              
              <div className="flex items-center gap-8 mb-8 text-emerald-700 dark:text-emerald-300">
                  <div className="text-center">
                      <div className="text-sm opacity-80 uppercase tracking-wider mb-1">Average Score</div>
                      <div className="text-3xl font-bold">{avgScore.toFixed(1)}</div>
                  </div>
                  <div className="w-px h-10 bg-emerald-200 dark:bg-emerald-800"></div>
                  <div className="text-center">
                      <div className="text-sm opacity-80 uppercase tracking-wider mb-1">Duration</div>
                      <div className="text-3xl font-bold font-mono">{formatTime(elapsedSeconds)}</div>
                  </div>
              </div>

              <button 
                  onClick={handleClearBatch}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                  <ArrowRight size={20} /> View Grading Results
              </button>
          </div>
      ) : (
          <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-2xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
              {/* Animated Background Shimmer */}
              <div className="absolute inset-0 bg-white/5 skew-x-12 translate-x-[-100%] animate-[shimmer_3s_infinite]"></div>
              
              <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                          <Loader2 size={24} className="animate-spin text-brand-200" />
                          <h2 className="text-xl font-bold">AI Grading Progress</h2>
                      </div>
                      <div className="flex items-center gap-4 text-brand-100 text-sm font-medium">
                          <span>Elapsed: <span className="font-mono">{formatTime(elapsedSeconds)}</span></span>
                          <span>ETA: <span className="font-mono">{formatTime(etaSeconds)}</span></span>
                      </div>
                  </div>

                  {/* Main Progress Bar */}
                  <div className="mb-6">
                      <div className="flex justify-between items-end mb-2">
                          <span className="text-3xl font-bold">{overallProgress.toFixed(0)}%</span>
                          <span className="text-brand-100 font-medium">{processedSoFar} / {totalCount}</span>
                      </div>
                      <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                          <div className="h-full bg-white rounded-full transition-all duration-500 relative" style={{ width: `${overallProgress}%` }}>
                             <div className="absolute inset-0 bg-white/50 animate-pulse"></div>
                          </div>
                      </div>
                  </div>

                  {/* Current Student Details */}
                  {currentProcessingJob && (
                      <div className="bg-black/20 backdrop-blur-md rounded-xl p-5 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex gap-4 items-center">
                              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg border border-white/20 shadow-inner">
                                  {currentProcessingJob.studentName.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                  <div className="text-sm text-brand-200 uppercase tracking-wider mb-0.5">Current Student</div>
                                  <div className="font-bold text-lg">{currentProcessingJob.studentName}</div>
                                  <div className="text-sm text-brand-100 opacity-90 truncate max-w-sm">{currentProcessingJob.currentTask}</div>
                              </div>
                          </div>
                          
                          <div className="flex-1 w-full md:w-auto md:min-w-[200px]">
                             <div className="flex justify-between text-xs text-brand-200 mb-1.5">
                                 <span>Step progress</span>
                                 <span className="font-mono font-bold">{currentProcessingJob.progressPercent}%</span>
                             </div>
                             <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden">
                                 <div className="h-full bg-brand-300 rounded-full transition-all duration-300" style={{ width: `${currentProcessingJob.progressPercent}%` }}></div>
                             </div>
                          </div>

                          {currentProcessingJob.state === 'processing' && (
                              <button 
                                  onClick={() => navigate(`/lecturer/grading/live/${currentProcessingJob.id}?assignmentId=${assignmentId || ''}`)}
                                  className="shrink-0 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                  <Terminal size={16} /> View console
                              </button>
                          )}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Segmented Control & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
              <button 
                  onClick={() => setFilterState('all')}
                  className={classNames("px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors", filterState === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400')}
              >
                  All ({totalCount})
              </button>
              <button 
                  onClick={() => setFilterState('processing')}
                  className={classNames("px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors", filterState === 'processing' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400')}
              >
                  Processing ({inProgressCount + queuedCount})
              </button>
              <button 
                  onClick={() => setFilterState('completed')}
                  className={classNames("px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors", filterState === 'completed' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400')}
              >
                  Completed ({completedCount})
              </button>
              {failedCount > 0 && (
                  <button 
                      onClick={() => setFilterState('failed')}
                      className={classNames("px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors", filterState === 'failed' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400')}
                  >
                      Failed ({failedCount})
                  </button>
              )}
          </div>

          <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none text-sm dark:text-white"
              />
          </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Queue Section (Only show if not filtering specifically for completed/failed) */}
          {(filterState === 'all' || filterState === 'processing') && (
              <div>
                  <div className="flex items-center gap-2 mb-4">
                      <PlayCircle className="text-brand-500 w-5 h-5" />
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Queue</h3>
                  </div>
                  {queueJobs.length === 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-800 border-dashed">
                          <p className="text-slate-500 dark:text-slate-400 font-medium">Queue is empty</p>
                      </div>
                  ) : (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                          <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
                              {queueJobs.map((job, idx) => (
                                  <li key={job.id} className={classNames("p-4 flex items-center justify-between gap-4 transition-colors", job.state === 'processing' ? 'bg-brand-50/50 dark:bg-brand-900/10' : '')}>
                                      <div className="flex items-center gap-3">
                                          {job.state === 'processing' ? (
                                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse shrink-0"></div>
                                          ) : (
                                              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></div>
                                          )}
                                          <div>
                                              <div className="font-semibold text-slate-900 dark:text-white text-sm">{job.studentName}</div>
                                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{job.state === 'processing' ? job.currentTask : 'Waiting in queue...'}</div>
                                          </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                          {job.state === 'processing' ? (
                                              <span className="text-sm font-bold font-mono text-brand-600 dark:text-brand-400">{job.progressPercent}%</span>
                                          ) : (
                                              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Position #{idx + 1}</span>
                                          )}
                                      </div>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
              </div>
          )}

          {/* Completed Section (Always show if 'all' or 'completed' or 'failed') */}
          {(filterState === 'all' || filterState === 'completed' || filterState === 'failed') && (
              <div className={filterState === 'completed' || filterState === 'failed' ? 'lg:col-span-2' : ''}>
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Completed</h3>
                      </div>
                  </div>
                  
                  {finishedJobs.length === 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-800 border-dashed">
                          <p className="text-slate-500 dark:text-slate-400 font-medium">No submissions finished yet</p>
                      </div>
                  ) : (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                              <table className="w-full text-left whitespace-nowrap">
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                      {finishedJobs.map(job => (
                                          <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                              <td className="p-4">
                                                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{job.studentName}</div>
                                              </td>
                                              <td className="p-4">
                                                  {job.state === 'completed' ? (
                                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                          {job.score !== undefined ? Number(job.score.toFixed(2)) : 0} <span className="text-xs font-normal text-slate-400">/ {job.maxScore}</span>
                                                      </span>
                                                  ) : (
                                                      <span className="text-xs font-medium text-red-500 flex items-center gap-1"><AlertCircle size={12}/> Failed</span>
                                                  )}
                                              </td>
                                              <td className="p-4 text-center">
                                                  {job.state === 'completed' && <span className="inline-flex items-center gap-1 text-emerald-500"><CheckCircle2 size={16} /></span>}
                                              </td>
                                              <td className="p-4 text-right">
                                                  <button 
                                                      onClick={() => navigate(job.state === 'completed' ? `/lecturer/grading/result/${job.id}` : '#')}
                                                      disabled={job.state === 'failed'}
                                                      className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 disabled:opacity-50"
                                                  >
                                                      View
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
}
