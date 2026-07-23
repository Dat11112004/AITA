import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export function PromptCreateEdit() {
  const { subjectId, promptId } = useParams<{ subjectId: string; promptId?: string }>();
  const navigate = useNavigate();

  const isEditing = Boolean(promptId);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Chung',
    templateContent: '',
    temperature: 0.7,
    isActive: true,
  });

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;

    if (isEditing && promptId) {
      const fetchPrompt = async () => {
        try {
          setIsLoading(true);
          const prompts = await api.getPromptTemplates(subjectId);
          const target = prompts?.find((p: any) => p.id === promptId);
          if (target) {
            setFormData({
              name: target.name || '',
              category: target.category || 'Chung',
              templateContent: target.templateContent || '',
              temperature: target.temperature ?? 0.7,
              isActive: target.isActive !== false,
            });
          }
        } catch (err) {
          console.error('Failed to fetch prompt details:', err);
          setError('Không thể tải chi tiết Prompt.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchPrompt();
    }
  }, [subjectId, promptId, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.templateContent.trim()) {
      setError('Vui lòng nhập tên và nội dung prompt.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        ...formData,
        subjectId,
      };

      if (isEditing && promptId) {
        await api.updatePromptTemplate(promptId, payload);
      } else {
        await api.createPromptTemplate(payload);
      }

      navigate(`/lecturer/prompts/${subjectId}`);
    } catch (err: any) {
      console.error('Failed to save prompt:', err);
      setError(err?.response?.data?.error || err?.message || 'Lỗi khi lưu Prompt.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mb-4"></div>
        <p className="text-slate-500 font-medium">Đang tải thông tin Prompt...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <button
          onClick={() => navigate(`/lecturer/prompts/${subjectId}`)}
          className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          title="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Chỉnh sửa Prompt Template' : 'Tạo mới Prompt Template'}
          </h1>
          <p className="text-slate-500 text-sm">Điền thông tin và nội dung mẫu prompt gợi ý cho sinh viên hoặc giảng viên</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Tên Prompt <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Đề bài React & Express REST API"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Danh mục / Thể loại</label>
            <input
              type="text"
              placeholder="VD: Web Development, Thuật toán, Backend..."
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2">
            Nội dung Prompt Mẫu <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={8}
            placeholder="Nhập nội dung mẫu prompt..."
            value={formData.templateContent}
            onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
            className="w-full p-4 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all resize-y"
            required
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
            />
            <span className="text-sm font-bold text-slate-700">Kích hoạt Prompt này</span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/lecturer/prompts/${subjectId}`)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
            >
              <Save size={18} />
              {isSaving ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Lưu Prompt'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
