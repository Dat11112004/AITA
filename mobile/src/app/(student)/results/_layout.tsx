import { Stack } from 'expo-router'

// Results stack: transcript + submission history (index) → one submission's grade ([id]).
export default function ResultsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
