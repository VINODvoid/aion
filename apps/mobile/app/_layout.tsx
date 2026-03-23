import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import { QueryClientProvider } from '@tanstack/react-query'
import * as SecureStore from 'expo-secure-store'
import * as SplashScreen from 'expo-splash-screen'
import Constants from 'expo-constants'

import { queryClient } from '@/lib/query-client'

// Keep splash screen visible until fonts and auth state are ready
SplashScreen.preventAutoHideAsync()

// Clerk token cache — stores session token in device secure storage.
// Never use AsyncStorage for tokens — SecureStore is encrypted by the OS.
const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key)
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value)
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key)
  },
}

const publishableKey = Constants.expoConfig?.extra?.clerkPublishableKey
  ?? process.env['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY']
  ?? ''

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </ClerkProvider>
  )
}

function RootNavigator() {
  const { isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync()
    }
  }, [isLoaded])

  if (!isLoaded) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  )
}
