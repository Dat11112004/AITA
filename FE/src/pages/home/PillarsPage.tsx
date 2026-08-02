import {
  CheckCircle2,
  Monitor,
  GraduationCap,
  Bot,
  Play,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'

// Text lives in the translation catalogue. Teamwork Assessment, Adaptive Practice and
// Discussion Forum were dropped: a codebase scan found no implementation for any of them,
// so listing them here misrepresented the product.
const PILLARS = [
  { id: 'lecturer', icon: Monitor, color: 'orange', videoSrc: '', featureCount: 4 },
  { id: 'student', icon: GraduationCap, color: 'blue', videoSrc: '', featureCount: 5 },
  { id: 'ai', icon: Bot, color: 'purple', videoSrc: '', featureCount: 4 },
]

export function PillarsPage() {
  const { t } = useTranslation()
  return (
    <div className="bg-bg-light-orange dark:bg-[#07090e] text-slate-900 dark:text-white overflow-x-hidden antialiased">

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden py-20 lg:py-24">
        {/* Dynamic Ambient Light System */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top Right Orange/Purple Mix - moved inward */}
          <div className="absolute top-10 right-20 w-[600px] h-[600px] bg-gradient-to-bl from-purple-500/20 dark:from-purple-500/15 via-[#F37021]/15 dark:via-[#F37021]/10 to-transparent rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-80 dark:opacity-100" />
          
          {/* Left Subtle Orange Glow */}
          <div className="absolute top-1/4 left-10 w-[400px] h-[400px] bg-gradient-to-tr from-orange-400/15 dark:from-orange-600/10 to-transparent rounded-full blur-[90px] mix-blend-multiply dark:mix-blend-screen opacity-60 dark:opacity-70" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 z-10">
          <div className="max-w-3xl space-y-6">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              {t('pillars.badge')}
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              {t('pillars.title')}{' '}
              <span className="bg-gradient-to-r from-[#F37021] to-purple-500 bg-clip-text text-transparent">
                {t('pillars.title_accent')}
              </span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-400 font-light max-w-2xl">
              {t('pillars.desc')}
            </p>
          </div>
        </div>
      </section>

      {/* ============ PILLAR DETAIL SECTIONS ============ */}
      {PILLARS.map((pillar, idx) => (
        <section
          key={pillar.id}
          className="py-24 border-t border-slate-200/50 dark:border-slate-800/50"
        >
          <div className="mx-auto max-w-7xl px-6 sm:px-8">
            <div className={`grid gap-12 lg:grid-cols-12 items-start ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>

              {/* Info Column */}
              <div className={`lg:col-span-5 space-y-6 lg:sticky lg:top-24 ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    pillar.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/20' :
                    pillar.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' :
                    'bg-purple-100 dark:bg-purple-900/20'
                  }`}>
                    <pillar.icon className={
                      pillar.color === 'orange' ? 'text-[#F37021]' :
                      pillar.color === 'blue' ? 'text-blue-500' :
                      'text-purple-500'
                    } size={24} />
                  </div>
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-[0.2em] ${
                    pillar.color === 'orange' ? 'text-[#F37021]' :
                    pillar.color === 'blue' ? 'text-blue-500' :
                    'text-purple-500'
                  }`}>
                    // {t(`pillars.${pillar.id}.subtitle`)}
                  </span>
                </div>

                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl leading-none">
                  {t(`pillars.${pillar.id}.title`)}
                </h2>

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  {t(`pillars.${pillar.id}.description`)}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed font-light border-l-2 border-orange-500/30 pl-4">
                  {t(`pillars.${pillar.id}.longDesc`)}
                </p>
              </div>

              {/* Video Column */}
              <div className={`lg:col-span-7 ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                {pillar.videoSrc ? (
                  <video
                    src={pillar.videoSrc}
                    controls
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg"
                  />
                ) : (
                  <div className={`relative w-full aspect-video rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center ${
                    pillar.color === 'orange' ? 'bg-orange-50/50 dark:bg-orange-900/5' :
                    pillar.color === 'blue' ? 'bg-blue-50/50 dark:bg-blue-900/5' :
                    'bg-purple-50/50 dark:bg-purple-900/5'
                  }`}>
                    <div className="text-center space-y-3">
                      <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                        pillar.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/20' :
                        pillar.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        'bg-purple-100 dark:bg-purple-900/20'
                      }`}>
                        <Play size={28} className={
                          pillar.color === 'orange' ? 'text-[#F37021]' :
                          pillar.color === 'blue' ? 'text-blue-500' :
                          'text-purple-500'
                        } />
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Video demo — {t(`pillars.${pillar.id}.title`)}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-600">{t('pillars.coming_soon')}</p>
                    </div>
                  </div>
                )}

                {/* Features below video */}
                <div className="grid gap-3 sm:grid-cols-2 mt-4">
                  {Array.from({ length: pillar.featureCount }, (_, i) => `pillars.${pillar.id}.f${i + 1}`).map((fk, fIdx, arr) => (
                    <Card
                      key={fk}
                      className={`${fIdx === arr.length - 1 && arr.length % 2 !== 0 ? 'sm:col-span-2' : ''} border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl transition-all duration-300 hover:border-slate-200 dark:hover:border-slate-700 group`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-lg ${
                          pillar.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/10' :
                          pillar.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/10' :
                          'bg-purple-50 dark:bg-purple-900/10'
                        }`}>
                          <CheckCircle2 size={13} className={
                            pillar.color === 'orange' ? 'text-[#F37021]' :
                            pillar.color === 'blue' ? 'text-blue-500' :
                            'text-purple-500'
                          } />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t(`${fk}.name`)}</h4>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">{t(`${fk}.desc`)}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

    </div>
  )
}
