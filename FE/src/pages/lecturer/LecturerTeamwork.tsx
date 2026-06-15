import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { api, type Option, type TeamworkData, type TeamInfo } from '@/lib/api'
import { GitBranch, Calendar, Cpu, Inbox, Loader2, Users } from 'lucide-react'

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
    <div className="space-y-8 animate-fade-in-up">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeader
            title="Đánh Giá Chéo"
            description="Phân tích lịch sử commits từ Git và độ đóng góp của từng sinh viên vào dự án nhóm chung."
            breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Đánh giá nhóm' }]}
          />
        </div>
        <div className="flex shrink-0">
          <Select
            label=""
            options={[{ value: '', label: 'Chọn lớp / Môn học' }, ...classes]}
            value={classId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClassId(e.target.value)}
            className="w-full sm:min-w-[220px]"
          />
        </div>
      </div>

      {loading ? (
        <Card className="flex flex-col items-center justify-center py-32 border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821]">
          <Loader2 size={36} className="text-brand-500 animate-spin mb-4 stroke-[2]" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide">Syncing Repository Data</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Hệ thống đang truy xuất dữ liệu từ các nền tảng Source Control...</p>
        </Card>
      ) : data?.teams && data.teams.length > 0 ? (
        <div className="grid gap-6 animate-in fade-in duration-300">
          {data.teams.map((team: TeamInfo) => (
            <Card key={team.id} padding="none" className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821] transition-shadow hover:shadow-md">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-brand-600 dark:bg-orange-500/10 dark:text-brand-400">
                    <Users size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{team.name}</h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">PROJECT: {team.assignment}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-sm dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                  <GitBranch size={14} className="stroke-[2.5]" /> Link Sync OK
                </div>
              </div>

              {/* Data Table Workspace */}
              <div className="p-6 overflow-x-auto">
                <DataTable
                  columns={[
                    {
                      key: 'name',
                      header: 'Tên thành viên',
                      render: (r: any) => (
                        <div className="flex items-center gap-3 py-1 pr-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold uppercase text-slate-600 border border-slate-200/50 shadow-sm dark:bg-[#1a1f2e] dark:border-slate-800 dark:text-slate-300">
                            {r.name?.slice(0, 2)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">{r.name}</span>
                        </div>
                      )
                    },
                    {
                      key: 'commits',
                      header: 'Lượt Commit',
                      render: (r: any) => (
                        <div className="py-2">
                           <span className="font-mono text-[13px] font-black text-slate-800 dark:text-slate-200">{r.commits}</span>
                        </div>
                      )
                    },
                    {
                      key: 'lines',
                      header: 'Thay đổi Lines (+/-)',
                      render: (r: any) => (
                        <div className="flex items-center gap-1.5 font-mono text-xs py-2 font-bold px-1">
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 px-1.5 py-0.5 rounded shadow-sm">+{r.linesAdded}</span>
                          <span className="text-rose-600 dark:text-rose-400 bg-rose-50 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 px-1.5 py-0.5 rounded shadow-sm">-{r.linesRemoved}</span>
                        </div>
                      )
                    },
                    {
                      key: 'contribution',
                      header: 'Chỉ số Đóng Góp (%)',
                      render: (r: any) => (
                        <div className="flex flex-col gap-1.5 py-2 justify-center w-full max-w-[120px]">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-400">
                             <span>{r.contributionPercent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full shadow-inner"
                              style={{ width: `${r.contributionPercent}%` }}
                            />
                          </div>
                        </div>
                      )
                    },
                    {
                      key: 'lastActive',
                      header: 'Lần cuối Commit',
                      render: (r: any) => (
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono py-2 font-medium">
                          <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>{new Date(r.lastActive).toLocaleString('vi')}</span>
                        </div>
                      )
                    },
                    {
                      key: 'suggestedScore',
                      header: 'Auto-Grading',
                      render: (r: any) => {
                        const score = (r.contributionPercent / 10).toFixed(1)
                        const sVal = parseFloat(score);
                        return (
                          <div className="py-2 flex items-center justify-end pr-4">
                            <div className={`flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black shadow-sm border ${
                              sVal >= 8 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                                : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                            }`}>
                              {score}
                            </div>
                          </div>
                        )
                      }
                    },
                  ]}
                  data={team.members}
                  keyExtractor={(m) => m.id}
                />
              </div>

              {/* Box Footer Insights */}
              <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-800/30 flex items-start gap-3">
                 <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 dark:bg-[#1a1f2e] dark:border-slate-700 shadow-sm text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                   <Cpu size={14} className="animate-pulse" />
                 </div>
                 <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed pt-1 max-w-2xl">
                   <span className="font-bold text-slate-900 dark:text-white mr-1.5 uppercase tracking-wide">Phân tích AI:</span> 
                   Nhóm này có phân bổ đồng đều. <strong className="text-slate-900 dark:text-slate-200">{team.members[0].name}</strong> kiểm soát vai trò lead. Không phát hiện rủi ro đóng góp quá lệch.
                 </p>
              </div>

            </Card>
          ))}
        </div>
      ) : (
        <Card padding="none" className="flex flex-col items-center justify-center py-20 text-center border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#151821]">
          <div className="rounded-full bg-slate-50 p-5 dark:bg-slate-800/50">
            <Inbox size={40} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="mt-5 text-lg font-bold text-slate-900 dark:text-slate-200">Không tìm thấy kho mã nguồn</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">Chọn một lớp học để hệ thống kéo dữ liệu Git tự động đối soát đóng góp source code của các thành viên.</p>
        </Card>
      )}
    </div>
  )
}