import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api, type AIReviewRow } from '@/lib/api'

export function LecturerAIReview() {
  const [rows, setRows] = useState<AIReviewRow[]>([])
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api
      .getAIReviews()
      .then(setRows)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const review = async (id: string, approved: boolean) => {
    try {
      setError('')
      await api.reviewAIJob(id, approved)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi duyệt kết quả')
    }
  }

  return (
    <div>
      <PageHeader title="Duyệt kết quả AI" breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Duyệt AI' }]} />
      <Card>
        <CardHeader title="Hàng đợi duyệt" />
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            ⚠️ {error}
          </div>
        )}
        <DataTable
          columns={[
            { key: 'type', header: 'Loại' },
            { key: 'title', header: 'Nội dung' },
            { key: 'createdAt', header: 'Thời gian', render: (r) => new Date((r as AIReviewRow).createdAt).toLocaleString('vi') },
            { key: 'status', header: 'Trạng thái', render: () => <Badge variant="warning">Chờ duyệt</Badge> },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => review(r.id, true)}>Duyệt</Button>
                  <Button variant="ghost" size="sm" onClick={() => review(r.id, false)}>Từ chối</Button>
                </div>
              ),
            },
          ]}
          data={rows}
          keyExtractor={(r) => r.id}
        />
      </Card>
    </div>
  )
}
