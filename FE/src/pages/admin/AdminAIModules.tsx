import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AI_MODULES } from '@/constants/content'
import { api } from '@/lib/api'
import { Brain } from 'lucide-react'

export function AdminAIModules() {
  const [config, setConfig] = useState({ aiEndpoint: '', aiModel: 'stub', aiTimeout: '60', aiStubMode: 'true' })

  useEffect(() => {
    api.getAIConfig().then(setConfig).catch(console.error)
  }, [])

  const save = async () => {
    await api.updateAIConfig(config)
    alert('Đã lưu cấu hình AI')
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
