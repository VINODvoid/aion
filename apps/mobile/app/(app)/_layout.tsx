import { Redirect, Tabs } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { Text } from 'react-native'

// Redirect signed-out users to auth screens immediately
export default function AppLayout() {
  const { isSignedIn } = useAuth()

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#000000', borderTopColor: '#1A1A1A' },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#555555',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>◉</Text>,
        }}
      />
      <Tabs.Screen
        name="pacts/index"
        options={{
          title: 'Pacts',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚡</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>◈</Text>,
        }}
      />
    </Tabs>
  )
}
