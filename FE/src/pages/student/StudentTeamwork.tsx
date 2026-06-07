import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api, type StudentTeamData, type StudentTeamInfo } from '@/lib/api'
import { Users, GitBranch, Github, TrendingUp } from 'lucide-react'

export function StudentTeamwork() {
  const [data, setData] = useState<StudentTeamData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getStudentTeamwork()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader
        title="Làm việc nhóm & Đóng góp"
        description="Theo dõi tiến độ nhóm, phân chia công việc và mức độ đóng góp mã nguồn của bạn trong các dự án (FE-L-03 Student context)."
        breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Làm việc nhóm' }]}
      />

      {loading ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 italic text-sm">Đang đồng bộ dữ liệu nhóm...</div>
      ) : data?.teams && data.teams.length > 0 ? (
        <div className="space-y-6">
          {data.teams.map((team: StudentTeamInfo) => (
            <Card key={team.id} className="border border-slate-200/80 dark:border-slate-800 transition-all hover:shadow-md">
              <div className="grid gap-0 md:grid-cols-3">
                <div className="md:col-span-1 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{team.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{team.className}</p>
                    <Badge variant="info" className="mt-3">{team.assignment}</Badge>
                  </div>
                  
                  <div className="p-5 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/50 shadow-inner">
                    <p className="text-[10px] font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider mb-2">Đóng góp của bạn</p>
                    <div className="flex items-end gap-2 mb-2 bg-white/50 dark:bg-black/20 w-fit px-3 py-1.5 rounded-lg">
                      <span className="text-3xl font-black text-brand-900 dark:text-brand-100">{team.myContribution}%</span>
                      <TrendingUp size={20} className="text-brand-500 dark:text-brand-400 mb-1 animate-pulse" />
                    </div>
                    <div className="h-2 w-full mt-3 rounded-full bg-brand-200 dark:bg-brand-950 overflow-hidden shadow-inner border border-brand-100/50 dark:border-none">
                      <div className="h-full bg-gradient-to-r from-brand-500 to-amber-400 rounded-full" style={{ width: `${team.myContribution}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <Github size={16} className="text-slate-700 dark:text-slate-300 shrink-0" />
                    <span className="leading-snug">Lịch sử commit đồng bộ từ kho lưu trữ của nhóm.</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                    <CardHeader title="Thành viên & Vai trò" />
                  </div>
                  <div className="p-4 sm:p-6 pt-2 overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                      <thead>
                        <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <th className="pb-3 px-2 font-medium">Họ tên</th>
                          <th className="pb-3 px-2 font-medium">Vai trò</th>
                          <th className="pb-3 px-2 font-medium text-right">Mức đóng góp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {team.members.map((member) => (
                          <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-2 font-semibold text-slate-900 dark:text-slate-100">
                               <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center uppercase shrink-0">
                                     {member.name.slice(0,2)}
                                  </div>
                                  {member.name}
                               </div>
                            </td>
                            <td className="py-3.5 px-2 text-slate-600 dark:text-slate-400">
                               <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">{member.role}</span>
                            </td>
                            <td className="py-3.5 px-2 text-right">
                              <span className={`font-bold inline-flex items-center gap-1 ${member.contributionPercent > 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-400'}`}>
                                {member.contributionPercent}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="m-4 sm:m-6 mt-0 flex items-start gap-3 text-xs text-amber-700 dark:text-amber-400 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100/50 dark:border-amber-500/20">
                    <div className="p-1 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                      <GitBranch size={14} />
                    </div>
                    <span className="leading-relaxed"><strong>Mẹo tăng điểm tương tác:</strong> Hệ thống AITA đánh giá cao các hoạt động peer-review. Bạn có thể tăng số lượng Pull Request và đưa ra review chi tiết cho code của thành viên khác để cải thiện chỉ số đóng góp chung.</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-20 text-center border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
           <Users size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4 stroke-1" />
           <p className="text-slate-600 dark:text-slate-400 font-medium">Bạn chưa được phân bổ vào nhóm học tập nào.</p>
           <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-sm mx-auto">Vui lòng chờ giảng viên chia nhóm hoặc tự đăng ký nhóm trên danh sách lớp (tùy theo thiết lập môn học).</p>
        </Card>
      )}
    </div>
  )
}
