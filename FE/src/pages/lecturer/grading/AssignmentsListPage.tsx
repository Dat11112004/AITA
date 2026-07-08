import { useState, useEffect } from 'react';
import { gradingApi as api } from '@/lib/api';
import type { PublishedAssignment } from '@/types';
import { Book, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AssignmentsListPage() {
  const [assignments, setAssignments] = useState<PublishedAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAssignments();
      setAssignments(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
      await api.deleteAssignment(id);
      setAssignments(assignments.filter(a => a.id !== id));
    } catch (err: any) {
      alert('Failed to delete assignment: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-slate-900 mb-2">Manage assignments</h1>
          <p className="dark:text-slate-400 text-slate-500">View, manage, and evaluate student submissions for your assignments.</p>
        </div>
        <button 
          onClick={loadAssignments}
          className="p-2 dark:text-slate-400 text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
          title="Refresh list"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/30 rounded text-rose-500">
          {error}
        </div>
      )}

      {!loading && assignments.length === 0 && !error && (
        <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <Book size={48} className="mx-auto mb-4 dark:text-slate-600 text-slate-300" />
          <h3 className="text-xl font-medium dark:text-slate-300 text-slate-600 mb-2">No assignments found</h3>
          <p className="dark:text-slate-500 text-slate-400 mb-6">Create a new assignment to get started.</p>
          <button 
            onClick={() => navigate('/lecturer/grading/assignments/upload')}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium transition-colors"
          >
            Create new assignment
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map(assignment => (
          <div 
            key={assignment.id} 
            onClick={() => navigate(`/lecturer/grading/assignments/${assignment.id}`)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md p-6 cursor-pointer group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden rounded-xl"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 dark:bg-slate-800 bg-slate-100 rounded text-emerald-500">
                  <Book size={20} />
                </div>
                <h2 className="text-xl font-bold dark:text-white text-slate-800 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors line-clamp-1" title={assignment.metadata?.title || 'Untitled'}>
                  {assignment.metadata?.title || 'Untitled'}
                </h2>
              </div>
              <button 
                onClick={(e) => handleDelete(assignment.id, e)}
                className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors z-10"
                title="Delete assignment"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <p className="dark:text-slate-400 text-slate-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
              {assignment.metadata?.description || 'No description provided.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="px-2 py-1 text-[10px] font-bold uppercase rounded border dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 bg-emerald-50 text-emerald-600 border-emerald-200">
                {assignment.metadata?.projectType || 'Unknown'}
              </span>
              <span className="px-2 py-1 text-[10px] font-bold uppercase rounded border dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 bg-slate-100 text-slate-500 border-slate-200">
                v{assignment.version || '1.0.0'}
              </span>
              <span className="px-2 py-1 text-[10px] font-bold uppercase rounded border dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 bg-amber-50 text-amber-600 border-amber-200">
                {assignment.rubric?.rules?.length || 0} rules
              </span>
            </div>

            <div className="mt-4 pt-4 border-t dark:border-slate-700/50 border-slate-200/50 flex items-center text-sm font-medium dark:text-emerald-400 text-emerald-600">
              <span className="flex items-center gap-1">
                View grading results <ExternalLink size={14} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




