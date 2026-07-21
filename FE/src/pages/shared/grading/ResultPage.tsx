import { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import type { SubmissionResponse } from '@/types';
import ScoreCard from '@/components/modules/grading/ScoreCard';
import RuleList from '@/components/modules/grading/RuleList';
import { ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { gradingApi as api } from '@/lib/api';

export default function ResultPage() {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const [result, setResult] = useState<SubmissionResponse | null>((location.state?.result as SubmissionResponse) || null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);

  const gradingTime = location.state?.gradingTime as number | undefined;

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

  const passedRules = result.rules || [];
  const failedRules = result.failedRules || [];
  const allRules = [...passedRules, ...failedRules].map((r: any) => ({
    name: r.title || r.ruleId,
    description: r.description,
    passed: r.passed,
    score: r.earnedScore || 0,
    maxScore: r.weight || 0,
    details: r.details || r.reason || '',
    evidence: r.evidence,
  }));

  return (
    <div className="max-w-5xl mx-auto pb-8 -mt-2 sm:-mt-4">
      <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-8 cursor-pointer bg-transparent border-none p-0 outline-none">
        <ArrowLeft size={18} />
        <span>Go back</span>
      </button>

      {result.error && (
        <div className="mb-8 p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-start gap-4 shadow-sm animate-fade-in">
          <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-red-100 dark:border-red-500/20">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-1">⚠️ Báo Cáo Chấm Điểm Dở Dang</h3>
            <p className="text-[15px] text-red-700/80 dark:text-red-300/80 leading-relaxed">
              Bài chấm bị ngắt quãng giữa chừng do lỗi: <strong>{result.error}</strong>.
              <br />
              Dưới đây là điểm số và chi tiết của các tiêu chí đã được AI phân tích trước khi hệ thống bị gián đoạn.
            </p>
          </div>
        </div>
      )}

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
                <p className="text-sm text-slate-500 dark:text-slate-400">Tổng hợp đánh giá & chiến lược phát triển</p>
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




