import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { GlassCard } from '@/components/GlassCard'
import { LoginField } from '@/components/LoginField'
import { InlineToast, PrimaryButton } from '@/components/PrimaryButton'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Aurora, Colors, Radius, Type } from '@/constants/theme'
import { api, ApiError } from '@/lib/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Step 2 of password recovery.
 *
 * BE's `ResetPasswordSchema` is `{ email, otp (exactly 6 chars), newPassword (min 6) }` —
 * an OTP flow, not a token link. The email is carried over from the previous screen as a
 * route param but stays editable, because a user who opens this screen directly (or mistyped
 * on step 1) still has to be able to finish.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ email?: string }>()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [email, setEmail] = useState(params.email ?? '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (): string | null => {
    if (!EMAIL_RE.test(email.trim())) return t('auth.emailInvalid')
    if (!/^\d{6}$/.test(otp.trim())) return t('auth.otpLength')
    if (password.length < 6) return t('auth.tooShort')
    if (password !== confirm) return t('auth.mismatch')
    return null
  }

  const onSubmit = async () => {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.resetPassword({ email: email.trim(), otp: otp.trim(), newPassword: password })
      setDone(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.resetError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScreenHeader title={t('auth.resetTitle')} fallback="/login" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GlassCard strong style={styles.sheet} radius={Radius.sheet}>
              <Text style={[styles.hint, { color: a.onGlassSoft }]}>{t('auth.resetHint')}</Text>

              <LoginField
                label={t('login.email')}
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading && !done}
              />
              <LoginField
                label={t('auth.otp')}
                icon="key-outline"
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                editable={!loading && !done}
              />
              <LoginField
                label={t('auth.newPassword')}
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                secure
                placeholder="••••••"
                editable={!loading && !done}
              />
              <LoginField
                label={t('auth.confirmPassword')}
                icon="lock-closed-outline"
                value={confirm}
                onChangeText={setConfirm}
                secure
                placeholder="••••••"
                editable={!loading && !done}
                onSubmitEditing={onSubmit}
                returnKeyType="go"
              />

              {!done ? (
                <PrimaryButton
                  label={t('auth.resetSubmit')}
                  loadingLabel={t('auth.resetting')}
                  icon="refresh-outline"
                  onPress={onSubmit}
                  loading={loading}
                />
              ) : null}

              {done ? <InlineToast text={t('auth.resetDone')} tone="ok" /> : null}
              {error ? <InlineToast text={error} tone="error" /> : null}

              <TouchableOpacity onPress={() => router.replace('/login' as never)} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.link, { color: c.primary }]}>{t('auth.backToLogin')}</Text>
              </TouchableOpacity>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 36 },
  sheet: { padding: 22, gap: 16 },
  hint: { ...Type.body, lineHeight: 20 },
  link: { ...Type.body, fontWeight: '700', textAlign: 'center' },
})
