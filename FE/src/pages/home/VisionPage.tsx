import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Eye,
  GraduationCap,
  Monitor,
  Rocket,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

const VISION_PILLARS = [
  {
    icon: Brain,
    title: 'Adaptive Learning',
    desc: 'Tự động xây dựng sơ đồ lỗ hổng kiến thức thời gian thực của từng sinh viên, điều chỉnh nội dung và độ khó phù hợp năng lực cá nhân.',
  },
  {
    icon: Eye,
    title: 'Early Warning System',
    desc: 'Phát hiện sớm sinh viên có nguy cơ tụt hậu, đưa cảnh báo proactive cho giảng viên trước khi tình trạng trở nên nghiêm trọng.',
  },
  {
    icon: Target,
    title: 'Personalized Pathway',
    desc: 'Cung cấp lộ trình cải thiện cá nhân hóa chính xác 24/7 — mỗi sinh viên nhận đề xuất học tập riêng biệt dựa trên phân tích AI.',
  },
]

const ROADMAP = [
  {
    phase: 'Phase 1',
    title: 'Foundation & Core Platform',
    status: 'IN PROGRESS',
    items: [
      'Xây dựng Lecturer Web Dashboard & Student Learning Portal',
      'Triển khai AI Engine Module 1: Exercise Generation',
      'Hệ thống quản lý người dùng & phân quyền',
      'Tích hợp nộp bài & deadline management',
    ],
  },
  {
    phase: 'Phase 2',
    title: 'AI Assessment & Feedback',
    status: 'PLANNED',
    items: [
      'AI-assisted Code Assessment — phân tích kiến trúc, logic, code quality',
      'Learning Feedback AI — gợi ý ôn tập, nhận xét code cá nhân hóa',
      'Teamwork Assessment tích hợp Git contribution tracking',
      'Grading Dashboard với AI coaching suggestions',
    ],
  },
  {
    phase: 'Phase 3',
    title: 'Adaptive Intelligence',
    status: 'PLANNED',
    items: [
      'Adaptive Practice system — bài tập thích ứng theo trình độ',
      'Progress analytics thời gian thực với early warning',
      'AI Tutor chatbot 24/7 — hỗ trợ sửa lỗi bằng ngôn ngữ tự nhiên',
      'School System Integration APIs',
    ],
  },
  {
    phase: 'Phase 4',
    title: 'Scale & Ecosystem',
    status: 'FUTURE',
    items: [
      'Mở rộng sang các khoa/ngành khác tại ĐH FPT',
      'Multi-language AI model fine-tuning nâng cao',
      'Academic analytics dashboard cho quản trị cấp trường',
      'Community marketplace cho bài tập & rubric',
    ],
  },
]

const IMPACT_METRICS = [
  { value: '80%', label: 'Giảm thời gian chấm bài', icon: Zap },
  { value: '24/7', label: 'AI Feedback khả dụng', icon: Bot },
  { value: '3', label: 'AI Engine Modules', icon: Brain },
  { value: '40s', label: 'Thời gian phản hồi AI', icon: TrendingUp },
]

