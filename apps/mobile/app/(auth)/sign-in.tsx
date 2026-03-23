import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useOAuth } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { useState } from 'react'

export default function SignInScreen() {
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' })
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' })
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      const { createdSessionId, setActive } = await startGoogleFlow({
        redirectUrl: Linking.createURL('/(app)', { scheme: 'aion' }),
      })
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
      }
    } catch (err) {
      console.error('Google sign-in failed', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAppleSignIn() {
    setLoading(true)
    try {
      const { createdSessionId, setActive } = await startAppleFlow({
        redirectUrl: Linking.createURL('/(app)', { scheme: 'aion' }),
      })
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
      }
    } catch (err) {
      console.error('Apple sign-in failed', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AION</Text>
        <Text style={styles.subtitle}>The habit tracker that punishes you for quitting.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#FF0000" size="large" />
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
            <Text style={styles.buttonText}>Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.appleButton]} onPress={handleAppleSignIn}>
            <Text style={styles.buttonText}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    gap: 12,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  appleButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
})
