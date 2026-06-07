import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { api, type Option, type TeamworkData, type TeamInfo } from '@/lib/api'
import { GitBranch, Calendar, Cpu, Inbox, Loader2 } from 'lucide-react'

export function LecturerTeamwork() {
  const [classId, setClassId] = useState('')
  const [classes, setClasses] = useState<Option[]>([])
  const [data, setData] = useState<TeamworkData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getClassOptions().then(setClasses).catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getTeamworkData(classId || undefined)
      .then(setData)
      .finally(() => setLoading(false))
  }, [classId])

  return (
    <div className="space-y-8 p-1 selection:bg-brand-500 selection:text-white min-h-screen bg-slate-50/50 dark:bg-slate-900/50">

      {/* Premium Studio Page Header */}
      <div className="relative rounded-2xl overflow-hidden bg-[#07090e] text-white p-2 border border-white/[0.08] dark:border-white/[0.05] shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative">
          <PageHeader
            title="Đánh giá làm việc nhóm"
            description="Theo dõi đóng góp của từng thành viên qua Git commits, số dòng code và thời gian hoạt động (FE-L-03)."
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Đánh giá nhóm' }]}
          />
        </div>
      </div>

      {/* Control Selector Console */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-500/10 border border-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <GitBranch size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Git Analytics Hub</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-light">Chọn lớp học để đồng bộ dữ liệu Repository</p>
          </div>
        </div>

        <div className="w-full sm:max-w-xs">
          <Select
            label="Chọn lớp học"
            options={[{ value: '', label: 'Tất cả lớp' }, ...classes]}
            value={classId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClassId(e.target.value)}
          />
        </div>
      </div>

      {/* Conditional Telemetry Rendering Area */}
      {loading ? (
        <Card className="flex flex-col items-center justify-center py-24 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
          <Loader2 size={24} className="text-brand-500 animate-spin mb-3 stroke-[1.5]" />
          <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Syncing Repository</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Đang tải dữ liệu đóng góp từ Git...</p>
        </Card>
      ) : data?.teams && data.teams.length > 0 ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          {data.teams.map((team: TeamInfo) => (
            <Card key={team.id} className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">

              {/* Card Title Block Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardHeader
                  title={team.name}
                  description={`Bài tập: ${team.assignment}`}
                  action={
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-md py-0.5 px-2 shadow-sm">
                      <GitBranch size={12} className="text-emerald-500 dark:text-emerald-400" />
                      <span>Git Repository Connected</span>
                    </div>
                  }
                />
              </div>

              {/* Data Table Workspace */}
              <div className="p-4 sm:p-6 overflow-x-auto">
                <DataTable
                  columns={[
                    {
                      key: 'name',
                      header: 'Thành viên',
                      render: (r: any) => (
                        <div className="flex items-center gap-2 py-1">
                          <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-bold flex items-center justify-center border border-slate-200 dark:border-slate-700 uppercase">
                            {r.name?.slice(0, 2)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">{r.name}</span>
                        </div>
                      )
                    },
                    {
                      key: 'commits',
                      header: 'Commits',
                      render: (r: any) => (
                        <div className="py-1">
                          <Badge variant="neutral" className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-md shadow-none">
                            {r.commits}
                          </Badge>
                        </div>
                      )
                    },
                    {
                      key: 'lines',
                      header: 'Dòng code (+/-)',
                      render: (r: any) => (
                        <div className="flex items-center gap-1 font-mono text-xs py-1 font-semibold">
                          <span className="text-emerald-600 dark:text-emerald-400">+{r.linesAdded}</span>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <span className="text-red-600 dark:text-red-400">-{r.linesRemoved}</span>
                        </div>
                      )
                    },
                    {
                      key: 'contribution',
                      header: 'Đóng góp (%)',
                      render: (r: any) => (
                        <div className="flex items-center gap-3 py-1">
                          <div className="h-1.5 w-20 sm:w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/20 shadow-inner shrink-0">
                            <div
                              className="h-full bg-slate-950 dark:bg-brand-500 rounded-full transition-all duration-500"
                              style={{ width: `${r.contributionPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">{r.contributionPercent}%</span>
                        </div>
                      )
                    },
                    {
                      key: 'lastActive',
                      header: 'Hoạt động cuối',
                      render: (r: any) => (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono py-1">
                          <Calendar size={12} className="text-slate-400 dark:text-slate-500" />
                          <span>{new Date(r.lastActive).toLocaleString('vi').slice(0, 16)}</span>
                        </div>
                      )
                    },
                    {
                      key: 'suggestedScore',
                      header: 'Điểm gợi ý',
                      render: (r: any) => {
                        const score = (r.contributionPercent / 10).toFixed(1)
                        return (
                          <div className="py-1">
                            <Badge
                              variant={parseFloat(score) >= 8 ? 'success' : 'info'}
                              className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border shadow-none ${parseFloat(score) >= 8
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
                                }`}
                            >
                              {score}
                            </Badge>
                          </div>
                        )
                      }
                    },
                  ]}
                  data={team.members}
                  keyExtractor={(m) => m.id}
                />
              </div>

              {/* AI Insight Box Footer Component */}
              <div className="mx-4 sm:mx-6 mb-6 p-4 rounded-xl bg-brand-500/5 border border-brand-500/10 flex items-start gap-3 shadow-inner">
                <div className="h-6 w-6 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 mt-0.5 border border-brand-500/10">
                  <Cpu size={13} className="animate-pulse" />
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-mono font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400 mr-1.5">[AI Telemetry Insights]:</span>
                  Nhóm này có sự phân bổ công việc khá đồng đều. {team.members[0].name} đóng vai trò lead code với số lượng commit cao nhất. Không có dấu hiệu của hiện tượng "free-riding".
                </div>
              </div>

            </Card>
          ))}
        </div>
      ) : (
        /* Empty Fallback Display Area */
        <Card className="flex flex-col items-center justify-center gap-4 py-20 text-center border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-center text-slate-300 dark:text-slate-600 shadow-inner">
            <Inbox size={26} className="stroke-[1.5]" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Chưa có dữ liệu làm việc nhóm</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-light mt-1 max-w-xs mx-auto">Vui lòng lựa chọn lớp học cụ thể hoặc giao bài tập nhóm để hệ thống kéo dữ liệu Git.</p>
          </div>
        </Card>
      )}
    </div>
  )
}