import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { Avatar } from '@/components/Avatar'
import { GlassCard } from '@/components/GlassCard'
import { InlineToast } from '@/components/PrimaryButton'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Aurora, Colors, Glow, HeroAurora, Layout, Radius, Type } from '@/constants/theme'
import { api } from '@/lib/api'
import { ensureNotificationPermission, getExpoPushToken, cancelAllReminders, scheduleDeadlineReminders } from '@/lib/push'
import { secureStore } from '@/lib/secureStore'
import { useAuth } from '@/store/AuthContext'

export default function ProfileScreen() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const router = useRouter()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [remindersOn, setRemindersOn] = useState(false)
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [pushNote, setPushNote] = useState<{ text: string; tone: 'ok' | 'error' | 'info' } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const on = await secureStore.getPushPref()
      if (!alive) return
      setRemindersOn(on)
      if (on) setPushToken(await getExpoPushToken())
    })()
    return () => {
      alive = false
    }
  }, [])

  /**
   * Flipping the switch does the real work immediately — ask the OS, then book or clear the
   * reminders — rather than storing a preference that only takes effect on the next launch.
   */
  const toggleReminders = useCallback(
    async (next: boolean) => {
      if (busy) return
      setBusy(true)
      setPushNote(null)
      try {
        if (!next) {
          await cancelAllReminders()
          await secureStore.setPushPref(false)
          setRemindersOn(false)
          setPushToken(null)
          return
        }

        const granted = await ensureNotificationPermission()
        if (!granted) {
          setRemindersOn(false)
          await secureStore.setPushPref(false)
          setPushNote({ text: t('push.denied'), tone: 'error' })
          return
        }

        const assignments = await api.getAssignments().catch(() => [])
        const booked = await scheduleDeadlineReminders(assignments, {
          title: t('push.reminderTitle'),
          body: (title, when) => t('push.reminderBody', { title, when }),
          in24h: t('push.in24h'),
          in2h: t('push.in2h'),
        })

        await secureStore.setPushPref(true)
        setRemindersOn(true)
        setPushToken(await getExpoPushToken())
        setPushNote(
          booked > 0
            ? { text: t('push.scheduled', { count: booked }), tone: 'ok' }
            : { text: t('push.none'), tone: 'info' },
        )
      } finally {
        setBusy(false)
      }
    },
    [busy, t],
  )

  const name = user?.fullName ?? user?.email ?? ''
  const roleLabel =
    user?.role === 'lecturer' ? t('profile.roleLecturer') : user?.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleStudent')
  const code = user?.lecturerCode ?? user?.studentCode ?? null
  const active = (user?.status ?? '').toLowerCase() === 'active'
  const fallback = user?.role === 'lecturer' ? '/(lecturer)/dashboard' : '/(student)/dashboard'

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'mail-outline', label: t('profile.email'), value: user?.email ?? t('profile.empty') },
    { icon: 'id-card-outline', label: t('profile.code'), value: code ?? t('profile.empty') },
    { icon: 'call-outline', label: t('profile.phone'), value: user?.phone ?? t('profile.empty') },
  ]

  const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; to: string }[] = [
    { icon: 'person-circle-outline', label: t('editProfile.title'), to: '/profile/edit' },
    { icon: 'lock-closed-outline', label: t('auth.changeTitle'), to: '/profile/change-password' },
  ]

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScreenHeader title={t('profile.title')} fallback={fallback} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* identity */}
          <View style={[styles.idWrap, Glow.primary]}>
            <LinearGradient colors={HeroAurora[scheme]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.idCard}>
              <Avatar name={name} uri={user?.avatar} size={72} onGradient />
              <Text style={styles.idName} numberOfLines={1}>
                {name}
              </Text>
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
                <Text style={[styles.infoValue, { color: a.onGlass }]} numberOfLines={1}>
                  {r.value}
                </Text>
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

          {/* actions */}
          {actions.map((act) => (
            <TouchableOpacity key={act.to} activeOpacity={0.85} onPress={() => router.push(act.to as never)}>
              <GlassCard style={styles.actionRow}>
                <Ionicons name={act.icon} size={18} color={c.primary} />
                <Text style={[styles.actionText, { color: a.onGlass }]}>{act.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={a.onGlassSoft} />
              </GlassCard>
            </TouchableOpacity>
          ))}

          {/* deadline reminders */}
          <GlassCard style={styles.pushCard}>
            <View style={styles.pushRow}>
              <Ionicons name="notifications-outline" size={18} color={c.primary} />
              <View style={styles.pushText}>
                <Text style={[styles.actionText, { color: a.onGlass }]}>{t('push.title')}</Text>
                <Text style={[styles.pushSub, { color: a.onGlassSoft }]}>{t('push.subtitle')}</Text>
              </View>
              <Switch
                value={remindersOn}
                onValueChange={toggleReminders}
                disabled={busy}
                trackColor={{ true: c.primary, false: a.glassBorder }}
                thumbColor="#FFFFFF"
              />
            </View>

            {pushNote ? <InlineToast text={pushNote.text} tone={pushNote.tone} /> : null}

            {pushToken ? (
              <View style={styles.tokenBox}>
                <Text style={[styles.tokenLabel, { color: a.onGlassSoft }]}>{t('push.tokenLabel')}</Text>
                <Text style={[styles.token, { color: a.onGlass }]} numberOfLines={2} selectable>
                  {pushToken}
                </Text>
                <Text style={[styles.pushSub, { color: a.onGlassSoft }]}>{t('push.tokenHint')}</Text>
              </View>
            ) : null}
          </GlassCard>

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
  content: { padding: Layout.screenPad, paddingBottom: 40, gap: 14 },
  idWrap: { borderRadius: Radius.card + 4 },
  idCard: { borderRadius: Radius.card + 4, alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, gap: 10, overflow: 'hidden' },
  idName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleText: { ...Type.body, color: '#FFFFFF', fontWeight: '700' },
  block: { paddingVertical: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  infoLabel: { ...Type.body, fontWeight: '600', width: 92 },
  infoValue: { ...Type.body, fontWeight: '700', flex: 1, textAlign: 'right' },
  statusPill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { ...Type.chip, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionText: { ...Type.bodyLg, fontWeight: '700', flex: 1 },
  pushCard: { gap: 12 },
  pushRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pushText: { flex: 1, gap: 1 },
  pushSub: { ...Type.body },
  tokenBox: { gap: 4 },
  tokenLabel: { ...Type.chip, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  token: { ...Type.body, fontWeight: '600' },
  logout: {
    marginTop: 6,
    height: 52,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { ...Type.bodyLg, fontWeight: '700' },
})
