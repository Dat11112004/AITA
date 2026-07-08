import { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import type { SubmissionResponse } from '@/types';
import ScoreCard from '@/components/modules/grading/ScoreCard';
import RuleList from '@/components/modules/grading/RuleList';
import { ArrowLeft } from 'lucide-react';
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

      <div className="space-y-8">
        <ScoreCard 
          score={result.score} 
          maxScore={result.maxScore} 
          assessedAt={result.assessedAt || new Date().toISOString()} 
          gradingTime={gradingTime}
        />

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-8 md:col-span-2">
            <RuleList title="Rubric evaluation results" rules={allRules} />
          </div>
        </div>
      </div>
    </div>
  );
}




