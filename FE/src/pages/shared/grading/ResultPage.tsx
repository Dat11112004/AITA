import { useEffect, useState } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import type { SubmissionResponse } from '@/types';
import ScoreCard from '@/components/modules/grading/ScoreCard';
import RuleList from '@/components/modules/grading/RuleList';
import { ArrowLeft, Sparkles, CheckCircle2, Clock, Send, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { gradingApi as api } from '@/lib/api';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [result, setResult] = useState<SubmissionResponse | null>((location.state?.result as SubmissionResponse) || null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const gradingTime = location.state?.gradingTime as number | undefined;

  const handleGoBack = () => {
    const targetAssignmentId = (result as any)?.assignmentId || (result as any)?.examId || (result as any)?.ExamId;
    if (window.history.length > 1 && window.history.state?.idx > 0) {
      navigate(-1);
    } else if (targetAssignmentId) {
      navigate(`/lecturer/grading/assignments/${targetAssignmentId}`);
    } else {
      navigate('/lecturer/grading');
    }
  };

  const handleTogglePublish = async () => {
    if (!id || !result) return;
    try {
      setIsPublishing(true);
      const isCurrentlyPublished = !!(result as any).isPublished;
      if (isCurrentlyPublished) {
        await api.unpublishSubmission(id);
        setResult(prev => prev ? { ...prev, isPublished: false } as any : prev);
      } else {
        await api.publishSubmission(id);
        setResult(prev => prev ? { ...prev, isPublished: true } as any : prev);
      }

      // Broadcast real-time publish event to all open student tabs/windows
      try {
        const pubChannel = new BroadcastChannel('aita_submission_events');
        pubChannel.postMessage({ type: 'SUBMISSION_PUBLISHED', submissionId: id, isPublished: !isCurrentlyPublished });
        pubChannel.close();
      } catch (e) {}
      localStorage.setItem('aita_last_publish_event', JSON.stringify({ type: 'SUBMISSION_PUBLISHED', submissionId: id, isPublished: !isCurrentlyPublished, timestamp: Date.now() }));
    } catch (e: any) {
      alert(e.message || 'Lỗi khi công bố điểm');
    } finally {
      setIsPublishing(false);
    }
  };

  useEffect(() => {
    if (!result && id) {
      api.getSubmissionResult(id)
        .then(res => {
          setResult(res);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || err.response?.data?.Message || "Failed to load result");
          setLoading(false);
        });
    }
  }, [id, result]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-red-500">
        <p>{error || "Result not found"}</p>
        <Link to="/" className="mt-4 inline-block text-emerald-500 hover:underline">Go back home</Link>
      </div>
    );
  }

  const extractQuestionNum = (title: string): number => {
    if (!title) return 999;
    const match = title.match(/(?:Question|Câu)\s*(\d+)/i) || title.match(/Q(\d+)/i);
    return match ? parseInt(match[1], 10) : 999;
  };

  const passedRules = result.rules || [];
  const failedRules = result.failedRules || [];
  const allRules = [...passedRules, ...failedRules]
    .map((r: any) => ({
      name: r.title || r.ruleId,
      description: r.description,
      passed: r.passed,
      score: r.earnedScore || 0,
      maxScore: r.weight || 0,
      details: r.details || r.reason || '',
      evidence: r.evidence,
    }))
    .sort((a, b) => extractQuestionNum(a.name) - extractQuestionNum(b.name));

  return (
    <div className="max-w-5xl mx-auto pb-8 -mt-2 sm:-mt-4">
      <button type="button" onClick={handleGoBack} className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-8 cursor-pointer bg-transparent border-none p-0 outline-none">
        <ArrowLeft size={18} />
        <span>Go back</span>
      </button>

      {/* Top Banner: Publish Status & Action */}
      <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            (result as any).isPublished
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800'
          }`}>
            {(result as any).isPublished ? <CheckCircle2 size={20} /> : <Clock size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                (result as any).isPublished
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {(result as any).isPublished ? 'PUBLISHED RESULT' : 'DRAFT STATUS (PENDING PUBLICATION)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {(result as any).isPublished
                ? 'Students can now view their grades and detailed feedback for this submission.'
                : 'Lecturer needs to review the result and click "Publish" to send grades to the student.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleTogglePublish}
          disabled={isPublishing}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all whitespace-nowrap cursor-pointer ${
            (result as any).isPublished
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/25'
          }`}
        >
          {isPublishing ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (result as any).isPublished ? (
            <RotateCcw size={16} />
          ) : (
            <Send size={16} />
          )}
          <span>
            {isPublishing
              ? 'Processing...'
              : (result as any).isPublished
                ? 'Unpublish (Back to Draft)'
                : '🚀 Publish result to student'}
          </span>
        </button>
      </div>

      <div className="space-y-8">
        <ScoreCard
          score={result.score}
          maxScore={result.maxScore}
          assessedAt={result.assessedAt || new Date().toISOString()}
          gradingTime={gradingTime}
        />

        {result.overallFeedback && (
          <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-100/50 dark:border-indigo-500/20 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-700/30">
                <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Mentor Feedback</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Synthesis evaluation & development strategy</p>
              </div>
            </div>
            <div className="prose prose-indigo dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-1 text-[15px] text-slate-700 dark:text-slate-300">
              <ReactMarkdown>{result.overallFeedback}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-8 md:col-span-2">
            <RuleList title="Rubric evaluation results" rules={allRules} />
          </div>
        </div>
      </div>
    </div>
  );
}




