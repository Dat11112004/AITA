import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import LottieView from 'lottie-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { GlassCard } from '@/components/GlassCard'
import { LoginField } from '@/components/LoginField'
import { Aurora, Colors, Glow, HeroAurora, Login, Radius, Type } from '@/constants/theme'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/store/AuthContext'

function lottieSize(screenHeight: number): number {
  if (screenHeight < 700) return 150
  if (screenHeight < 800) return 190
  return 220
}

export default function LoginScreen() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const { height } = useWindowDimensions()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]
  const lottie = lottieSize(height)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading

  const onSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuroraBackground>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.lottieWrap, { width: lottie, height: lottie }]}>
              <LottieView source={require('../assets/login_animation.json')} autoPlay loop speed={0.7} style={styles.lottieFill} />
            </View>

            <View style={styles.heading}>
              <Text style={[styles.welcome, { color: a.onGlassSoft }]}>{t('login.welcomeBack')}</Text>
              <Text style={[styles.brand, { color: c.primary }]}>{t('appName')}</Text>
              <Text style={[styles.tagline, { color: a.onGlassSoft }]}>{t('login.tagline')}</Text>
            </View>

            <GlassCard strong style={styles.sheet} radius={Radius.sheet}>
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
              />

              <View style={styles.gap} />

              <LoginField
                label={t('login.password')}
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                secure
                placeholder="••••••"
                editable={!loading}
                onSubmitEditing={onSubmit}
                returnKeyType="done"
              />

              <Pressable
                style={styles.rememberRow}
                onPress={() => !loading && setRemember((r) => !r)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: remember }}
              >
                <View
                  style={[
                    styles.checkbox,
                    remember ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: a.onGlassSoft },
                  ]}
                >
                  {remember ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                </View>
                <Text style={[styles.rememberText, { color: a.onGlassSoft }]}>{t('login.remember')}</Text>
              </Pressable>

              <TouchableOpacity onPress={onSubmit} disabled={!canSubmit} activeOpacity={0.88} style={[styles.buttonWrap, Glow.primary, { opacity: canSubmit ? 1 : 0.55 }]}>
                <LinearGradient colors={HeroAurora[scheme]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.buttonText}>{t('login.loading')}</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>{t('login.submit')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {error ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </GlassCard>

            <Text style={[styles.help, { color: a.onGlassSoft }]}>{t('login.help')}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  lottieWrap: { overflow: 'hidden' },
  lottieFill: { width: '100%', height: '100%' },
  heading: { alignItems: 'center', marginTop: 12, gap: 4 },
  welcome: { ...Type.bodyLg, textAlign: 'center' },
  brand: { fontSize: 34, lineHeight: 40, fontWeight: '800', textAlign: 'center', letterSpacing: 1.5 },
  tagline: { ...Type.body, textAlign: 'center' },
  sheet: { width: '100%', marginTop: 22, padding: 22 },
  gap: { height: 18 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rememberText: { ...Type.body },
  buttonWrap: { marginTop: 22, borderRadius: Radius.field },
  button: { height: 56, borderRadius: Radius.field, alignItems: 'center', justifyContent: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttonText: { ...Type.bodyLg, color: '#FFFFFF', fontWeight: '700' },
  errorCard: { marginTop: 16, borderRadius: Radius.md, backgroundColor: Login.errorBg, borderWidth: 1, borderColor: Login.errorBorder, padding: 16 },
  errorText: { ...Type.body, color: Login.errorFg },
  help: { ...Type.body, textAlign: 'center', marginTop: 16 },
})
