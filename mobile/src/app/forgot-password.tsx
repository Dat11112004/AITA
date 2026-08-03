import { useRouter } from 'expo-router'
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
 * Step 1 of password recovery: ask the backend to mail a 6-digit code.
 *
 * The success message deliberately does not confirm whether the address exists — that would
 * turn this screen into an account-enumeration oracle. It says "if the address is valid,
 * check your inbox" either way, which is also what the BE's own response implies.
 */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setError(t('auth.emailInvalid'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.forgotPassword(value)
      setSent(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.forgotError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScreenHeader title={t('auth.forgotTitle')} fallback="/login" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GlassCard strong style={styles.sheet} radius={Radius.sheet}>
              <Text style={[styles.hint, { color: a.onGlassSoft }]}>{t('auth.forgotHint')}</Text>

              <LoginField
                label={t('login.email')}
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="student@fpt.edu.vn"
                editable={!loading}
                onSubmitEditing={onSubmit}
                returnKeyType="go"
              />

              <PrimaryButton
                label={t('auth.forgotSubmit')}
                loadingLabel={t('auth.forgotSending')}
                icon="paper-plane-outline"
                onPress={onSubmit}
                loading={loading}
                disabled={email.trim().length === 0}
              />

              {sent ? <InlineToast text={t('auth.forgotSent')} tone="ok" /> : null}
              {error ? <InlineToast text={error} tone="error" /> : null}

              <TouchableOpacity
                onPress={() => router.push({ pathname: '/reset-password', params: { email: email.trim() } } as never)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={[styles.link, { color: c.primary }]}>{t('auth.haveCode')}</Text>
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
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  sheet: { padding: 22, gap: 18 },
  hint: { ...Type.body, lineHeight: 20 },
  link: { ...Type.body, fontWeight: '700', textAlign: 'center' },
})
