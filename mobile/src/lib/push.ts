import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import type { AssignmentRow } from './api'

/**
 * Deadline reminders.
 *
 * SCOPE — read this before adding anything here. The backend has no device-token table and
 * no endpoint to register one (verified: no `expo push` / `deviceToken` / `fcm` / `apns`
 * anywhere under `be/src`), so nothing can push a message to this device from the server.
 * What IS possible without touching `be/` is scheduling notifications locally on the phone,
 * which is what this module does: when the assignment list loads, it books an OS-level
 * reminder 24h and 2h before each deadline.
 *
 * `registerForPush()` still fetches the Expo push token so the value can be surfaced in
 * Profile — the moment the BE grows a `POST /notifications/device` it is one call away.
 */

const CHANNEL_ID = 'deadlines'
/** Reminder offsets before the due date, in hours. */
const OFFSETS_H = [24, 2] as const

// Foreground behaviour. Without this a notification that fires while the app is open is
// swallowed silently, which reads as "the reminder never worked".
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export type ReminderData = { assignmentId?: string }

/** Ask for permission, creating the Android channel first so the prompt is categorised. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Nhắc hạn nộp',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
  }

  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  // `canAskAgain === false` means the user hard-denied; re-requesting would no-op, so the
  // caller needs to send them to system settings instead of silently failing.
  if (!current.canAskAgain) return false

  const asked = await Notifications.requestPermissionsAsync()
  return asked.granted
}

/**
 * The Expo push token for this install, or null when it cannot be obtained (simulator, web,
 * or — the common case here — no EAS projectId configured in app.json). Never throws: a
 * missing token must not break the screen that displays it.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null
  const projectId =
    (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId
  if (!projectId) return null
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId })
    return res.data ?? null
  } catch {
    return null
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return
  await Notifications.cancelAllScheduledNotificationsAsync()
}

/**
 * Re-book every reminder from scratch.
 *
 * Cancelling first is deliberate: deadlines get extended, assignments get closed, and
 * incremental bookkeeping across app launches would drift. The whole set is small (a
 * handful of open assignments × 2 offsets), so replacing it is cheaper than reconciling it.
 *
 * Returns how many reminders were actually scheduled, so the UI can say something true
 * instead of an unconditional "done".
 */
export async function scheduleDeadlineReminders(
  assignments: AssignmentRow[],
  strings: { title: string; body: (title: string, when: string) => string; in24h: string; in2h: string },
): Promise<number> {
  if (Platform.OS === 'web') return 0

  await cancelAllReminders()

  const now = Date.now()
  let booked = 0

  for (const a of assignments) {
    if (!a.due) continue
    if ((a.status ?? '').toUpperCase() !== 'PUBLISHED') continue

    const dueMs = new Date(a.due).getTime()
    if (Number.isNaN(dueMs) || dueMs <= now) continue

    for (const hours of OFFSETS_H) {
      const fireAt = dueMs - hours * 3_600_000
      // Skip an offset that is already behind us — scheduling a past date fires instantly,
      // which would spam the user with "due in 24 hours" for something due in 3.
      if (fireAt <= now) continue

      await Notifications.scheduleNotificationAsync({
        content: {
          title: strings.title,
          body: strings.body(a.title, hours === 24 ? strings.in24h : strings.in2h),
          data: { assignmentId: a.id } satisfies ReminderData,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
        },
      })
      booked++
    }
  }

  return booked
}
