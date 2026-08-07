import { useState, useEffect } from 'react';
import ProgressRing from './ProgressRing';
import { Clock, Pencil, Check, X, Loader2 } from 'lucide-react';

interface ScoreCardProps {
  score: number;
  maxScore: number;
  assessedAt: string;
  gradingTime?: number;
  isStudent?: boolean;
  onUpdateScore?: (newScore: number) => Promise<void>;
}

export default function ScoreCard({
  score,
  maxScore,
  assessedAt,
  gradingTime,
  isStudent = false,
  onUpdateScore,
}: ScoreCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editScore, setEditScore] = useState<string>(score.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditScore(score.toString());
  }, [score]);

  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;

  let feedback = 'Needs Improvement';
  if (percent >= 85) feedback = 'Excellent Work!';
  else if (percent >= 70) feedback = 'Good Job';
  else if (percent >= 50) feedback = 'Passed';

  const handleSave = async () => {
    const num = parseFloat(editScore);
    if (isNaN(num) || num < 0 || num > maxScore) {
      alert(`Please enter a valid score between 0 and ${maxScore}`);
      return;
    }
    if (onUpdateScore) {
      try {
        setSaving(true);
        await onUpdateScore(num);
        setIsEditing(false);
      } catch (err: any) {
        alert(err.message || 'Failed to update score');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="relative bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-brand-50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none opacity-60"></div>

      <div className="shrink-0 relative z-10 flex flex-col items-center">
        <ProgressRing score={score} maxScore={maxScore} size={110} strokeWidth={8} />

        {/* Pencil Edit button under progress ring */}
        {!isStudent && onUpdateScore && !isEditing && (
          <button
            onClick={() => {
              setEditScore(score.toString());
              setIsEditing(true);
            }}
            className="mt-3.5 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/40 hover:text-brand-600 dark:hover:text-brand-400 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm"
          >
            <Pencil size={13} />
            <span>Edit Score</span>
          </button>
        )}

        {!isStudent && isEditing && (
          <div className="mt-3.5 flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-brand-400 dark:border-brand-600 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <input
              type="number"
              min={0}
              max={maxScore}
              step={0.5}
              value={editScore}
              onChange={(e) => setEditScore(e.target.value)}
              className="w-16 px-2.5 py-1 text-xs font-bold text-center border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg cursor-pointer transition-colors"
              title="Save"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
              title="Cancel"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 text-center md:text-left relative z-10">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">{feedback}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-base mb-6 font-medium">Your project has been analyzed successfully.</p>

        <div className="flex flex-wrap justify-center md:justify-start gap-3">
          {gradingTime !== undefined && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-brand-50/80 dark:bg-slate-800/50 rounded-xl border border-brand-100/50 dark:border-slate-800/80">
              <div className="p-1.5 bg-brand-100 dark:bg-slate-700 rounded-lg">
                <Clock className="text-brand-600 dark:text-brand-400" size={16} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-extrabold text-brand-500 dark:text-slate-400 uppercase tracking-widest">Evaluation Time</span>
                <span className="text-sm font-bold text-brand-900 dark:text-slate-300 font-mono mt-0.5">
                  {Math.floor(gradingTime / 60).toString().padStart(2, '0')}:{(gradingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div className="p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-100 dark:border-none">
              <Clock className="text-slate-500 dark:text-slate-400" size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Date Assessed</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-300 mt-0.5">
                {new Date(assessedAt).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
