import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { GlassCard } from '@/components/GlassCard'
import { GlassField } from '@/components/GlassField'
import { InlineToast, PrimaryButton } from '@/components/PrimaryButton'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Aurora, Colors, Layout, Radius, Type } from '@/constants/theme'
import { api, ApiError, type ClassRow } from '@/lib/api'
import { useNotifications } from '@/store/NotificationsContext'

/**
 * Compose a notification for one or more of the lecturer's own classes.
 *
 * SCOPE — role-wide audiences (students / lecturers / everyone) were removed on 2026-08-03:
 * a lecturer should only ever reach the classes they teach. `POST /notifications/broadcast`
 * now accepts `classIds` and resolves the enrolled students server-side; it answers 403 if
 * any class is not the caller's, so the picker below cannot be used to reach anyone else.
 */
export default function BroadcastScreen() {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]
  const { refresh } = useNotifications()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true)
    try {
      setClasses((await api.getClasses(1, 100)) ?? [])
    } catch {
      // Leave the list empty; the empty state below already explains there is nothing to pick.
      setClasses([])
    } finally {
      setLoadingClasses(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const canSend = title.trim().length > 0 && message.trim().length > 0 && picked.length > 0 && !sending

  const onSend = async () => {
    if (!canSend) return
    setSending(true)
    setNote(null)
    try {
      const res = await api.broadcastNotification({
        title: title.trim(),
        message: message.trim(),
        classIds: picked,
      })
      const n = res?.recipientCount
      setNote({ text: typeof n === 'number' ? t('notify.sentCount', { count: n }) : t('notify.sent'), tone: 'ok' })
      setTitle('')
      setMessage('')
      setPicked([])
      await refresh()
    } catch (e) {
      setNote({ text: e instanceof ApiError ? e.message : t('notify.sendError'), tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScreenHeader title={t('notify.broadcastTitle')} fallback="/(lecturer)/notifications" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GlassCard strong style={styles.card}>
              <GlassField
                label={t('notify.subject')}
                icon="text-outline"
                value={title}
                onChangeText={setTitle}
                placeholder={t('notify.subjectPlaceholder')}
                editable={!sending}
              />
              <GlassField
                label={t('notify.body')}
                value={message}
                onChangeText={setMessage}
                placeholder={t('notify.bodyPlaceholder')}
                multiline
                editable={!sending}
              />
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('notify.pickClasses')}</Text>

              {loadingClasses ? (
                <Text style={[styles.footnote, { color: a.onGlassSoft }]}>{t('common.loading')}</Text>
              ) : classes.length === 0 ? (
                <Text style={[styles.footnote, { color: a.onGlassSoft }]}>{t('notify.noClassesToPick')}</Text>
              ) : (
                <View style={styles.options}>
                  {classes.map((cl) => {
                    const active = picked.includes(cl.id)
                    // An empty class is the trap here: sending to it succeeds and reaches
                    // nobody, so the roster size is on the chip and the row is not selectable.
                    const size = Number(cl.studentCount ?? 0)
                    const empty = size === 0
                    return (
                      <TouchableOpacity
                        key={cl.id}
                        activeOpacity={empty ? 1 : 0.85}
                        disabled={empty}
                        onPress={() => toggle(cl.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active, disabled: empty }}
                        accessibilityLabel={`${cl.code} ${cl.name}, ${size} sinh viên`}
                        style={[
                          styles.option,
                          {
                            backgroundColor: active ? c.primarySoft : a.glass,
                            borderColor: active ? c.primary : a.glassBorder,
                            opacity: empty ? 0.45 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name={empty ? 'ban-outline' : active ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={active ? c.primary : a.onGlassSoft}
                        />
                        <View style={styles.optionBody}>
                          <Text style={[styles.optionText, { color: active ? c.primary : a.onGlassSoft }]} numberOfLines={1}>
                            {cl.code} · {t('notify.studentCount', { count: size })}
                          </Text>
                          <Text style={[styles.optionSub, { color: active ? c.primary : a.onGlassSoft }]} numberOfLines={1}>
                            {cl.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              <Text style={[styles.footnote, { color: a.onGlassSoft }]}>{t('notify.classScope')}</Text>
            </GlassCard>

            <PrimaryButton
              label={t('notify.send')}
              loadingLabel={t('notify.sending')}
              icon="paper-plane-outline"
              onPress={onSend}
              loading={sending}
              disabled={!canSend}
            />

            {note ? <InlineToast text={note.text} tone={note.tone} /> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Layout.screenPad, paddingBottom: 130, gap: 14 },
  card: { gap: 14 },
  label: { ...Type.chip, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  options: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  optionText: { ...Type.body, fontWeight: '700' },
  optionBody: { maxWidth: 190 },
  optionSub: { ...Type.chip, opacity: 0.85 },
  footnote: { ...Type.chip, lineHeight: 16 },
})
