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
    <div className="max-w-6xl mx-auto pb-8 -mt-2 sm:-mt-4">
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
                    {(() => {
                        let text = 'AUTO';
                        let colorClass = 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700';
                        
                        switch (rule.scoringStrategy) {
                            case 'AIVision':
                                text = 'VISUAL AI';
                                colorClass = 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200 dark:text-fuchsia-300 dark:bg-fuchsia-500/10 dark:border-fuchsia-500/20 shadow-[0_0_10px_rgba(217,70,239,0.1)]';
                                break;
                            case 'AICodeReview':
                                text = 'CODE AI';
                                colorClass = 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]';
                                break;
                            case 'AiTextAnalysis':
                                text = 'TEXT AI';
                                colorClass = 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]';
                                break;
                            case 'StdInOutProbe':
                                text = 'I/O PROBE';
                                colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
                                break;
                            case 'HTTPProbe':
                                text = 'API PROBE';
                                colorClass = 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-500/10 dark:border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.1)]';
                                break;
                        }
                        
                        return (
                            <div className={classNames("inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold border whitespace-nowrap tracking-wider", colorClass)}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75"></span>
                                {text}
                            </div>
                        );
                    })()}
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
