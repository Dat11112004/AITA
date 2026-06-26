import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow } from '@/lib/api'
import { APIError } from '@/components/common/ErrorState'
import { Loader2 } from 'lucide-react'

export function StudentClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    api.getClasses()
      .then(data => { if (alive) setClasses(data || []) })
      .catch(err => { if (alive) setError(err) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>
  if (error) return <APIError error={error} onRetry={loadData} />

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen">
      <PageHeader title="Lớp của tôi" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Lớp của tôi' }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <Card key={c.id} className="transition-all duration-300 hover:shadow-md hover:border-brand-500/30 dark:hover:border-brand-500/50">
            <div className="p-4 sm:p-6">
              <p className="font-semibold text-brand-800 dark:text-brand-400">{c.code}</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">{c.name}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{c.schedule ?? c.semester}</p>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-8 border border-slate-200/80 dark:border-slate-800">
        <CardHeader title="Bảng lớp học" />
        <div className="p-4 sm:p-6 pt-0 overflow-x-auto">
          <DataTable
            columns={[
              { 
                key: 'code', 
                header: 'Mã lớp',
                render: (r) => <span className="font-mono text-sm text-slate-800 dark:text-slate-200">{(r as ClassRow).code}</span>
              },
              { 
                key: 'name', 
                header: 'Môn học',
                render: (r) => <span className="font-medium text-slate-900 dark:text-slate-100">{(r as ClassRow).name}</span>
              },
              { 
                key: 'semester', 
                header: 'Học kỳ',
                render: (r) => <span className="text-sm text-slate-600 dark:text-slate-400">{(r as ClassRow).semester}</span>
              },
              { 
                key: 'schedule', 
                header: 'Lịch',
                render: (r) => <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">{(r as ClassRow).schedule}</span>
              },
            ]}
            data={classes}
            keyExtractor={(r) => r.id}
          />
        </div>
      </Card>
    </div>
  )
}
