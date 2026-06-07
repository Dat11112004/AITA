import {
  Users,
  GraduationCap,
  Bot,
  CheckCircle2,
  BookOpen,
  AlertTriangle,
  GitBranch,
  Server,
  Sparkles,
  ArrowRight,
  XCircle,
  Clock,
  Code2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

const CHALLENGES = [
  {
    icon: Clock,
    title: 'Chấm bài thủ công',
    desc: 'Giảng viên phải tải xuống file ZIP, cấu hình môi trường cục bộ, và đọc hàng nghìn dòng code — tiêu tốn hàng chục giờ mỗi tuần cho mỗi lớp lớn.',
  },
  {
    icon: Code2,
    title: 'Đánh giá mã nguồn phức tạp',
    desc: 'Chấm bài lập trình không chỉ kiểm tra đầu ra đúng/sai — cần đánh giá chất lượng mã nguồn, coding convention, logic triển khai, và khả năng tối ưu hóa.',
  },
  {
    icon: Users,
    title: 'Đóng góp nhóm không rõ ràng',
    desc: 'Trong các bài tập nhóm, lecturers gặp khó khăn khi xác định mức đóng góp thực tế của từng thành viên, dẫn đến đánh giá thiếu công bằng.',
  },
  {
    icon: AlertTriangle,
    title: 'Phản hồi chậm trễ',
    desc: 'Sinh viên mong đợi feedback nhanh, nội dung học phù hợp năng lực, và hướng dẫn rõ ràng — nhưng hệ thống LMS truyền thống chỉ lưu trữ tài liệu mà thiếu hỗ trợ tự động.',
  },
]

const EXISTING_SYSTEMS = [
  {
    name: 'Moodle',
    type: 'Open-Source LMS',
    link: 'Moodle.org',
    description:
      'Hệ thống quản lý học tập mã nguồn mở được sử dụng toàn cầu, cung cấp môi trường tập trung để phân phối tài liệu khóa học, quản lý nộp bài và tổ chức kiểm tra trắc nghiệm chuẩn hóa.',
    features: [
      'Quản lý tài nguyên khóa học — tổ chức nội dung theo tuần/chủ đề',
      'Công cụ đánh giá chuẩn hóa — trắc nghiệm, đúng/sai, trả lời ngắn',
      'Cổng nộp bài tập trung — timestamp, quản lý nộp trễ',
    ],
    limitations: [
      'Hoàn toàn thụ động với mã nguồn — chỉ là kho lưu file, không thể compile hay chạy code',
      'Giảng viên phải tải xuống, chạy thủ công và đánh giá từng bài tập lập trình phức tạp',
      'Thiếu khả năng AI để tự động tạo bài tập lập trình đa dạng',
      'Không cung cấp phản hồi tức thì và cá nhân hóa về logic code cho sinh viên',
    ],
    color: 'orange',
  },
  {
    name: 'GitHub Classroom',
    type: 'Code Assessment Platform',
    link: 'classroom.github.com',
    description:
      'Ứng dụng của GitHub giúp phân phối bài tập lập trình, tự động tạo repository riêng cho sinh viên, và cung cấp autograding thông qua CI/CD workflows.',
    features: [
      'Repository Dispatch — tự động tạo repo riêng từ template khi sinh viên nhấp link',
      'CI/CD Autograding — chạy unit test tự động qua GitHub Actions',
      'Contribution Tracking — theo dõi commit history và pull request cho bài nhóm',
      'Version Control — lịch sử commit đầy đủ hỗ trợ academic integrity',
    ],
    limitations: [
      'Đang trong giai đoạn sunset — ngừng hoạt động hoàn toàn vào tháng 5/2026',
      'Hoàn toàn thiếu khả năng Trí Tuệ Nhân Tạo',
      'Chấm điểm kiểu "black-box" Pass/Fail — không đánh giá chất lượng code',
      'Trả về log lỗi khó hiểu thay vì hướng dẫn sửa bài bằng ngôn ngữ tự nhiên',
    ],
    color: 'blue',
  },
]

const OPPORTUNITY_ITEMS = [
  {
    icon: Sparkles,
    title: 'AI Tạo Bài Tập Tự Động',
    desc: 'Tích hợp Generative AI để tự động tạo mô tả bài tập, starter code, và hidden test cases từ yêu cầu đơn giản — tiết kiệm hàng chục giờ soạn giáo án cho giảng viên.',
  },
  {
    icon: Code2,
    title: 'Đánh Giá Mã Nguồn Thông Minh',
    desc: 'Vượt xa kiểm tra Pass/Fail, phân tích sâu vào complexity, cấu trúc kiến trúc (Clean Architecture), và tuân thủ Clean Code conventions.',
  },
  {
    icon: Bot,
    title: 'AI Tutor 24/7',
    desc: 'Dịch các lỗi compiler phức tạp thành hướng dẫn cá nhân hóa bằng ngôn ngữ tự nhiên — hỗ trợ sinh viên sửa bug như một Senior Developer.',
  },
  {
    icon: GitBranch,
    title: 'Phân Tích Đóng Góp Nhóm',
    desc: 'Phân tích khách quan qua version control (Git), tự động đề xuất điểm đóng góp công bằng cho specialized major projects, ngăn chặn hiện tượng "free-riding."',
  },
  {
    icon: ShieldCheck,
    title: 'Tự Chủ Công Nghệ',
    desc: 'Bảo vệ hạ tầng giáo dục trước việc GitHub Classroom ngừng hoạt hoạt, duy trì bền vững dài hạn mà không phát sinh chi phí licensing khổng lồ.',
  },
  {
    icon: TrendingUp,
    title: 'Hệ Sinh Thái Tích Hợp',
    desc: 'AITA phát triển cùng Khoa Kỹ thuật Phần mềm tại ĐH FPT — giảng viên thật là end-users, cung cấp dataset mã nguồn thực tế và rubric chấm bài đã kiểm chứng.',
  },
]

export function AboutPage() {
  return (
    <div className="bg-bg-light-orange dark:bg-[#07090e] text-slate-900 dark:text-white overflow-x-hidden antialiased">

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden py-16 lg:py-20">
        {/* Dynamic Ambient Light System */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Main Orange Glow - moved closer */}
          <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#F37021]/30 dark:from-[#F37021]/15 via-orange-400/15 dark:via-orange-500/10 to-transparent rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-80 dark:opacity-100" />
          
          {/* Secondary Light Center Glow */}
          <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-amber-300/15 dark:from-orange-500/10 to-transparent rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen opacity-60 dark:opacity-80" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 z-10">
          <div className="max-w-3xl space-y-6">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              BỐI CẢNH DỰ ÁN
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              Chuyển đổi số giáo dục{' '}
              <span className="bg-gradient-to-r from-[#F37021] to-orange-400 bg-clip-text text-transparent">
                với AI
              </span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-400 font-light max-w-2xl">
              Nâng cao chất lượng giảng dạy và quản lý học tập chuyên ngành CNTT tại ĐH FPT bằng giải pháp tự động hóa toàn diện. Giảm tải công việc chấm bài thủ công, tập trung vào trải nghiệm cốt lõi.
            </p>
          </div>
        </div>
      </section>

      {/* ============ CHALLENGES ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12 items-start">
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
                THÁCH THỨC
              </span>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl leading-none">
                Vì sao cần AITA?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-light">
                Kiểm thử mã nguồn, đánh giá kiến trúc và sửa lỗi logic ngốn tới 70% quỹ thời gian của giảng viên, gây ảnh hưởng đến chất lượng đào tạo chung.
              </p>
            </div>

            <div className="lg:col-span-8 grid gap-4 sm:grid-cols-2">
              {CHALLENGES.map((item) => (
                <Card
                  key={item.title}
                  className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-6 rounded-2xl transition-all duration-500 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] group"
                >
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl w-fit shadow-sm border border-slate-100 dark:border-slate-700 group-hover:border-orange-500/20 group-hover:bg-orange-500/5 transition-colors duration-500">
                    <item.icon className="text-[#F37021]" size={18} />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ EXISTING SYSTEMS ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="max-w-2xl space-y-3 mb-10">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              SO SÁNH
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Hệ thống hiện tại
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {EXISTING_SYSTEMS.map((sys) => (
              <Card
                key={sys.name}
                className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-0 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.03)] hover:border-slate-200 dark:hover:border-slate-700"
              >
                <div className={`px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r ${sys.color === 'orange' ? 'from-orange-50/50 dark:from-orange-900/5' : 'from-blue-50/50 dark:from-blue-900/5'} to-transparent`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${sys.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                      {sys.color === 'orange' ? (
                        <BookOpen className={`text-orange-600 dark:text-orange-400`} size={20} />
                      ) : (
                        <GitBranch className={`text-blue-600 dark:text-blue-400`} size={20} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{sys.name}</h3>
                      <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-0.5">{sys.description}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Features */}
                  <div>
                    <h4 className="text-[9px] font-mono font-bold tracking-[0.2em] text-emerald-600 dark:text-emerald-400 uppercase mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={12} />
                      TÍNH NĂNG
                    </h4>
                    <ul className="space-y-1.5">
                      {sys.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Limitations */}
                  <div>
                    <h4 className="text-[9px] font-mono font-bold tracking-[0.2em] text-red-500 dark:text-red-400 uppercase mb-2 flex items-center gap-1.5">
                      <XCircle size={12} />
                      HẠN CHẾ
                    </h4>
                    <ul className="space-y-1.5">
                      {sys.limitations.map((l) => (
                        <li key={l} className="flex items-start gap-2">
                          <XCircle size={12} className="mt-0.5 shrink-0 text-red-400 dark:text-red-500/70" />
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BUSINESS OPPORTUNITY ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="max-w-2xl space-y-3 mb-10">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              CƠ HỘI
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Thị trường & Khác biệt
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 mb-10">
            {[
              { title: 'Giảng viên', icon: GraduationCap, desc: 'Cần nền tảng tự động hóa để thoát khỏi công việc chấm bài thủ công cồng kềnh.' },
              { title: 'Sinh viên', icon: Users, desc: 'Cần feedback 24/7 để sửa bug thay vì đợi hằng tuần để nhận kết quả.' },
              { title: 'Quản trị viên', icon: Server, desc: 'Cần một nền tảng có thể tự chủ lâu dài thay vì trả phí licensing cao cắt cổ.' },
            ].map((item) => (
              <Card key={item.title} className="p-6">
                <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 rounded-lg w-fit mb-3">
                  <item.icon className="text-[#F37021]" size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-light">{item.desc}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OPPORTUNITY_ITEMS.map((item) => (
              <Card key={item.title} className="p-5 flex items-start gap-4">
                <item.icon className="text-[#F37021] shrink-0 mt-0.5" size={16} />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-light">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ INTEGRATED SYSTEM ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="max-w-2xl space-y-3 mb-10">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              HỆ SINH THÁI
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              AITA x Khoa KTPM FPT
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bot className="text-[#F37021]" size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">AITA Platform - Tech Provider</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-light">
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-[#F37021]" /> Dashboard quản trị toàn diện</li>
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-[#F37021]" /> Hệ thống nộp bài & đánh giá tự động</li>
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-[#F37021]" /> Lõi AI xử lý ngữ nghĩa và logic</li>
              </ul>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <GraduationCap className="text-blue-500" size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Khoa KTPM - Domain Partner</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-light">
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-blue-500" /> Cung cấp end-users test nội bộ</li>
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-blue-500" /> Dataset lập trình thật cho AI</li>
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-blue-500" /> Chuẩn hóa tiêu chí đánh giá (SOPs)</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
