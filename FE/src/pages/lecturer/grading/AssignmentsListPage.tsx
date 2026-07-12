import { useState, useEffect, useMemo } from 'react';
import { gradingApi as api } from '@/lib/api';
import type { PublishedAssignment } from '@/types';
import { 
  ListTodo, Plus, Search, Filter, Calendar, Clock, 
  Users, MoreVertical, Code, Globe, Cpu, FileText, 
  ChevronRight, ChevronLeft, LayoutGrid, Trash2, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// -- Helpers --
const getMockStats = (id: string) => {
  // Use first few chars of ID to generate deterministic pseudo-random numbers
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  
  const totalStudents = 20 + (hash % 40); // 20 to 60
  const submitted = Math.floor(totalStudents * (0.4 + ((hash % 60) / 100))); // 40% to 100%
  const percentage = Math.round((submitted / totalStudents) * 100);
  
  const daysOffsetCreated = hash % 30;
  const daysOffsetDeadline = (hash % 15) + 2;
  
  const createdDate = new Date();
  createdDate.setDate(createdDate.getDate() - daysOffsetCreated);
  
  const deadlineDate = new Date();
  deadlineDate.setDate(createdDate.getDate() + daysOffsetDeadline);
  
  return {
    totalStudents,
    submitted,
    percentage,
    createdStr: createdDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    deadlineStr: deadlineDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' 23:59'
  };
};

const getProjectTypeInfo = (type: string = '') => {
  const t = type.toLowerCase();
  if (t.includes('mobile')) return { icon: Code, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-600', lightBg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800', tag: 'MOBILE' };
  if (t.includes('web') || t.includes('frontend')) return { icon: Globe, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', tag: 'WEB' };
  if (t.includes('ai') || t.includes('algorithm')) return { icon: Cpu, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', lightBg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800', tag: 'AI & DATA' };
  if (t.includes('backend')) return { icon: LayoutGrid, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800', tag: 'BACKEND' };
  if (t.includes('fullstack')) return { icon: LayoutGrid, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-600', lightBg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800', tag: 'FULLSTACK' };
  return { icon: FileText, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-400', lightBg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', tag: 'KHÁC' };
};

// -- Components --
const CircularProgress = ({ value }: { value: number }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  let strokeColor = 'text-blue-600 dark:text-blue-400';
  if (value >= 90) strokeColor = 'text-emerald-500 dark:text-emerald-400';
  else if (value < 50) strokeColor = 'text-amber-500 dark:text-amber-400';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-14 h-14 transform -rotate-90">
        <circle className="text-slate-100 dark:text-slate-700/50" strokeWidth="3.5" stroke="currentColor" fill="transparent" r={radius} cx="28" cy="28" />
        <circle 
          className={`${strokeColor} transition-all duration-1000 ease-out`} 
          strokeWidth="3.5" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round" 
          stroke="currentColor" 
          fill="transparent" 
          r={radius} 
          cx="28" 
          cy="28" 
        />
      </svg>
      <span className="absolute text-[12px] font-bold text-slate-700 dark:text-slate-300">{value}%</span>
    </div>
  );
};

export default function AssignmentsListPage() {
  const [assignments, setAssignments] = useState<PublishedAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

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

  const confirmDelete = async () => {
    if (!deleteModalId) return;
    try {
      await api.deleteAssignment(deleteModalId);
      setAssignments(assignments.filter(a => a.id !== deleteModalId));
      setDeleteModalId(null);
    } catch (err: any) {
      alert('Lỗi khi xóa bài tập: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  // Derive Tabs from projectTypes or subjects
  const tabs = useMemo(() => {
    const counts: Record<string, number> = { 'Tất cả': assignments.length };
    assignments.forEach(a => {
      let t = a.metadata?.projectType?.toLowerCase() || 'khác';
      // Grouping map
      if (t.includes('mobile')) t = 'Mobile Development';
      else if (t.includes('web') || t.includes('frontend')) t = 'Web Programming';
      else if (t.includes('ai') || t.includes('algorithm')) t = 'AI & Data';
      else if (t.includes('backend') || t.includes('fullstack')) t = 'Backend / Fullstack';
      else t = 'Khác';
      
      counts[t] = (counts[t] || 0) + 1;
    });
    
    // Sort logic to ensure 'Tất cả' is first, 'Khác' is last
    return Object.entries(counts).sort((a, b) => {
      if (a[0] === 'Tất cả') return -1;
      if (b[0] === 'Tất cả') return 1;
      if (a[0] === 'Khác') return 1;
      if (b[0] === 'Khác') return -1;
      return b[1] - a[1];
    });
  }, [assignments]);

  // Filtering
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      // Tab filter
      let t = a.metadata?.projectType?.toLowerCase() || 'khác';
      let tabName = 'Khác';
      if (t.includes('mobile')) tabName = 'Mobile Development';
      else if (t.includes('web') || t.includes('frontend')) tabName = 'Web Programming';
      else if (t.includes('ai') || t.includes('algorithm')) tabName = 'AI & Data';
      else if (t.includes('backend') || t.includes('fullstack')) tabName = 'Backend / Fullstack';

      if (activeTab !== 'Tất cả' && tabName !== activeTab) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = (a.metadata?.title || '').toLowerCase();
        const desc = (a.metadata?.description || '').toLowerCase();
        if (!title.includes(query) && !desc.includes(query)) return false;
      }
      
      return true;
    });
  }, [assignments, activeTab, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const paginatedAssignments = filteredAssignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page if filtered results are fewer than current page
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  return (
    <div className="max-w-[1200px] mx-auto pt-2 pb-8 px-6 lg:px-8 bg-transparent relative">
      
      {/* Invisible overlay to close dropdowns */}
      {dropdownOpenId && (
        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setDropdownOpenId(null); }}></div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-brand-200/50 dark:border-brand-800/50">
            <ListTodo size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white text-slate-900">Quản lý bài tập</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Quản lý và đánh giá bài tập theo môn học một cách dễ dàng.</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/lecturer/grading/assignments/upload')}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus size={18} />
          Tạo bài tập mới
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="relative w-full md:w-64">
          <select className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-10 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium text-sm">
            <option>Tất cả môn học</option>
            {/* Real subject list could be mapped here */}
          </select>
          <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
             <ChevronRight size={16} className="rotate-90" />
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Tìm bài tập..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full pl-10 pr-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        {tabs.map(([name, count]) => {
          const isActive = activeTab === name;
          return (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-brand-600 text-white shadow-sm' 
                  : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {name}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error / Empty State */}
      {error && (
        <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500">
          {error}
        </div>
      )}

      {!loading && filteredAssignments.length === 0 && !error && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
          <ListTodo size={48} className="mx-auto mb-4 dark:text-slate-600 text-slate-300" />
          <h3 className="text-xl font-medium dark:text-slate-300 text-slate-600 mb-2">Không tìm thấy bài tập nào</h3>
          <p className="dark:text-slate-500 text-slate-400 text-sm">Thử thay đổi bộ lọc hoặc tạo bài tập mới.</p>
        </div>
      )}

      {/* List Layout */}
      <div className="space-y-4 mb-8">
        {paginatedAssignments.map(assignment => {
          const typeInfo = getProjectTypeInfo(assignment.metadata?.projectType);
          const Icon = typeInfo.icon;
          const stats = getMockStats(assignment.id);

          return (
            <div 
              key={assignment.id} 
              onClick={() => navigate(`/lecturer/grading/assignments/${assignment.id}`)}
              className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-5 relative cursor-pointer"
            >
              {/* Left: Icon Block */}
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.bg} text-white shadow-sm`}>
                <Icon size={28} strokeWidth={2} />
              </div>
              
              {/* Middle: Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[15px] font-bold text-slate-800 dark:text-white uppercase truncate" title={assignment.metadata?.title || 'Untitled'}>
                    {assignment.metadata?.title || 'Untitled'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeInfo.lightBg} ${typeInfo.color} ${typeInfo.border} border whitespace-nowrap`}>
                    {typeInfo.tag}
                  </span>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-3 pr-4">
                  {assignment.metadata?.description || 'No description provided.'}
                </p>
                
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Tạo: {stats.createdStr}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span>Hạn nộp: {stats.deadlineStr}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-slate-400" />
                    <span>{stats.totalStudents} sinh viên</span>
                  </div>
                </div>
              </div>

              {/* Right: Stats & Actions */}
              <div className="flex items-center gap-6 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/50 justify-between md:justify-end md:ml-4">
                
                {/* Stats Block */}
                <div className="flex items-center gap-6 mr-2">
                  <div className="text-center">
                    <div className="text-[15px] font-bold text-slate-800 dark:text-white">
                      {stats.submitted}/{stats.totalStudents}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                      Đã nộp
                    </div>
                  </div>
                  
                  <div className="text-center flex flex-col items-center">
                    <CircularProgress value={stats.percentage} />
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">
                      Hoàn thành
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 relative z-50">
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDropdownOpenId(dropdownOpenId === assignment.id ? null : assignment.id); }}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                      title="Thêm tùy chọn"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {dropdownOpenId === assignment.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-xl overflow-hidden py-1 z-50">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDropdownOpenId(null); setDeleteModalId(assignment.id); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left font-medium"
                        >
                          <Trash2 size={16} />
                          Xóa bài tập
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {!loading && filteredAssignments.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Hiển thị <span className="font-medium text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredAssignments.length)}</span> trong <span className="font-medium text-slate-700 dark:text-slate-300">{filteredAssignments.length}</span> bài tập
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-slate-800 shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                  currentPage === i + 1
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white dark:bg-slate-800 shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">Xác nhận xóa</h3>
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
                Bạn có chắc chắn muốn xóa bài tập này không? Thao tác này không thể hoàn tác và tất cả dữ liệu liên quan sẽ bị mất.
              </p>
            </div>
            <div className="flex border-t border-slate-100 dark:border-slate-700/50">
              <button 
                onClick={() => setDeleteModalId(null)}
                className="flex-1 px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Hủy bỏ
              </button>
              <div className="w-px bg-slate-100 dark:bg-slate-700/50"></div>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
