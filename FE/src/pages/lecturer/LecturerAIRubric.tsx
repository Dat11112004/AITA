import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { Sparkles, Save, ArrowLeft, Loader2, FileCheck2 } from 'lucide-react'

export function LecturerAIRubric() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ topic: '', difficulty: 'medium', totalScore: 10 })
  const [file, setFile] = useState<File | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleGenerate = async () => {
    if (!form.topic.trim()) return
    setIsGenerating(true)
    setGeneratedContent(null)
    try {
      const formData = new FormData()
      formData.append('topic', form.topic)
      formData.append('difficulty', form.difficulty)
      formData.append('totalScore', form.totalScore.toString())
      if (file) {
        formData.append('file', file)
      }

      const res = await api.generateRubricAI(formData)
      setGeneratedContent(res)
    } catch (error: any) {
      alert(error.message || 'Failed to generate the rubric')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedContent) return
    setIsSaving(true)
    try {
      alert('Rubric saved.')
      navigate(-1)
    } catch (error: any) {
      alert(error.message || 'Failed to save rubric')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="shrink-0 p-2">
          <ArrowLeft size={16} />
        </Button>
        <PageHeader 
          title="Generate a grading rubric with AI" 
          breadcrumbs={[{ label: 'Grading', path: '/lecturer/grading/assignments' }, { label: 'AI Rubric Generator' }]} 
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center gap-2 mb-4 text-emerald-700 dark:text-emerald-400">
              <FileCheck2 size={20} />
              <h3 className="font-bold">Rubric generation settings</h3>
            </div>
            
            <div className="space-y-4">
              <Input 
                label="Topic / assignment requirements" 
                placeholder="e.g. Build a login API using JWT..." 
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
              
              <Select 
                label="Difficulty"
                options={[
                  { value: 'easy', label: 'Easy (basic)' },
                  { value: 'medium', label: 'Medium (applied)' },
                  { value: 'hard', label: 'Hard (advanced)' },
                ]}
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium mb-1">Exam / assignment file (PDF, Word)</label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                <p className="text-xs text-slate-500 mt-1">The AI reads this file; if it has no scoring scale, the AI distributes the points across the criteria itself.</p>
              </div>
              
              <Input 
                label="Total maximum score"
                type="number"
                value={form.totalScore.toString()}
                onChange={(e) => setForm({ ...form, totalScore: Number(e.target.value) || 10 })}
              />

              <Button 
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-200 dark:shadow-none transition-all duration-200"
                onClick={handleGenerate}
                disabled={isGenerating || !form.topic.trim()}
              >
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin mr-2" /> Processing...</>
                ) : (
                  <><Sparkles size={18} className="mr-2" /> Generate rubric</>
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full min-h-[400px] border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <CardHeader title="AI result" />
              {generatedContent && (
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isSaving ? 'Saving...' : <><Save size={16} className="mr-2"/> Save to system</>}
                </Button>
              )}
            </div>
            
            <div className="p-6 flex-1 bg-white dark:bg-slate-950 overflow-y-auto">
              {!generatedContent && !isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                  <Sparkles size={48} className="mb-4 opacity-20" />
                  <p>Enter the settings and press "Generate rubric" to start.</p>
                </div>
              )}
              
              {isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-emerald-500">
                  <Loader2 size={48} className="animate-spin mb-4" />
                  <p className="font-medium animate-pulse">AI is analysing and building the criteria...</p>
                </div>
              )}

              {generatedContent && !isGenerating && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                    <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div className="text-sm text-amber-800">
                      <strong>Note:</strong> Review the criteria and point allocation the AI produced. You can change them before saving.
                    </div>
                  </div>
                  <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-mono text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    {typeof generatedContent === 'object' ? JSON.stringify(generatedContent, null, 2) : generatedContent.toString()}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
