import {
  AlertTriangle,
  Clock,
  Code2,
  Users,
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
               Hoạt động kiểm thử mã nguồn, đánh giá kiến trúc hệ thống và rà soát lỗi logic hiện chiếm khoảng 70% thời gian làm việc của giảng viên, làm giảm nguồn lực dành cho các hoạt động giảng dạy, hướng dẫn và hỗ trợ học tập chuyên sâu.
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

    </div>
  )
}