export function VisionPage() {
  return (
    <div className="bg-bg-light-orange dark:bg-[#07090e] text-slate-900 dark:text-white overflow-x-hidden antialiased">

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden py-16 lg:py-20">
        {/* Dynamic Ambient Light System */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Center Large Blended Glow - moved inward */}
          <div className="absolute top-1/4 left-1/3 w-[700px] h-[500px] bg-gradient-to-r from-[#F37021]/20 dark:from-[#F37021]/15 via-purple-500/15 dark:via-purple-500/10 to-blue-500/15 dark:to-blue-500/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-80 dark:opacity-100 transform -translate-x-1/4" />
          
          {/* Right Accent Light */}
          <div className="absolute top-1/2 right-10 w-[300px] h-[300px] bg-gradient-to-tl from-amber-400/20 dark:from-orange-500/10 to-transparent rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen opacity-70 dark:opacity-90" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 z-10">
          <div className="max-w-3xl space-y-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              TẦM NHÌN
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              Học thuyết ứng{' '}
              <span className="bg-gradient-to-r from-[#F37021] via-purple-500 to-blue-500 bg-clip-text text-transparent">
                với AI
              </span>
            </h1>
            <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400 font-light max-w-xl">
              Không chỉ là quản lý học tập, AITA tự động phát hiện lỗ hổng và xây dựng lộ trình cải thiện riêng cho từng sinh viên CNTT 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* ============ VISION PILLARS ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VISION_PILLARS.map((v) => (
              <Card key={v.title} className="p-6">
                <div className="p-2.5 bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-900/10 dark:to-purple-900/10 rounded-xl w-fit mb-4">
                  <v.icon className="text-[#F37021]" size={20} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{v.title}</h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-light">{v.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ IMPACT METRICS ============ */}
      <section className="py-10 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {IMPACT_METRICS.map((m) => (
              <Card key={m.label} className="text-center p-5">
                <p className="text-2xl font-black font-mono text-[#F37021]">{m.value}</p>
                <p className="mt-1 text-[10px] font-mono tracking-wide text-slate-400">{m.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ECOSYSTEM PARTNERSHIP ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="max-w-2xl space-y-3 mb-10">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              PARTNERSHIP
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Hệ sinh thái đối tác
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Monitor className="text-[#F37021]" size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">AITA Platform - Tech</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-light">
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-[#F37021]" /> Dashboard quản lý đồng bộ</li>
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-[#F37021]" /> Cổng truy cập dành cho sinh viên</li>
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-[#F37021]" /> Lõi AI đánh giá và sửa lỗi tự động</li>
              </ul>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <GraduationCap className="text-blue-500" size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">SE Department - Domain</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-light">
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-blue-500" /> Validation trực tiếp từ giảng viên</li>
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-blue-500" /> Dữ liệu bài tập chuẩn xác (SOP)</li>
                <li className="flex items-center gap-2"><ArrowRight size={12} className="text-blue-500" /> Phản hồi để hoàn thiện sản phẩm</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ============ ROADMAP ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white border-l-4 border-[#F37021] pl-4">
              Lộ trình
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROADMAP.map((phase) => (
              <Card key={phase.phase} className="p-5 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#F37021]">{phase.phase}</span>
                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded ${
                    phase.status === 'IN PROGRESS' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' :
                    phase.status === 'PLANNED' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-500 bg-slate-50 dark:bg-slate-800'
                  }`}>{phase.status}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">{phase.title}</h3>
                <ul className="space-y-2 mb-4">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-600" />
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CLOSING CTA ============ */}
      <section className="py-24 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-4xl px-6 sm:px-8 text-center">
          <div className="relative rounded-3xl border border-orange-200/30 dark:border-orange-900/20 bg-gradient-to-b from-orange-50/50 dark:from-orange-900/5 to-transparent p-12 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gradient-to-b from-orange-500/8 to-transparent rounded-full blur-[80px] pointer-events-none" />
            <div className="relative space-y-6">
              <div className="mx-auto p-4 bg-white dark:bg-slate-800 rounded-2xl w-fit shadow-sm border border-orange-200/30 dark:border-slate-700">
                <Rocket className="text-[#F37021]" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                Sẵn sàng chuyển đổi giáo dục CNTT?
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-light max-w-lg mx-auto leading-relaxed">
                AITA đang được phát triển và kiểm chứng cùng Khoa KTPM tại ĐH FPT. Hệ thống hướng đến mục tiêu giảm 80% khối lượng thủ công của giảng viên, nâng cao hiệu quả học tập của sinh viên, và thúc đẩy ứng dụng AI trong môi trường giáo dục đại học.
              </p>
              <div className="flex justify-center gap-4 pt-2">
                <span className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.15em] text-slate-400 uppercase">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                  PLATFORM_STATUS: ACTIVE_DEVELOPMENT
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
