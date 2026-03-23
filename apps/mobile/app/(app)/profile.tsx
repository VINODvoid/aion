import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api-client'
import { calculateLevel } from '@aion/shared'

type XPResponse = {
  totalXP: number
  level: number
  currentLevelXP: number
  nextLevelXP: number
  progressPercent: number
}

export default function ProfileScreen() {
  const { getToken, signOut } = useAuth()

  const { data } = useQuery({
    queryKey: ['xp'],
    queryFn: async () => {
      const token = await getToken()
      return apiRequest<XPResponse>('/api/xp', { token: token ?? undefined })
    },
  })

  const levelData = data ? calculateLevel(data.totalXP) : null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PROFILE</Text>
      </View>

      <View style={styles.content}>
        {levelData && (
          <View style={styles.xpCard}>
            <Text style={styles.level}>Level {levelData.level}</Text>
            <Text style={styles.xp}>{data?.totalXP.toLocaleString()} XP</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${levelData.progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {levelData.currentLevelXP} / {levelData.nextLevelXP} XP to next level
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  content: { flex: 1, padding: 24, gap: 24 },
  xpCard: { backgroundColor: '#0D0D0D', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#1A1A1A', gap: 8 },
  level: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  xp: { fontSize: 16, color: '#888888' },
  progressBar: { height: 6, backgroundColor: '#1A1A1A', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', backgroundColor: '#FF0000', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#555555' },
  signOutButton: { marginTop: 'auto', borderWidth: 1, borderColor: '#333333', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  signOutText: { color: '#888888', fontWeight: '600' },
})
