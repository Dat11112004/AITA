import { createContext, useContext, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

export type Language = 'vi' | 'en' | 'ja'

export const LANGUAGES: { code: Language; label: string; flag: string; name: string }[] = [
  { code: 'vi', label: 'VI', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'ja', label: 'JA', flag: '🇯🇵', name: '日本語' },
]

export type TranslationKey = string

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: TFunction
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation()

  const language = (i18n.language as Language) || 'vi'

  const handleSetLanguage = (lang: Language) => {
    i18n.changeLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('aita-lang', lang)
    }
  }

  const toggleLanguage = () => {
    const order: Language[] = ['vi', 'en', 'ja']
    const next = order[(order.indexOf(language) + 1) % order.length]
    handleSetLanguage(next)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}
