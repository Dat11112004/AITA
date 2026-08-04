import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { ErrorView } from '@/components/ErrorView'
import { GlassCard } from '@/components/GlassCard'
import { Loading } from '@/components/Loading'
import { StatusBadge } from '@/components/StatusBadge'
import { Aurora, Colors, Glow, HeroAurora, Layout, Radius, Type } from '@/constants/theme'
import { api, ApiError, type SubmissionRow } from '@/lib/api'
import { formatDue } from '@/lib/countdown'

export default function LecturerGradeScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [sub, setSub] = useState<SubmissionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await api.getSubmission(String(id))
      setSub(s)
      if (s.score !== null && s.score !== undefined) setScore(String(s.score))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    load()
  }, [load])

  const publish = async () => {
    if (saving) return
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const finalScore = Number(String(score).replace(',', '.'))
      await api.gradeSubmission(String(id), { finalScore, feedback: feedback.trim() || undefined })
      setSaved(true)
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : t('lecturer.publishError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AuroraBackground><Loading /></AuroraBackground>
  if (error || !sub) return <AuroraBackground><ErrorView message={error ?? t('common.notFound')} onRetry={load} /></AuroraBackground>

  const scoreNum = Number(String(score).replace(',', '.'))
  const canPublish = score.trim().length > 0 && !Number.isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 10 && !saving

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.headSpacer} />
            <Text style={[styles.title, { color: a.onGlass }]}>{t('lecturer.gradeDetailTitle')}</Text>

            {/* submission info */}
            <GlassCard style={styles.block}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={c.primary} />
                <Text style={[styles.infoLabel, { color: a.onGlassSoft }]}>{t('lecturer.student')}</Text>
                <Text style={[styles.infoValue, { color: a.onGlass }]} numberOfLines={1}>{sub.studentName ?? '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color={c.primary} />
                <Text style={[styles.infoLabel, { color: a.onGlassSoft }]}>{t('lecturer.submittedAt')}</Text>
                <Text style={[styles.infoValue, { color: a.onGlass }]} numberOfLines={1}>
                  {sub.submittedAt ? formatDue(sub.submittedAt) : t('lecturer.notSubmitted')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="sparkles-outline" size={16} color={c.primary} />
                <Text style={[styles.infoLabel, { color: a.onGlassSoft }]}>{t('lecturer.aiScore')}</Text>
                <Text style={[styles.infoValue, { color: a.onGlass }]}>{sub.aiScore ?? '—'}</Text>
              </View>
              <View style={styles.badgeRow}>
                <StatusBadge status={sub.status} />
              </View>
            </GlassCard>

            {/* grade form */}
            <GlassCard style={styles.block} strong>
              <Text style={[styles.fieldLabel, { color: a.onGlassSoft }]}>{t('lecturer.scoreLabel')}</Text>
              <TextInput
                value={score}
                onChangeText={setScore}
                keyboardType="numeric"
                placeholder="0–10"
                placeholderTextColor={a.onGlassSoft}
                style={[styles.scoreInput, { color: a.onGlass, borderColor: a.glassBorder, backgroundColor: a.glass }]}
              />

              <Text style={[styles.fieldLabel, { color: a.onGlassSoft, marginTop: 14 }]}>{t('lecturer.feedbackLabel')}</Text>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                multiline
                placeholder={t('lecturer.feedbackPlaceholder')}
                placeholderTextColor={a.onGlassSoft}
                style={[styles.feedbackInput, { color: a.onGlass, borderColor: a.glassBorder, backgroundColor: a.glass }]}
              />
            </GlassCard>

            <TouchableOpacity activeOpacity={0.88} onPress={publish} disabled={!canPublish} style={[styles.publishWrap, Glow.primary, { opacity: canPublish ? 1 : 0.5 }]}>
              <LinearGradient colors={HeroAurora[scheme]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.publish}>
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.publishText}>{t('lecturer.publishing')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.publishText}>{t('lecturer.publish')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {saved ? (
              <View style={[styles.toast, { backgroundColor: c.successBg }]}>
                <Ionicons name="checkmark-circle" size={16} color={c.successFg} />
                <Text style={[styles.toastText, { color: c.successFg }]}>{t('lecturer.published')}</Text>
              </View>
            ) : null}
            {saveError ? (
              <View style={[styles.toast, { backgroundColor: c.dangerBg }]}>
                <Ionicons name="alert-circle" size={16} color={c.dangerFg} />
                <Text style={[styles.toastText, { color: c.dangerFg }]}>{saveError}</Text>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 60 },
  headSpacer: { height: 40 },
  title: { ...Type.greeting, fontWeight: '800' },
  block: { marginTop: 14, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { ...Type.body, fontWeight: '600', width: 92 },
  infoValue: { ...Type.body, fontWeight: '700', flex: 1, textAlign: 'right' },
  badgeRow: { flexDirection: 'row', marginTop: 2 },
  fieldLabel: { ...Type.chip, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreInput: { height: 52, borderRadius: Radius.field, borderWidth: 1, paddingHorizontal: 14, ...Type.title, fontWeight: '800' },
  feedbackInput: { minHeight: 96, borderRadius: Radius.field, borderWidth: 1, padding: 14, ...Type.bodyLg, textAlignVertical: 'top' },
  publishWrap: { marginTop: 20, borderRadius: Radius.card },
  publish: { height: 56, borderRadius: Radius.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  publishText: { ...Type.bodyLg, color: '#FFFFFF', fontWeight: '700' },
  toast: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: Radius.md },
  toastText: { ...Type.body, fontWeight: '600', flex: 1 },
})
