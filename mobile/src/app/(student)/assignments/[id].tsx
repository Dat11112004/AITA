import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { StatusBadge } from '@/components/StatusBadge'
import { SubjectChip } from '@/components/SubjectChip'
import { Aurora, Colors, Glow, HeroAurora, Layout, Radius, Type } from '@/constants/theme'
import { api, ApiError, type AssignmentRow } from '@/lib/api'
import { countdownTo, formatDue } from '@/lib/countdown'
import { DEV_PREVIEW, getMockAssignment } from '@/lib/devPreview'

export default function AssignmentDetailScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

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
      <AuroraBackground>
        <Loading />
      </AuroraBackground>
    )
  }
  if (error || !assignment) {
    return (
      <AuroraBackground>
        <ErrorView message={error ?? t('common.notFound')} onRetry={load} />
      </AuroraBackground>
    )
  }

  const item = assignment
  const cd = countdownTo(item.due)

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headSpacer} />

          <Text style={[styles.title, { color: a.onGlass }]}>{item.title}</Text>
          <View style={styles.metaRow}>
            <StatusBadge status={item.status} />
            {item.class ? <SubjectChip subject={item.class} /> : null}
          </View>

          {/* due */}
          <GlassCard style={styles.block}>
            <View style={styles.blockHead}>
              <Ionicons name="calendar-outline" size={16} color={c.primary} />
              <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('assignment.due')}</Text>
            </View>
            <View style={styles.dueRow}>
              <Text style={[styles.value, { color: a.onGlass }]}>{item.due ? formatDue(item.due) : t('assignment.noDue')}</Text>
              {cd ? (
                <View style={[styles.cd, cd.urgent && { backgroundColor: c.dangerBg }]}>
                  <Ionicons name="time-outline" size={13} color={cd.urgent ? c.danger : a.onGlassSoft} />
                  <Text style={[styles.cdText, { color: cd.urgent ? c.danger : a.onGlassSoft }]}>{cd.label}</Text>
                </View>
              ) : null}
            </View>
          </GlassCard>

          {/* description */}
          <GlassCard style={styles.block} strong>
            <View style={styles.blockHead}>
              <Ionicons name="document-text-outline" size={16} color={c.primary} />
              <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('assignment.description')}</Text>
            </View>
            <Text style={[styles.body, { color: a.onGlass }]}>{item.description ?? t('assignment.noDescription')}</Text>
          </GlassCard>

          <TouchableOpacity activeOpacity={0.88} onPress={() => setSubmitNote(true)} style={[styles.submitWrap, Glow.primary]}>
            <LinearGradient colors={HeroAurora[scheme]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submit}>
              <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>{t('assignment.submit')}</Text>
            </LinearGradient>
          </TouchableOpacity>
          {submitNote ? <Text style={[styles.note, { color: a.onGlassSoft }]}>{t('assignment.submitSoon')}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130 },
  headSpacer: { height: 40 }, // clears the floating transparent back button
  title: { ...Type.greeting, fontWeight: '800', letterSpacing: 0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 6, flexWrap: 'wrap' },
  block: { marginTop: 12, gap: 10 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { ...Type.chip, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { ...Type.title, fontWeight: '700' },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cd: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  cdText: { ...Type.body, fontWeight: '600' },
  body: { ...Type.bodyLg, lineHeight: 24, fontWeight: '400' },
  submitWrap: { marginTop: 26, borderRadius: Radius.card },
  submit: {
    height: 58,
    borderRadius: Radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  submitText: { ...Type.bodyLg, color: '#FFFFFF', fontWeight: '700' },
  note: { ...Type.body, textAlign: 'center', marginTop: 12 },
})
