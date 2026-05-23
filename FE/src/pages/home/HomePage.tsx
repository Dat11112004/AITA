import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Users,
  BrainCircuit,
  LineChart,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HOME_FEATURES, PRODUCT_PILLARS, AI_MODULES } from '@/constants/content'
import { PORTAL_LINKS } from '@/constants/navigation'
import { Icon } from '@/components/icons/IconMap'

export function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F37021] via-[#f97316] to-[#ea580c] text-white">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-black/10" />

        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-white/10 blur-3xl" />

        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-yellow-300/10 blur-3xl" />

        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        {/* Top Branding */}
        <div className="relative border-b border-white/10 bg-black/10 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-sm text-orange-100 sm:px-6 lg:px-8">
            <span className="font-medium">
              FPT University • AI Teaching Assistant Platform
            </span>

            <span className="hidden md:block">
              Powered by Generative AI
            </span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left */}
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                <Sparkles size={16} className="text-yellow-200" />
                AI-powered Teaching Assistant
              </span>

              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Nền tảng{' '}
                <span className="text-yellow-200">
                  AI Teaching Assistant
                </span>
                <br />
                dành cho giảng viên FPT
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-orange-50">
                AITA hỗ trợ tạo bài tập bằng AI, chấm bài lập trình,
                theo dõi tiến độ học tập và phản hồi cá nhân hóa —
                giúp giảng viên giảm tải công việc thủ công và nâng cao
                chất lượng đào tạo.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/lecturer">
                  <Button
                    size="lg"
                    className="bg-white font-semibold text-[#F37021] shadow-xl hover:bg-orange-50"
                  >
                    Dành cho giảng viên
                    <ArrowRight size={18} />
                  </Button>
                </Link>

                <Link to="/student">
                  <Button
                    size="lg"
                    className="border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                  >
                    Cổng sinh viên
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-5">
                {[
                  {
                    value: '24/7',
                    label: 'AI Support',
                  },
                  {
                    value: '80%',
                    label: 'Reduce Manual Work',
                  },
                  {
                    value: '3',
                    label: 'AI Core Modules',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                  >
                    <p className="text-2xl font-black">
                      {item.value}
                    </p>

                    <p className="mt-1 text-sm text-orange-100">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Dashboard Preview */}
            <div className="relative">
              <div className="rounded-[32px] border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
                <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                    <div>
                      <p className="text-lg font-bold">
                        Lecturer Dashboard
                      </p>

                      <p className="text-sm text-slate-500">
                        AI Teaching Assistant System
                      </p>
                    </div>

                    <div className="rounded-xl bg-orange-100 px-3 py-1 text-sm font-semibold text-[#F37021]">
                      Online
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    {[
                      {
                        icon: BrainCircuit,
                        title: 'AI Generated',
                        value: '128 Exercises',
                      },
                      {
                        icon: CheckCircle2,
                        title: 'Auto Grading',
                        value: '356 Submissions',
                      },
                      {
                        icon: LineChart,
                        title: 'Analytics',
                        value: 'Realtime Tracking',
                      },
                      {
                        icon: ShieldCheck,
                        title: 'Lecturer Review',
                        value: 'Human Verified',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <item.icon
                          className="text-[#F37021]"
                          size={24}
                        />

                        <p className="mt-3 text-sm text-slate-500">
                          {item.title}
                        </p>

                        <p className="mt-1 font-bold">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Progress */}
                  <div className="mt-6 rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">
                        Student Progress
                      </p>

                      <p className="text-sm text-emerald-500">
                        +12%
                      </p>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[#F37021] to-orange-400" />
                    </div>

                    <p className="mt-3 text-sm text-slate-500">
                      Average class performance improved this week
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="bg-[#fff7f2] py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <span className="rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-[#F37021]">
                PRODUCT BACKGROUND
              </span>

              <h2 className="mt-5 text-4xl font-black text-slate-900">
                Chuyển đổi số giáo dục với AI
              </h2>

              <p className="mt-6 leading-relaxed text-slate-600">
                Trong lĩnh vực Software Engineering và IT,
                giảng viên phải xử lý khối lượng lớn bài thực hành,
                chấm code, đánh giá nhóm và theo dõi tiến độ học tập.
              </p>

              <p className="mt-4 leading-relaxed text-slate-600">
                AITA tích hợp Generative AI để hỗ trợ tạo bài tập,
                phân tích bài nộp, đánh giá lập trình và cung cấp
                phản hồi cá nhân hóa cho từng sinh viên.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: Users,
                  label: 'Lecturer Support',
                  desc: 'Giảm tải công việc quản lý & chấm bài',
                },
                {
                  icon: GraduationCap,
                  label: 'Student Experience',
                  desc: 'Phản hồi nhanh và học tập cá nhân hóa',
                },
                {
                  icon: Bot,
                  label: 'AI Engine',
                  desc: '3 AI modules hỗ trợ toàn diện',
                },
                {
                  icon: CheckCircle2,
                  label: 'Human Verification',
                  desc: 'Giảng viên kiểm duyệt kết quả AI',
                },
              ].map((item) => (
                <Card
                  key={item.label}
                  className="border border-orange-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#F37021] hover:shadow-xl"
                >
                  <item.icon
                    className="text-[#F37021]"
                    size={34}
                  />

                  <p className="mt-4 text-lg font-bold">
                    {item.label}
                  </p>

                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {item.desc}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-[#F37021]">
              CORE FEATURES
            </span>

            <h2 className="mt-5 text-4xl font-black text-slate-900">
              Giá trị cốt lõi của AITA
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">
              Giải quyết hạn chế của Moodle, Canvas và Google Classroom
              trong các môn lập trình & Software Engineering.
            </p>
          </div>

          <div className="mt-16 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {HOME_FEATURES.map((f) => (
              <Card
                key={f.title}
                className="group border border-orange-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#F37021] hover:shadow-2xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 transition group-hover:bg-orange-100">
                  <Icon
                    name={f.icon}
                    className="text-[#F37021]"
                    size={28}
                  />
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {f.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  {f.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section
        id="pillars"
        className="bg-slate-50 py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-[#F37021]">
              PRODUCT PILLARS
            </span>

            <h2 className="mt-5 text-4xl font-black text-slate-900">
              Ba trụ cột của hệ thống
            </h2>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {PRODUCT_PILLARS.map((pillar) => (
              <Card
                key={pillar.id}
                padding="lg"
                className="flex flex-col border border-orange-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#F37021] hover:shadow-2xl"
              >
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#F37021]">
                  {pillar.subtitle}
                </span>

                <h3 className="mt-3 text-2xl font-black text-slate-900">
                  {pillar.title}
                </h3>

                <p className="mt-4 flex-1 leading-relaxed text-slate-600">
                  {pillar.description}
                </p>

                <ul className="mt-6 space-y-3">
                  {pillar.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-500"
                      />

                      <span className="text-sm text-slate-700">
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI MODULES */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="rounded-full bg-white/10 px-4 py-1 text-sm font-semibold text-orange-200">
              AI MODULES
            </span>

            <h2 className="mt-5 text-4xl font-black">
              Intelligent AI Modules
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-slate-300">
              Các module AI được thiết kế để hỗ trợ giảng viên và
              sinh viên trong toàn bộ quá trình dạy và học.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {AI_MODULES.map((m) => (
              <div
                key={m.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:bg-white/10"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
                  <Bot
                    className="text-orange-300"
                    size={28}
                  />
                </div>

                <h3 className="mt-5 text-xl font-bold">
                  {m.name}
                </h3>

                <p className="mt-3 leading-relaxed text-slate-300">
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VISION */}
      <section
        id="vision"
        className="bg-white py-24"
      >
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-[#F37021]">
            FUTURE VISION
          </span>

          <h2 className="mt-5 text-4xl font-black text-slate-900">
            Intelligent Tutoring System
          </h2>

          <p className="mt-8 text-lg leading-relaxed text-slate-600">
            AITA không chỉ là một LMS thông thường —
            mà là trợ giảng AI 24/7 giúp chuyển đổi mô hình dạy học
            truyền thống sang nền tảng hỗ trợ bởi AI, dữ liệu và
            adaptive learning trong tương lai.
          </p>
        </div>
      </section>

      {/* PORTAL */}
      <section className="border-t border-slate-200 bg-[#fff7f2] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-[#F37021]">
              SYSTEM PORTALS
            </span>

            <h2 className="mt-5 text-4xl font-black text-slate-900">
              Truy cập hệ thống
            </h2>
          </div>

          <div className="mt-16 grid gap-7 md:grid-cols-3">
            {PORTAL_LINKS.map((p, index) => (
              <Link
                key={p.path}
                to={p.path}
              >
                <Card
                  className={`
                    h-full
                    border
                    bg-white
                    shadow-sm
                    transition-all
                    duration-300
                    hover:-translate-y-2
                    hover:shadow-2xl
                    ${
                      index === 0
                        ? 'border-l-4 border-l-orange-500'
                        : index === 1
                        ? 'border-l-4 border-l-blue-500'
                        : 'border-l-4 border-l-slate-800'
                    }
                  `}
                >
                  <h3 className="text-xl font-black text-slate-900">
                    {p.label}
                  </h3>

                  <p className="mt-3 leading-relaxed text-slate-500">
                    {p.description}
                  </p>

                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-[#F37021]">
                    Vào cổng
                    <ArrowRight size={18} />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}