import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import LiveActivityLog from '@/components/modules/grading/LiveActivityLog';
import { gradingApi as api } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function LiveJobPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId') || undefined;

  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<{ percent: number, task: string } | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [assignmentTitle, setAssignmentTitle] = useState<string>('Automated Assessment');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const startTimeRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (assignmentId) {
      api.getAssignment(assignmentId)
        .then(res => setAssignmentTitle(res.metadata?.title || 'Automated Assessment'))
        .catch(err => console.error("Failed to fetch assignment details:", err));
    }
  }, [assignmentId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!id) return;
    
    // We assume the job is already running in the background, we just hook into the stream
    setProgressData({ percent: 0, task: 'Connecting to live stream...' });
    startTimeRef.current = Date.now(); // Start timer immediately upon joining

    const unsubscribe = api.subscribeToProgress(
      id,
      (job) => {
        setProgressData({
          percent: job.progressPercent || 0,
          task: job.currentTask || 'Processing...'
        });

        if (job.meta) {
          setActivities(prev => [{ id: Date.now().toString() + Math.random(), task: job.currentTask, meta: job.meta }, ...prev]);
        }
      },
      async () => {
        try {
          setProgressData({ percent: 100, task: 'Fetching final report...' });
          const result = await api.getSubmissionResult(id);
          const finalTime = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
          navigate(`/lecturer/grading/result/${result.submissionId}`, { state: { result, gradingTime: finalTime } });
        } catch (err: any) {
          setError(err.response?.data?.error || err.message || "Failed to fetch result");
        }
      },
      (err) => {
        setError(err.message || "Progress stream failed");
      }
    );

    return () => {
        // We do not cancel the backend job on unmount, just close the SSE connection.
        // The subscribeToProgress returns a cleanup function that closes the EventSource.
        if (unsubscribe) unsubscribe();
    };
  }, [id, navigate]);

  const handleCancelClick = () => {
      if (!id) return;
      setShowCancelModal(true);
  };

  const confirmCancel = async () => {
      setShowCancelModal(false);
      setIsCancelling(true);
      try {
          await api.cancelSubmission(id!);
      } catch (err: any) {
          setError(err.response?.data?.error || err.message || "Failed to cancel job");
      } finally {
          setIsCancelling(false);
      }
  };

  return (
    <div className="max-w-6xl mx-auto pb-8 px-4 -mt-2 sm:-mt-4">
      <div className="mb-6 flex justify-between items-center">
          <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 px-4 py-2 border dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-300 font-medium"
          >
              <ArrowLeft size={18} /> Back to batch dashboard
          </button>
          
          <h1 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <Loader2 className="animate-spin text-cyan-500" size={24} /> Live AI processing log
          </h1>
          
          <button 
              onClick={handleCancelClick}
              disabled={isCancelling || progressData?.percent === 100 || error !== null}
              className="flex items-center gap-2 px-4 py-2 border border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-red-600 dark:text-red-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
              {isCancelling ? <Loader2 className="animate-spin" size={18} /> : "Cancel grading"}
          </button>
      </div>

      {progressData && (
        <div className="w-full max-w-4xl mx-auto mb-6 animate-fade-in mt-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-emerald-500 font-mono text-sm tracking-widest uppercase flex items-center gap-2">
              {assignmentTitle} - {id?.substring(0, 8)}
            </span>
            <div className="flex flex-col items-end">
              <span className="text-emerald-400 font-mono text-xs opacity-80 mb-1">
                TIME ELAPSED: {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-emerald-500 font-mono text-lg font-bold shadow-emerald-500/50 drop-shadow-md leading-none">
                {progressData.percent}%
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-900 border border-emerald-900/50 h-3 flex overflow-hidden relative shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300 ease-out relative" 
              style={{ width: `${progressData.percent}%` }}
            >
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/50 shadow-[0_0_10px_white]"></div>
            </div>
            
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,rgba(0,0,0,0.5)_4px,rgba(0,0,0,0.5)_8px)] pointer-events-none"></div>
          </div>
        </div>
      )}

      <div className="animate-fade-in">
        {/* We pass a generic filename since we don't have the original filename here unless we fetch it, but that's fine */}
        <LiveActivityLog activities={activities} fileName={`Submission ${id?.substring(0, 8)}`} assignmentId={assignmentId} />
      </div>

      {error && (
        <div className="mt-8 p-4 dark:bg-red-500/10 bg-red-50 border dark:border-red-500/30 border-red-200 rounded-lg dark:text-red-400 text-red-600 text-center">
          <p className="font-semibold">Live stream error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4">
                  <h3 className="text-xl font-bold text-white mb-2">Cancel grading?</h3>
                  <p className="text-slate-400 text-sm mb-6">
                      Are you sure you want to abort this evaluation? This action will immediately terminate the AI analysis and cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                      <button 
                          onClick={() => setShowCancelModal(false)}
                          className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors font-medium text-sm"
                      >
                          No, keep running
                      </button>
                      <button 
                          onClick={confirmCancel}
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors font-medium text-sm shadow-lg shadow-red-500/20"
                      >
                          Yes, cancel it
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}



