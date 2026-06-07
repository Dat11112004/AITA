import {
  Upload,
  Bot,
  Brain,
  LayoutDashboard,
  TrendingUp,
  MessageSquare,
  BookOpen,
  Bell,
  ClipboardList,
  Sparkles,
  GitBranch,
  BarChart3,
  Megaphone,
  Users,
  Database,
  Link2,
  FileText,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Server,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

const STUDENT_FEATURES = [
  {
    id: 'FE-S-01',
    icon: Upload,
    title: 'Exercise Submission',
    desc: 'Cho phép sinh viên upload bài tập lập trình (mã nguồn). Hỗ trợ nhiều định dạng file và thực thi deadline, ổn định quy trình nộp bài.',
  },
  {
    id: 'FE-S-02',
    icon: Bot,
    title: 'AI Code Feedback',
    desc: 'AI phân tích mã nguồn sinh viên theo các tham số cụ thể — trả về lỗi kiến trúc, metrics chất lượng code, và gợi ý cải thiện logic ngữ nghĩa.',
  },
  {
    id: 'FE-S-03',
    icon: Brain,
    title: 'Adaptive Practice',
    desc: 'Hệ thống tạo hoặc trình bày bài tập lập trình dựa trên trình độ hiện tại và kết quả trước đó. AI phân loại độ khó và đề xuất lộ trình học tối ưu.',
  },
  {
    id: 'FE-S-04',
    icon: LayoutDashboard,
    title: 'Course Dashboard',
    desc: 'Cho phép sinh viên xem tổng quan các môn học, deadline sắp tới, và thông báo khẩn cấp. Dashboard cung cấp trạng thái khóa học chính xác.',
  },
  {
    id: 'FE-S-05',
    icon: TrendingUp,
    title: 'Progress Tracking',
    desc: 'Theo dõi tiến độ và kết quả học tập thời gian thực — biểu đồ hiệu suất, thời gian hoàn thành ước tính, và trạng thái xử lý bài tập (đã chấm/đã nộp).',
  },
  {
    id: 'FE-S-06',
    icon: MessageSquare,
    title: 'Discussion Forum',
    desc: 'Tính năng diễn đàn thảo luận, cho phép sinh viên kết nối với bạn bè và giảng viên qua video call hoặc chat — nhận tư vấn học thuật chuyên sâu.',
  },
  {
    id: 'FE-S-07',
    icon: BookOpen,
    title: 'Assignment History & Repository',
    desc: 'Xem và quản lý bài tập đã nộp, mã nguồn, điểm số và feedback. Hệ thống lưu trữ lịch sử nộp bài giúp sinh viên theo dõi tiến trình học tập.',
  },
  {
    id: 'FE-S-08',
    icon: Bell,
    title: 'Assignment Reminder & Notification',
    desc: 'Thông báo tự động và nhắc nhở deadline bài tập, kết quả chấm bài, thông báo khóa học và sự kiện học thuật quan trọng.',
  },
]

const LECTURER_FEATURES = [
  {
    id: 'FE-L-01',
    icon: ClipboardList,
    title: 'Course Management',
    desc: 'Hiển thị danh sách yêu cầu học thuật từ khoa. Giảng viên xem chi tiết môn học (giáo trình, sinh viên đăng ký, TA), chấp nhận/từ chối vai trò, và nhận cập nhật thời gian thực.',
  },
  {
    id: 'FE-L-02',
    icon: Sparkles,
    title: 'AI Exercise Generation',
    desc: 'AI tạo bài tập lập trình và test case mới. Hệ thống phân tích cấp độ môn, quy mô bài, mục tiêu học tập để cung cấp bài tập phù hợp và đề xuất tiêu chí (SOPs).',
  },
  {
    id: 'FE-L-03',
    icon: GitBranch,
    title: 'Teamwork Assessment',
    desc: 'Tích hợp version control (Git), hiển thị biểu đồ đóng góp tối ưu, thời gian làm việc ước tính, và cảnh báo đóng góp thời gian thực.',
  },
  {
    id: 'FE-L-04',
    icon: BarChart3,
    title: 'Grading Dashboard',
    desc: 'Quản lý nhiệm vụ đánh giá — danh sách bài tập hiện tại/đã hoàn thành, cập nhật trạng thái, báo cáo chấm bài, xem mã nguồn sinh viên, và gợi ý coaching sau chấm bài.',
  },
  {
    id: 'FE-L-05',
    icon: Megaphone,
    title: 'Notification System',
    desc: 'Quản lý và phân phối thông báo học thuật — nhắc nhở deadline, lịch thi, kết quả chấm, cảnh báo đạo văn, và thông báo khẩn cấp đến sinh viên và giảng viên.',
  },
]

const ADMIN_FEATURES = [
  {
    id: 'FE-A-01',
    icon: Users,
    title: 'User Management',
    desc: 'Quản lý tất cả tài khoản trên hệ thống AITA. Chức năng: tạo/sửa/xóa/khóa tài khoản, phân quyền, xem thông tin chi tiết, giám sát trạng thái hoạt động, và xử lý khiếu nại.',
  },
  {
    id: 'FE-A-02',
    icon: Database,
    title: 'Subject Database',
    desc: 'Quản lý cơ sở dữ liệu chương trình môn học/công nghệ. Thêm/sửa/xóa thông tin, cập nhật code examples, mức độ khó, đặc điểm nhận dạng — dữ liệu phục vụ AI Code Feedback.',
  },
  {
    id: 'FE-A-03',
    icon: Link2,
    title: 'School System Integration',
    desc: 'Quản lý danh sách hệ thống trường tích hợp. Thêm/sửa/xóa thông tin, cập nhật vị trí trên mạng, data APIs khả dụng, thời gian hoạt động API, và đánh giá chất lượng.',
  },
  {
    id: 'FE-A-04',
    icon: FileText,
    title: 'Content Management',
    desc: 'Quản lý nội dung nền tảng AITA — bài viết giáo dục, tin tức, thông báo, hướng dẫn sử dụng, tài liệu đào tạo. Tạo/sửa/xóa/duyệt nội dung, quản lý danh mục và lên lịch đăng tự động.',
  },
  {
    id: 'FE-A-05',
    icon: PieChart,
    title: 'Academic Analytics',
    desc: 'Phân tích dữ liệu thống kê và hiệu suất hệ thống — biểu đồ số lượng đánh giá theo thời gian, phân bố tiến độ sinh viên, hiệu suất giảng viên, thời gian chấm bài trung bình, và KPIs.',
  },
  {
    id: 'FE-A-06',
    icon: ShieldCheck,
    title: 'Security & Logs',
    desc: 'Quản lý security logs và audit trails — theo dõi hoạt động người dùng, lịch sử đăng nhập, thay đổi dữ liệu, hành động quản trị. Phát hiện hoạt động đáng ngờ và tạo báo cáo kiểm toán.',
  },
]

const LIMITATIONS = [
  {
    id: 'LI-01',
    icon: Bot,
    desc: 'AI Code Feedback và Adaptive Practice chỉ cung cấp hỗ trợ và đề xuất học tập. Hệ thống không thay thế đánh giá, chấm điểm, hoặc hướng dẫn chính thức của giảng viên.',
  },
  {
    id: 'LI-02',
    icon: Database,
    desc: 'Mô hình AI chỉ hỗ trợ tập hợp ngôn ngữ, framework, và công nghệ lập trình phổ biến. Công nghệ hiếm hoặc mới ra mắt có thể không được nhận diện hoặc đánh giá chính xác.',
  },
  {
    id: 'LI-03',
    icon: AlertTriangle,
    desc: 'Độ chính xác phản hồi AI phụ thuộc vào chất lượng, cấu trúc và định dạng mã nguồn. Hệ thống không đảm bảo kết quả đáng tin cậy cho code bị obfuscate hoặc không chuẩn.',
  },
  {
    id: 'LI-04',
    icon: CheckCircle2,
    desc: 'Nền tảng không thực hiện chấm điểm cuối cùng hay ra quyết định học thuật tự động. Mọi đánh giá cuối vẫn thuộc trách nhiệm giảng viên và nhân sự có thẩm quyền.',
  },
  {
    id: 'LI-05',
    icon: Users,
    desc: 'Hệ thống không đảm bảo giảng viên hoặc trợ giảng sẵn sàng 24/7. Thời gian phản hồi của con người phụ thuộc vào lịch trình và điều kiện vận hành cá nhân.',
  },
  {
    id: 'LI-06',
    icon: WifiOff,
    desc: 'Các tính năng AI Code Analysis, Progress Tracking, Dashboards thời gian thực và Notification yêu cầu kết nối Internet ổn định. Một số chức năng có thể hạn chế khi offline.',
  },
  {
    id: 'LI-07',
    icon: Server,
    desc: 'Hệ thống hiện chưa tích hợp trực tiếp thời gian thực với LMS hoặc ERP của trường. Dữ liệu có thể phụ thuộc vào cập nhật thủ công hoặc đồng bộ định kỳ bởi quản trị viên.',
  },
]

function FeatureGrid({ features, color }: { features: typeof STUDENT_FEATURES; color: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {features.map((f) => (
        <Card
          key={f.id}
          className="group border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-xl transition-all duration-500 hover:-translate-y-1 hover:border-slate-900 dark:hover:border-white hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${
              color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/10' :
              color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-slate-50 dark:bg-slate-800'
            }`}>
              <f.icon size={16} className={color === 'orange' ? 'text-[#F37021]' : color === 'blue' ? 'text-blue-500' : 'text-slate-600'} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              {f.title}
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-light">
            {f.desc}
          </p>
        </Card>
      ))}
    </div>
  )
}

export function FeaturesPage() {
  return (
    <div className="bg-bg-light-orange dark:bg-[#07090e] text-slate-900 dark:text-white overflow-x-hidden antialiased">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden py-16 lg:py-20">
        {/* Dynamic Ambient Light System */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Bottom Left Orange/Blue Glow - moved inward */}
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#F37021]/20 dark:from-[#F37021]/15 via-orange-400/15 dark:via-orange-500/10 to-transparent rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-80 dark:opacity-100" />
          
          {/* Top Right Subtle Accent */}
          <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-bl from-amber-400/15 dark:from-orange-500/10 to-transparent rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-60 dark:opacity-80" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 z-10">
          <div className="max-w-3xl space-y-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              TÍNH NĂNG
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              Hệ thống{' '}
              <span className="bg-gradient-to-r from-[#F37021] to-orange-400 bg-clip-text text-transparent">
                toàn diện
              </span>
            </h1>
            <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400 font-light max-w-xl">
              Cung cấp bộ tính năng tối ưu cho 3 vai trò: Sinh viên, Giảng viên, và Quản trị viên. Giảm thiểu thao tác thừa, tối đa hóa trải nghiệm học thuật.
            </p>
          </div>
        </div>
      </section>

      {/* ============ SECTIONS ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                <Users className="text-[#F37021]" size={24} />
                Tính năng Sinh viên
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{STUDENT_FEATURES.length} features</span>
          </div>
          <FeatureGrid features={STUDENT_FEATURES} color="orange" />
        </div>
      </section>

      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                <ClipboardList className="text-blue-500" size={24} />
                Tính năng Giảng viên
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{LECTURER_FEATURES.length} features</span>
          </div>
          <FeatureGrid features={LECTURER_FEATURES} color="blue" />
        </div>
      </section>

      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                <ShieldCheck className="text-slate-600 dark:text-slate-400" size={24} />
                Tính năng Quản trị viên
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{ADMIN_FEATURES.length} features</span>
          </div>
          <FeatureGrid features={ADMIN_FEATURES} color="slate" />
        </div>
      </section>

      {/* ============ LIMITATIONS ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Lưu ý & Hạn chế</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Các ràng buộc sinh viên và giảng viên cần biết.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LIMITATIONS.slice(0, 6).map((lim) => (
              <div key={lim.id} className="border border-amber-200/30 dark:border-amber-900/20 bg-amber-50/20 dark:bg-amber-900/5 rounded-xl p-4 flex gap-3">
                <lim.icon size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{lim.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
