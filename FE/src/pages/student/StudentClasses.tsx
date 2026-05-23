import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { api, type ClassRow } from '@/lib/api'

export function StudentClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([])

  useEffect(() => {
    api.getClasses().then(setClasses).catch(console.error)
  }, [])

  return (
    <div>
      <PageHeader title="Lớp của tôi" breadcrumbs={[{ label: 'Sinh viên', path: '/student' }, { label: 'Lớp của tôi' }]} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <Card key={c.id}>
            <p className="font-semibold text-brand-800">{c.code}</p>
            <p className="text-sm text-slate-600">{c.name}</p>
            <p className="mt-2 text-xs text-slate-500">{c.schedule ?? c.semester}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader title="Bảng lớp học" />
        <DataTable
          columns={[
            { key: 'code', header: 'Mã lớp' },
            { key: 'name', header: 'Môn học' },
            { key: 'semester', header: 'Học kỳ' },
            { key: 'schedule', header: 'Lịch' },
          ]}
          data={classes}
          keyExtractor={(r) => r.id}
        />
      </Card>
    </div>
  )
}
