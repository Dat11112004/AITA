import { useState, useEffect } from 'react';
import { gradingApi as api } from '@/lib/api';
import type { PublishedAssignment, RubricRule } from '@/types';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import classNames from 'classnames';

export default function AssignmentRubricPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<PublishedAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getAssignment(id || 'student-management-system');
        setAssignment(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading rubric...</div>;
  if (!assignment) return <div className="text-center py-20 text-red-400">Assignment not found</div>;

  return (
    <div className="max-w-5xl mx-auto pb-8 -mt-2 sm:-mt-4">
      <div className="mb-6 animate-fade-in">
          <button onClick={() => navigate(`/lecturer/grading/assignments/${id}`)} className="text-slate-400 hover:text-brand-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
            <ArrowLeft size={20} />
            Back to assignment
          </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
            <div>
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-400 mb-2">
                <BookOpen size={24} />
                <span className="font-semibold uppercase tracking-wider text-sm">Assignment Rubric</span>
            </div>
            <h1 className="text-2xl font-bold dark:text-white text-slate-900">{assignment.metadata?.title || 'Assignment'}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Pass threshold: {assignment.rubric?.passThreshold ? assignment.rubric.passThreshold * 100 : 70}%</p>
            </div>
        </div>
        
        <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
            <thead>
                <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <th className="px-8 py-4 font-semibold dark:text-slate-400 text-slate-500">Category</th>
                <th className="px-8 py-4 font-semibold dark:text-slate-400 text-slate-500">Requirement</th>
                <th className="px-6 py-4 font-semibold dark:text-slate-400 text-slate-500 text-center">Grading</th>
                <th className="px-8 py-4 font-semibold dark:text-slate-400 text-slate-500 text-right">Points</th>
                </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700/30 divide-slate-200/50">
                {assignment.rubric?.rules?.map((rule: RubricRule, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4 text-sm font-medium dark:text-slate-400 text-slate-500">{rule.category || 'General'}</td>
                    <td className="px-8 py-4 dark:text-slate-200 text-slate-700">
                    <p className="font-semibold dark:text-brand-300 text-brand-600">{rule.name || rule.title || 'Rule'}</p>
                    <p className="text-sm dark:text-slate-400 text-slate-500 mt-1 leading-relaxed">{rule.description}</p>
                    {rule.tags && rule.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                        {rule.tags.map((tag: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded text-xs font-medium dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 border dark:border-slate-700 border-slate-200">
                            #{tag}
                            </span>
                        ))}
                        </div>
                    )}
                    {rule.scoringStrategy === 'StdInOutProbe' && rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases && (
                        <div className="mt-4 pt-4 border-t dark:border-slate-700/50 border-slate-200/50">
                        <p className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider mb-2">I/O test cases</p>
                        <div className="flex flex-col gap-2">
                            {rule.requiredEvidence[0].stdInOutProbe.testCases.map((tc: any, i: number) => (
                            <div key={i} className="dark:bg-slate-900/50 bg-slate-50 rounded border dark:border-slate-700/50 border-slate-200/50 p-2 text-xs font-mono grid grid-cols-2 gap-2">
                                <div>
                                <span className="dark:text-slate-500 text-slate-400">In:</span> <span className="dark:text-slate-300 text-slate-700 whitespace-pre-wrap">{tc.input}</span>
                                </div>
                                <div>
                                <span className="dark:text-slate-500 text-slate-400">Out:</span> <span className="dark:text-emerald-400/80 text-emerald-600 whitespace-pre-wrap">{tc.expectedOutput}</span>
                                </div>
                            </div>
                            ))}
                        </div>
                        </div>
                    )}
                    {rule.criteria && rule.criteria.length > 0 && (
                        <div className="mt-4 p-4 dark:bg-slate-900 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200">
                        <p className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider mb-2">Grading criteria</p>
                        <ul className="space-y-1">
                            {rule.criteria.map((c: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0"></div>
                                <span className="dark:text-slate-300 text-slate-600">{c}</span>
                            </li>
                            ))}
                        </ul>
                        </div>
                    )}
                    </td>
                    <td className="px-6 py-4 text-center">
                    <span className={classNames(
                        "px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider",
                        rule.scoringStrategy === 'AIVision' 
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                            : rule.scoringStrategy === 'StdInOutProbe' || rule.scoringStrategy === 'HTTPProbe'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : rule.scoringStrategy === 'AICodeReview' || rule.scoringStrategy === 'AiTextAnalysis'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        )}>
                        {rule.scoringStrategy === 'AIVision' ? '👁 Visual' : rule.scoringStrategy === 'StdInOutProbe' ? '⌨️ I/O test' : rule.scoringStrategy === 'HTTPProbe' ? '🌐 API probe' : rule.scoringStrategy === 'AICodeReview' ? '🤖 AI review' : rule.scoringStrategy === 'AiTextAnalysis' ? '📝 Text analysis' : '⚡ Auto'}
                    </span>
                    </td>
                    <td className="px-8 py-4 text-right font-bold dark:text-emerald-400 text-emerald-600">{typeof (rule as any).weight === 'number' ? (rule as any).weight.toString() : (rule as any).weight}</td>
                </tr>
                ))}
                <tr className="dark:bg-slate-900/30 bg-slate-100">
                <td colSpan={3} className="px-8 py-4 font-bold dark:text-slate-300 text-slate-700 text-right">Total possible score</td>
                <td className="px-8 py-4 text-right font-bold dark:text-white text-slate-900 text-xl">{(assignment.rubric as any)?.totalWeight || 0}</td>
                </tr>
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
