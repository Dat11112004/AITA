import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, Search, Edit3, Trash2, Bot, Tag, CheckCircle2, XCircle } from 'lucide-react';

export function PromptListBySubject() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  const [prompts, setPrompts] = useState<any[]>([]);
  const [subject, setSubject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [promptsData, subjectsData] = await Promise.all([
          api.getPromptTemplates(subjectId),
          api.getSubjects(1, 100)
        ]);

        setPrompts(Array.isArray(promptsData) ? promptsData : []);

        const subList = Array.isArray(subjectsData) ? subjectsData : (subjectsData as any)?.data || [];
        const currentSub = subList.find((s: any) => s.id === subjectId || s.code === subjectId);
        setSubject(currentSub || { id: subjectId, name: subjectId, code: subjectId });
      } catch (err) {
        console.error('Failed to load prompts for subject:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [subjectId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa Prompt này?')) return;
    try {
      setDeletingId(id);
      await api.deletePromptTemplate(id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete prompt:', err);
      alert('Không thể xóa prompt!');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPrompts = prompts.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.templateContent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/lecturer/prompts')}
            className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider">
              <span>{subject?.code || 'Môn học'}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{subject?.name || 'Danh sách Prompt'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={() => navigate(`/lecturer/prompts/${subjectId}/create`)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus size={18} /> Tạo Prompt mới
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mb-4"></div>
          <p className="text-slate-500 font-medium">Đang tải danh sách mẫu Prompt...</p>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-center">
          <Bot size={48} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Chưa có Prompt nào</h3>
          <p className="text-slate-500 text-sm max-w-md mt-1 mb-4">Hãy tạo Prompt template đầu tiên cho môn học này để hỗ trợ sinh viên hoặc AI tạo bài tập.</p>
          <button
            onClick={() => navigate(`/lecturer/prompts/${subjectId}/create`)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            <Plus size={18} /> Tạo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPrompts.map((prompt) => (
            <div key={prompt.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-lg">{prompt.name}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {prompt.isActive !== false ? (
                      <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 size={12} /> Khả dụng
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <XCircle size={12} /> Tắt
                      </span>
                    )}
                  </div>
                </div>

                {prompt.category && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                    <Tag size={14} className="text-brand-500" />
                    <span>{prompt.category}</span>
                  </div>
                )}

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-sm font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {prompt.templateContent}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Lượt sử dụng: {prompt.usageCount || 0}</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/lecturer/prompts/${subjectId}/edit/${prompt.id}`)}
                    className="p-2 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    disabled={deletingId === prompt.id}
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
