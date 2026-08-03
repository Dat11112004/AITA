import { Stack } from 'expo-router'

// Learning stack: subjects + classes (index) → subject detail → class detail.
// Every screen draws its own ScreenHeader, so the native header stays off.
export default function LearningLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
