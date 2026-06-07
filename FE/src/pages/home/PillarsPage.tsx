import {
  CheckCircle2,
  Monitor,
  GraduationCap,
  Bot,
  Lightbulb,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

const PILLARS = [
  {
    id: 'lecturer',
    icon: Monitor,
    title: 'Lecturer Web Dashboard',
    subtitle: 'Cổng quản lý giảng viên',
    color: 'orange',
    description:
      'Cung cấp toàn bộ hạ tầng Web Dashboard cho giảng viên — quản lý lớp học, tạo bài tập bằng AI, duyệt nội dung, hỗ trợ chấm bài và theo dõi tiến độ sinh viên. Giảng viên truy cập từ một bảng điều khiển tập trung để vận hành toàn bộ quy trình giảng dạy.',
    longDesc:
      'Trong vai trò Technology Provider, AITA trang bị cho giảng viên một Web Dashboard mạnh mẽ — trung tâm điều khiển tập trung cho mọi hoạt động giảng dạy. Từ đây, giảng viên có thể quản lý lớp học, phân phối bài tập AI-generated, xem xét/duyệt nội dung trước khi công bố, chấm bài kết hợp AI assistance, và theo dõi tiến độ từng sinh viên thông qua analytics thời gian thực.',
    features: [
      { name: 'Quản lý lớp học & môn học', desc: 'Xem chi tiết giáo trình, sinh viên đăng ký, TA phân công' },
      { name: 'AI Exercise Generation', desc: 'Tạo bài tập, test case tự động từ yêu cầu đơn giản' },
      { name: 'Grading Dashboard', desc: 'Chấm bài với AI support, xem mã nguồn, coaching suggestions' },
      { name: 'Teamwork Assessment', desc: 'Tích hợp Git — theo dõi contribution, commit history' },
      { name: 'Notification System', desc: 'Phân phối thông báo đến sinh viên theo khóa học/nhóm mục tiêu' },
    ],
  },
  {
    id: 'student',
    icon: GraduationCap,
    title: 'Student Learning Portal',
    subtitle: 'Cổng học tập sinh viên',
    color: 'blue',
    description:
      'Nền tảng học tập trực tuyến giúp sinh viên truy cập bài tập, nộp source code, nhận phản hồi AI chi tiết về kiến trúc và logic code, theo dõi tiến độ cá nhân, và tham gia thảo luận với bạn bè và giảng viên.',
    longDesc:
      'Student Learning Portal là giao diện chính mà sinh viên tương tác hàng ngày. Nền tảng này không chỉ là nơi nộp bài tập — mà là hệ sinh thái học tập toàn diện: AI phân tích mã nguồn và trả về phản hồi chi tiết về lỗi kiến trúc, code quality metrics, và gợi ý cải thiện logic; hệ thống Adaptive Practice tạo bài tập phù hợp trình độ; và Course Dashboard cập nhật thời gian thực về deadline và tiến độ.',
    features: [
      { name: 'Exercise Submission', desc: 'Nộp mã nguồn với nhiều định dạng, kiểm soát deadline' },
      { name: 'AI Code Feedback', desc: 'Phân tích kiến trúc, code quality, gợi ý cải thiện semantic' },
      { name: 'Adaptive Practice', desc: 'Bài tập thích ứng theo trình độ và kết quả trước đó' },
      { name: 'Progress Tracking', desc: 'Biểu đồ hiệu suất thời gian thực, lộ trình học tập' },
      { name: 'Discussion Forum', desc: 'Chat/video call với bạn bè và giảng viên để nhận tư vấn' },
      { name: 'Assignment History', desc: 'Lưu trữ toàn bộ lịch sử nộp bài, điểm số, feedback' },
      { name: 'Notification & Reminder', desc: 'Nhắc nhở deadline, kết quả chấm bài, sự kiện' },
    ],
  },
  {
    id: 'ai',
    icon: Bot,
    title: 'AI Engine',
    subtitle: 'Động cơ trí tuệ nhân tạo',
    color: 'purple',
    description:
      'Lõi AI trung tâm tích hợp 3 module: Exercise Generation AI, AI-assisted Assessment, và Learning Feedback AI — điều khiển toàn bộ khả năng tự động hóa của nền tảng, từ tạo đề bài đến đánh giá ngữ nghĩa mã nguồn.',
    longDesc:
      'AI Engine là trái tim công nghệ của AITA — 3 module LLM hoạt động song song: Exercise Generation AI tự động tạo trắc nghiệm, bài lập trình, đề nhóm và điều chỉnh độ khó; AI-assisted Assessment chấm trắc nghiệm, phân tích code sâu, đánh giá nhóm và đóng góp thành viên; Learning Feedback AI gợi ý ôn tập, nhận xét code, hướng nâng cao và phân tích hiệu quả học tập. Giảng viên có toàn quyền duyệt trước khi AI output được công bố.',
    features: [
      { name: 'Exercise Generation', desc: 'Tạo bài tập, starter code, hidden test cases tự động' },
      { name: 'AI-assisted Assessment', desc: 'Chấm điểm, phân tích code quality, đánh giá nhóm' },
      { name: 'Learning Feedback AI', desc: 'Gợi ý ôn tập, nhận xét code, lộ trình cải thiện' },
      { name: 'Difficulty Calibration', desc: 'Điều chỉnh độ khó phù hợp mục tiêu và trình độ' },
      { name: 'Human Verification', desc: 'Giảng viên duyệt mọi AI output trước khi công bố' },
    ],
  },
]

const COMPARISON_DATA = [
  {
    feature: 'Tạo bài tập tự động (AI)',
    moodle: false,
    github: false,
    aita: true,
  },
  {
    feature: 'Đánh giá mã nguồn theo ngữ nghĩa',
    moodle: false,
    github: false,
    aita: true,
  },
  {
    feature: 'Phản hồi AI 24/7',
    moodle: false,
    github: false,
    aita: true,
  },
  {
    feature: 'CI/CD Autograding (Unit Test)',
    moodle: false,
    github: true,
    aita: true,
  },
  {
    feature: 'Quản lý tài liệu khóa học',
    moodle: true,
    github: false,
    aita: true,
  },
  {
    feature: 'Trắc nghiệm & quiz chuẩn hóa',
    moodle: true,
    github: false,
    aita: true,
  },
  {
    feature: 'Phân tích đóng góp nhóm (Git)',
    moodle: false,
    github: true,
    aita: true,
  },
  {
    feature: 'Adaptive Learning Path',
    moodle: false,
    github: false,
    aita: true,
  },
  {
    feature: 'Code Architecture Analysis',
    moodle: false,
    github: false,
    aita: true,
  },
  {
    feature: 'Active Platform (2026+)',
    moodle: true,
    github: false,
    aita: true,
  },
]

export function PillarsPage() {
  return (
    <div className="bg-bg-light-orange dark:bg-[#07090e] text-slate-900 dark:text-white overflow-x-hidden antialiased">

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden py-20 lg:py-24">
        {/* Dynamic Ambient Light System */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top Right Orange/Purple Mix - moved inward */}
          <div className="absolute top-10 right-20 w-[600px] h-[600px] bg-gradient-to-bl from-purple-500/20 dark:from-purple-500/15 via-[#F37021]/15 dark:via-[#F37021]/10 to-transparent rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-80 dark:opacity-100" />
          
          {/* Left Subtle Orange Glow */}
          <div className="absolute top-1/4 left-10 w-[400px] h-[400px] bg-gradient-to-tr from-orange-400/15 dark:from-orange-600/10 to-transparent rounded-full blur-[90px] mix-blend-multiply dark:mix-blend-screen opacity-60 dark:opacity-70" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 z-10">
          <div className="max-w-3xl space-y-6">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              PRODUCT PILLARS
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              Ba trụ cột{' '}
              <span className="bg-gradient-to-r from-[#F37021] to-purple-500 bg-clip-text text-transparent">
                của hệ thống
              </span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-400 font-light max-w-2xl">
              AITA được xây dựng trên 3 trụ cột kiến trúc: Lecturer Web Dashboard, Student Learning Portal, và AI Engine — tạo thành hệ sinh thái giáo dục thông minh toàn diện phục vụ ĐH FPT.
            </p>
          </div>
        </div>
      </section>

      {/* ============ PILLAR DETAIL SECTIONS ============ */}
      {PILLARS.map((pillar, idx) => (
        <section
          key={pillar.id}
          className="py-24 border-t border-slate-200/50 dark:border-slate-800/50"
        >
          <div className="mx-auto max-w-7xl px-6 sm:px-8">
            <div className={`grid gap-12 lg:grid-cols-12 items-start ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>

              {/* Info Column */}
              <div className={`lg:col-span-5 space-y-6 lg:sticky lg:top-24 ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    pillar.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/20' :
                    pillar.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' :
                    'bg-purple-100 dark:bg-purple-900/20'
                  }`}>
                    <pillar.icon className={
                      pillar.color === 'orange' ? 'text-[#F37021]' :
                      pillar.color === 'blue' ? 'text-blue-500' :
                      'text-purple-500'
                    } size={24} />
                  </div>
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-[0.2em] ${
                    pillar.color === 'orange' ? 'text-[#F37021]' :
                    pillar.color === 'blue' ? 'text-blue-500' :
                    'text-purple-500'
                  }`}>
                    // {pillar.subtitle}
                  </span>
                </div>

                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl leading-none">
                  {pillar.title}
                </h2>

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  {pillar.description}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed font-light border-l-2 border-orange-500/30 pl-4">
                  {pillar.longDesc}
                </p>
              </div>

              {/* Features Column */}
              <div className={`lg:col-span-7 ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {pillar.features.map((feat, fIdx) => (
                    <Card
                      key={feat.name}
                      className={`${fIdx === pillar.features.length - 1 && pillar.features.length % 2 !== 0 ? 'sm:col-span-2' : ''} border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-xl transition-all duration-500 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] group`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-lg ${
                          pillar.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/10' :
                          pillar.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/10' :
                          'bg-purple-50 dark:bg-purple-900/10'
                        }`}>
                          <CheckCircle2 size={14} className={
                            pillar.color === 'orange' ? 'text-[#F37021]' :
                            pillar.color === 'blue' ? 'text-blue-500' :
                            'text-purple-500'
                          } />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{feat.name}</h4>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">{feat.desc}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ============ COMPARISON TABLE ============ */}
      <section className="py-24 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="max-w-2xl space-y-4 mb-16">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              COMPARISON MATRIX
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              So sánh với hệ thống hiện tại
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-light">
              AITA kết hợp ưu điểm của cả hai nền tảng phổ biến, đồng thời bổ sung khả năng AI mà không hệ thống nào hiện có.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60">
                  <th className="text-left py-4 px-6 font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Tính năng</th>
                  <th className="text-center py-4 px-4 font-bold text-xs uppercase tracking-wider">
                    <span className="text-orange-600 dark:text-orange-400">Moodle</span>
                  </th>
                  <th className="text-center py-4 px-4 font-bold text-xs uppercase tracking-wider">
                    <span className="text-blue-600 dark:text-blue-400">GitHub Classroom</span>
                  </th>
                  <th className="text-center py-4 px-4 font-bold text-xs uppercase tracking-wider">
                    <span className="text-[#F37021]">AITA</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_DATA.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-t border-slate-100 dark:border-slate-800 ${
                      i % 2 === 0 ? 'bg-white dark:bg-slate-900/30' : 'bg-slate-50/50 dark:bg-slate-900/10'
                    }`}
                  >
                    <td className="py-3.5 px-6 text-xs text-slate-700 dark:text-slate-300 font-medium">{row.feature}</td>
                    <td className="text-center py-3.5 px-4">
                      {row.moodle ? (
                        <CheckCircle2 size={16} className="inline text-emerald-500" />
                      ) : (
                        <span className="inline-block w-4 h-0.5 bg-slate-300 dark:bg-slate-700 rounded" />
                      )}
                    </td>
                    <td className="text-center py-3.5 px-4">
                      {row.github ? (
                        <CheckCircle2 size={16} className="inline text-emerald-500" />
                      ) : (
                        <span className="inline-block w-4 h-0.5 bg-slate-300 dark:bg-slate-700 rounded" />
                      )}
                    </td>
                    <td className="text-center py-3.5 px-4">
                      {row.aita ? (
                        <CheckCircle2 size={16} className="inline text-[#F37021]" />
                      ) : (
                        <span className="inline-block w-4 h-0.5 bg-slate-300 dark:bg-slate-700 rounded" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom callout */}
          <div className="mt-8 flex items-center gap-4 px-6 py-4 rounded-xl border border-orange-200/30 dark:border-orange-900/20 bg-orange-50/30 dark:bg-orange-900/5">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-orange-200/50 dark:border-slate-700">
              <Lightbulb size={16} className="text-[#F37021]" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-light">
              <span className="font-bold text-slate-900 dark:text-white">Lưu ý:</span> GitHub Classroom đã chính thức thông báo ngừng hoạt động vào tháng 5/2026, tạo ra khoảng trống công nghệ lớn mà AITA được thiết kế để lấp đầy.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
