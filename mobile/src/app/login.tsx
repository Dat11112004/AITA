import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ApiError } from '@/lib/api'
import { Brand, Colors } from '@/constants/theme'
import { useAuth } from '@/store/AuthContext'

export default function LoginScreen() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
      // Navigation handled by the root layout once status becomes 'authed'.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Text style={[styles.brand, { color: Brand[600] }]}>{t('appName')}</Text>
          <Text style={[styles.title, { color: c.text }]}>{t('login.title')}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('login.subtitle')}</Text>

          <Text style={[styles.label, { color: c.textSecondary }]}>{t('login.email')}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="student@fpt.edu.vn"
            placeholderTextColor={c.textSecondary}
            style={[styles.input, { color: c.text, borderColor: c.backgroundSelected, backgroundColor: c.backgroundElement }]}
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>{t('login.password')}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••"
            placeholderTextColor={c.textSecondary}
            style={[styles.input, { color: c.text, borderColor: c.backgroundSelected, backgroundColor: c.backgroundElement }]}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.button, { backgroundColor: Brand[600], opacity: loading ? 0.7 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('login.submit')}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 6 },
  brand: { fontSize: 34, fontWeight: '800', textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  error: { color: '#dc2626', marginTop: 10 },
  button: { marginTop: 20, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
