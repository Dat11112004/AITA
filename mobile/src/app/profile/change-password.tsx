import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { GlassCard } from '@/components/GlassCard'
import { GlassField } from '@/components/GlassField'
import { InlineToast, PrimaryButton } from '@/components/PrimaryButton'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Aurora, Layout, Type } from '@/constants/theme'
import { api, ApiError } from '@/lib/api'

export default function ChangePasswordScreen() {
  const { t } = useTranslation()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const a = Aurora[scheme]

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const [fieldError, setFieldError] = useState<{ next?: string; confirm?: string }>({})

  const onSubmit = async () => {
    // Validate locally first: a 6-character minimum and a typo in the confirmation are both
    // things the user can fix without a round trip.
    const errors: { next?: string; confirm?: string } = {}
    if (newPassword.length < 6) errors.next = t('auth.tooShort')
    if (newPassword !== confirm) errors.confirm = t('auth.mismatch')
    setFieldError(errors)
    if (errors.next || errors.confirm) return

    setSaving(true)
    setNote(null)
    try {
      // BE's ChangePasswordSchema expects `oldPassword` — not `currentPassword`.
      await api.changePassword({ oldPassword, newPassword })
      setNote({ text: t('auth.changeDone'), tone: 'ok' })
      setOldPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (e) {
      setNote({ text: e instanceof ApiError ? e.message : t('auth.changeError'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = oldPassword.length > 0 && newPassword.length > 0 && confirm.length > 0 && !saving

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScreenHeader title={t('auth.changeTitle')} fallback="/profile" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GlassCard strong style={styles.card}>
              <Text style={[styles.hint, { color: a.onGlassSoft }]}>{t('auth.tooShort')}</Text>

              <GlassField
                label={t('auth.oldPassword')}
                icon="lock-closed-outline"
                value={oldPassword}
                onChangeText={setOldPassword}
                secure
                placeholder="••••••"
                editable={!saving}
              />
              <GlassField
                label={t('auth.newPassword')}
                icon="key-outline"
                value={newPassword}
                onChangeText={setNewPassword}
                secure
                placeholder="••••••"
                editable={!saving}
                error={fieldError.next}
              />
              <GlassField
                label={t('auth.confirmPassword')}
                icon="key-outline"
                value={confirm}
                onChangeText={setConfirm}
                secure
                placeholder="••••••"
                editable={!saving}
                error={fieldError.confirm}
                onSubmitEditing={onSubmit}
                returnKeyType="go"
              />
            </GlassCard>

            <PrimaryButton
              label={t('auth.changeSubmit')}
              loadingLabel={t('auth.changing')}
              icon="shield-checkmark-outline"
              onPress={onSubmit}
              loading={saving}
              disabled={!canSubmit}
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
  content: { padding: Layout.screenPad, paddingBottom: 40, gap: 14 },
  card: { gap: 16 },
  hint: { ...Type.body },
})
