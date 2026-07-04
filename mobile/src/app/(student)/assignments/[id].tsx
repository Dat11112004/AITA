import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorView } from '@/components/ErrorView'
import { Loading } from '@/components/Loading'
import { StatusBadge } from '@/components/StatusBadge'
import { Brand, Colors } from '@/constants/theme'
import { api, ApiError, type AssignmentRow } from '@/lib/api'
import { DEV_PREVIEW, getMockAssignment } from '@/lib/devPreview'

export default function AssignmentDetailScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]

  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitNote, setSubmitNote] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (DEV_PREVIEW) {
        const m = id ? getMockAssignment(id) : undefined
        if (!m) throw new Error(t('common.notFound'))
        setAssignment(m)
      } else {
        setAssignment(await api.getAssignment(String(id)))
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        <Loading />
      </View>
    )
  }
  if (error || !assignment) {
    return (
      <View style={[styles.fill, { backgroundColor: c.background }]}>
        <ErrorView message={error ?? t('common.notFound')} onRetry={load} />
      </View>
    )
  }

  const a = assignment
  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>{a.title}</Text>
        <View style={styles.metaRow}>
          <StatusBadge status={a.status} />
          {a.class ? <Text style={[styles.metaText, { color: c.textSecondary }]}>{a.class}</Text> : null}
        </View>

        <Text style={[styles.label, { color: c.textSecondary }]}>{t('assignment.due')}</Text>
        <Text style={[styles.value, { color: c.text }]}>{a.due ?? t('assignment.noDue')}</Text>

        <Text style={[styles.label, { color: c.textSecondary }]}>{t('assignment.description')}</Text>
        <Text style={[styles.body, { color: c.text }]}>{a.description ?? t('assignment.noDescription')}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSubmitNote(true)}
          style={[styles.submit, { backgroundColor: Brand[600] }]}
        >
          <Text style={styles.submitText}>{t('assignment.submit')}</Text>
        </TouchableOpacity>
        {submitNote ? <Text style={[styles.note, { color: c.textSecondary }]}>{t('assignment.submitSoon')}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 4 },
  title: { fontSize: 22, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 6 },
  metaText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 14, letterSpacing: 0.5 },
  value: { fontSize: 15, marginTop: 2 },
  body: { fontSize: 15, lineHeight: 22, marginTop: 2 },
  submit: { marginTop: 24, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  note: { fontSize: 13, textAlign: 'center', marginTop: 10 },
})
