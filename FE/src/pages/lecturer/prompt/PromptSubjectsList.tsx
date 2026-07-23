import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Search, ArrowRight, Bot, Sparkles, Folder } from 'lucide-react';

export function PromptSubjectsList() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoading(true);
        const data = await api.getSubjects(1, 100);
        setSubjects(Array.isArray(data) ? data : (data as any)?.data || []);
      } catch (err) {
        console.error('Failed to load subjects:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const filteredSubjects = subjects.filter((s) =>
    s.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quản lý Gợi ý Prompt</h1>
            <p className="text-slate-500 text-sm">Chọn môn học để xem, chỉnh sửa hoặc tạo mới các mẫu Prompt AI</p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm môn học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mb-4"></div>
          <p className="text-slate-500 font-medium">Đang tải danh sách môn học...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-center">
          <Folder size={48} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Không tìm thấy môn học nào</h3>
          <p className="text-slate-500 text-sm max-w-md mt-1">Chưa có môn học nào được hệ thống ghi nhận hoặc không phù hợp với từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              onClick={() => navigate(`/lecturer/prompts/${subject.id}`)}
              className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100">
                    {subject.code}
                  </span>
                  <Sparkles size={16} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg group-hover:text-brand-600 transition-colors line-clamp-1">
                  {subject.name}
                </h3>
                <p className="text-slate-500 text-sm mt-1 line-clamp-2 min-h-[40px]">
                  {subject.description || 'Chưa có mô tả môn học.'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                <span>Quản lý Prompt</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
