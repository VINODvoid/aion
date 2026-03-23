import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'

// Redirect signed-in users away from auth screens immediately
export default function AuthLayout() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Redirect href="/(app)" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
    </Stack>
  )
}
