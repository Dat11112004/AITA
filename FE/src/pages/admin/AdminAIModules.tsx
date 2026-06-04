import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AI_MODULES } from '@/constants/content'
import { api } from '@/lib/api'
import { Brain } from 'lucide-react'

export function AdminAIModules() {
  const [config, setConfig] = useState({ aiEndpoint: '', aiModel: 'stub', aiTimeout: '60', aiStubMode: 'false' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setError('')
    api
      .getAIConfig()
      .then(setConfig)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Lỗi tải cấu hình AI')
      })
  }, [])

  const save = async () => {
    setError('')
    setSuccess('')
    try {
      await api.updateAIConfig(config)
      setSuccess('Đã lưu cấu hình AI')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu cấu hình AI')
    }
  }

  return (
    <div>
      <PageHeader title="Module AI" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Module AI' }]} />

      <div className="grid gap-6 lg:grid-cols-3">
        {AI_MODULES.map((mod) => (
          <Card key={mod.id}>
            <Brain className="text-brand-600" size={24} />
            <h3 className="mt-4 font-semibold">{mod.name}</h3>
            <p className="mt-2 text-sm text-slate-500">{mod.description}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader title="Cấu hình chung AI Engine" />
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl p-3">
            ✓ {success}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Endpoint AI" value={config.aiEndpoint} onChange={(e) => setConfig({ ...config, aiEndpoint: e.target.value })} />
          <Input label="Model" value={config.aiModel} onChange={(e) => setConfig({ ...config, aiModel: e.target.value })} />
          <Input label="Timeout (giây)" value={config.aiTimeout} onChange={(e) => setConfig({ ...config, aiTimeout: e.target.value })} />
          <Input label="Stub mode" value={config.aiStubMode} onChange={(e) => setConfig({ ...config, aiStubMode: e.target.value })} />
        </div>
        <Button className="mt-4" onClick={save}>Lưu cấu hình</Button>
      </Card>
    </div>
  )
}
