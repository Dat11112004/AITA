import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { GlassCard } from '@/components/GlassCard'
import { Aurora, Colors, Glow, HeroAurora, Layout, Radius, Type } from '@/constants/theme'
import { useAuth } from '@/store/AuthContext'

export default function ProfileScreen() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]
  const [pwNote, setPwNote] = useState(false)

  // `profile` is a root-level route; if it was opened without a back-stack (e.g. a reload
  // landed here), router.back() dispatches GO_BACK with nothing to pop. Fall back to the
  // role dashboard so the back button always works.
  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace((user?.role === 'lecturer' ? '/(lecturer)/dashboard' : '/(student)/dashboard') as any)
  }

  const name = user?.fullName ?? user?.email ?? ''
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  const roleLabel =
    user?.role === 'lecturer' ? t('profile.roleLecturer') : user?.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleStudent')
  const code = user?.lecturerCode ?? user?.studentCode ?? null
  const active = (user?.status ?? '').toLowerCase() === 'active'

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'mail-outline', label: t('profile.email'), value: user?.email ?? t('profile.empty') },
    { icon: 'id-card-outline', label: t('profile.code'), value: code ?? t('profile.empty') },
    { icon: 'call-outline', label: t('profile.phone'), value: user?.phone ?? t('profile.empty') },
  ]

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        {/* top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBack} hitSlop={10} style={[styles.iconBtn, { backgroundColor: a.glass, borderColor: a.glassBorder }]}>
            <Ionicons name="chevron-back" size={20} color={a.onGlass} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: a.onGlass }]}>{t('profile.title')}</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* identity card */}
          <View style={[styles.idWrap, Glow.primary]}>
            <LinearGradient colors={HeroAurora[scheme]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.idCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <Text style={styles.idName} numberOfLines={1}>{name}</Text>
              <View style={styles.rolePill}>
                <Ionicons name={user?.role === 'lecturer' ? 'briefcase' : 'school'} size={13} color="#FFFFFF" />
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* info */}
          <GlassCard style={styles.block} strong>
            {rows.map((r, i) => (
              <View key={r.label} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: a.glassBorder }]}>
                <Ionicons name={r.icon} size={18} color={c.primary} />
                <Text style={[styles.infoLabel, { color: a.onGlassSoft }]}>{r.label}</Text>
                <Text style={[styles.infoValue, { color: a.onGlass }]} numberOfLines={1}>{r.value}</Text>
              </View>
            ))}
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: a.glassBorder }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={c.primary} />
              <Text style={[styles.infoLabel, { color: a.onGlassSoft }]}>{t('profile.accountStatus')}</Text>
              <View style={[styles.statusPill, { backgroundColor: active ? c.successBg : c.neutralBg }]}>
                <Text style={[styles.statusText, { color: active ? c.successFg : c.neutralFg }]}>
                  {active ? t('profile.active') : t('profile.inactive')}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* change password */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => setPwNote(true)}>
            <GlassCard style={styles.actionRow}>
              <Ionicons name="lock-closed-outline" size={18} color={c.primary} />
              <Text style={[styles.actionText, { color: a.onGlass }]}>{t('profile.changePassword')}</Text>
              <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
            </GlassCard>
          </TouchableOpacity>
          {pwNote ? <Text style={[styles.note, { color: a.onGlassSoft }]}>{t('profile.changePasswordSoon')}</Text> : null}

          {/* logout */}
          <TouchableOpacity onPress={logout} activeOpacity={0.85} style={[styles.logout, { borderColor: c.danger }]}>
            <Ionicons name="log-out-outline" size={18} color={c.danger} />
            <Text style={[styles.logoutText, { color: c.danger }]}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenPad, paddingTop: 4, paddingBottom: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topTitle: { ...Type.title, fontWeight: '800' },
  content: { padding: Layout.screenPad, paddingBottom: 40, gap: 14 },
  idWrap: { borderRadius: Radius.card + 4 },
  idCard: { borderRadius: Radius.card + 4, alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, gap: 10, overflow: 'hidden' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#FFFFFF' },
  idName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  roleText: { ...Type.body, color: '#FFFFFF', fontWeight: '700' },
  block: { paddingVertical: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  infoLabel: { ...Type.body, fontWeight: '600', width: 92 },
  infoValue: { ...Type.body, fontWeight: '700', flex: 1, textAlign: 'right' },
  statusPill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { ...Type.chip, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionText: { ...Type.bodyLg, fontWeight: '700', flex: 1 },
  note: { ...Type.body, textAlign: 'center', marginTop: -6 },
  logout: { marginTop: 6, height: 52, borderRadius: Radius.card, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { ...Type.bodyLg, fontWeight: '700' },
})
