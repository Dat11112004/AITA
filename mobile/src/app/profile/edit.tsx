import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuroraBackground } from '@/components/AuroraBackground'
import { Avatar } from '@/components/Avatar'
import { GlassCard } from '@/components/GlassCard'
import { GlassField } from '@/components/GlassField'
import { InlineToast, PrimaryButton } from '@/components/PrimaryButton'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Aurora, Colors, Layout, Type } from '@/constants/theme'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/store/AuthContext'

type PickedImage = { uri: string; name: string; type: string }

/** Derive a filename + MIME type the multipart upload can carry. */
function toUpload(asset: ImagePicker.ImagePickerAsset): PickedImage {
  const uri = asset.uri
  const extFromUri = uri.split('?')[0].split('.').pop()?.toLowerCase()
  const ext = extFromUri && extFromUri.length <= 5 ? extFromUri : 'jpg'
  return {
    uri,
    name: asset.fileName ?? `avatar.${ext}`,
    // `mimeType` is present on newer SDKs; fall back to the extension so the server never
    // receives an empty content-type for the part.
    type: asset.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  }
}

export default function EditProfileScreen() {
  const { t } = useTranslation()
  const { user, status, applyUser } = useAuth()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = Colors[scheme]
  const a = Aurora[scheme]

  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [picked, setPicked] = useState<PickedImage | null>(null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  // AuthContext boots with `user === null` and only fills it after /auth/me resolves, so the
  // useState initialisers above capture empty strings on a cold open (deep link, refresh) and
  // the form renders blank over real data. Seed once, the first time a user actually arrives.
  const seeded = useRef(user != null)
  useEffect(() => {
    if (seeded.current || !user) return
    seeded.current = true
    setFullName(user.fullName ?? '')
    setPhone(user.phone ?? '')
  }, [user])

  // Until that seed lands, the inputs are not showing the user's data — let them look busy
  // rather than inviting edits that the seed would overwrite.
  const hydrating = status === 'loading'

  const pickAvatar = async () => {
    setNote(null)
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setNote({ text: t('editProfile.permission'), tone: 'error' })
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (res.canceled || !res.assets?.[0]) return
    setPicked(toUpload(res.assets[0]))
  }

  const onSave = async () => {
    const name = fullName.trim()
    if (name.length < 2) {
      setNameError(t('editProfile.nameRequired'))
      return
    }
    setNameError(null)
    setSaving(true)
    setNote(null)
    try {
      const form = new FormData()
      form.append('fullName', name)
      form.append('phone', phone.trim())
      if (picked) {
        if (Platform.OS === 'web') {
          // The browser's FormData is the real DOM one: handed a plain object it calls
          // toString() and sends the literal "[object Object]", so the server receives a text
          // field and no file at all. Read the picked URI back into a Blob and send that.
          const blob = await (await fetch(picked.uri)).blob()
          form.append('avatar', blob, picked.name)
        } else {
          // React Native's FormData polyfill does understand {uri,name,type} and streams the
          // file itself; the cast is only needed because the DOM types don't describe it.
          form.append('avatar', { uri: picked.uri, name: picked.name, type: picked.type } as unknown as Blob)
        }
      }

      const updated = await api.updateProfile(form)
      await applyUser(updated)
      setPicked(null)
      setNote({ text: t('editProfile.saved'), tone: 'ok' })
    } catch (e) {
      setNote({ text: e instanceof ApiError ? e.message : t('editProfile.error'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScreenHeader title={t('editProfile.title')} fallback="/profile" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GlassCard strong style={styles.card}>
              <Text style={[styles.label, { color: a.onGlassSoft }]}>{t('editProfile.avatar')}</Text>
              <View style={styles.avatarRow}>
                <Avatar name={fullName || user?.email} uri={picked?.uri ?? user?.avatar} size={76} />
                <View style={styles.avatarActions}>
                  <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} accessibilityRole="button">
                    <View style={[styles.chip, { borderColor: c.primary }]}>
                      <Ionicons name="image-outline" size={16} color={c.primary} />
                      <Text style={[styles.chipText, { color: c.primary }]}>{t('editProfile.changeAvatar')}</Text>
                    </View>
                  </TouchableOpacity>
                  {picked ? (
                    <TouchableOpacity onPress={() => setPicked(null)} accessibilityRole="button" hitSlop={6}>
                      <Text style={[styles.reset, { color: a.onGlassSoft }]}>{t('editProfile.removeAvatar')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </GlassCard>

            <GlassCard strong style={styles.card}>
              <GlassField
                label={t('editProfile.fullName')}
                icon="person-outline"
                value={fullName}
                onChangeText={setFullName}
                editable={!saving && !hydrating}
                error={nameError}
              />
              <GlassField
                label={t('editProfile.phone')}
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder={t('editProfile.phonePlaceholder')}
                editable={!saving && !hydrating}
              />
            </GlassCard>

            <PrimaryButton
              label={t('editProfile.save')}
              loadingLabel={t('editProfile.saving')}
              icon="checkmark"
              onPress={onSave}
              loading={saving || hydrating}
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
  label: { ...Type.chip, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: -6 },
  avatarActions: { flex: 1, gap: 8, alignItems: 'flex-start' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { ...Type.body, fontWeight: '700' },
  reset: { ...Type.body },
})
