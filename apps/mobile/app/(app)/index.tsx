import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'

import { apiRequest } from '@/lib/api-client'

type Pact = {
  id: string
  name: string
  status: string
  streak: { currentStreak: number; multiplier: number } | null
}

export default function DashboardScreen() {
  const { getToken } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['pacts'],
    queryFn: async () => {
      const token = await getToken()
      return apiRequest<{ pacts: Pact[] }>('/api/pacts', { token: token ?? undefined })
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TODAY</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {isLoading && <Text style={styles.empty}>Loading pacts...</Text>}

        {!isLoading && data?.pacts.length === 0 && (
          <Text style={styles.empty}>No active pacts. Create one to get started.</Text>
        )}

        {data?.pacts.map((pact) => (
          <View key={pact.id} style={styles.pactCard}>
            <Text style={styles.pactName}>{pact.name}</Text>
            <View style={styles.pactMeta}>
              <Text style={styles.streak}>
                {pact.streak?.currentStreak ?? 0} day streak
              </Text>
              {(pact.streak?.multiplier ?? 1) > 1 && (
                <Text style={styles.multiplier}>{pact.streak?.multiplier}x XP</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  date: { fontSize: 14, color: '#555555', marginTop: 4 },
  list: { flex: 1 },
  listContent: { padding: 24, gap: 12 },
  empty: { color: '#555555', fontSize: 14, textAlign: 'center', marginTop: 40 },
  pactCard: { backgroundColor: '#0D0D0D', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#1A1A1A' },
  pactName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  pactMeta: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
  streak: { fontSize: 13, color: '#888888' },
  multiplier: { fontSize: 12, color: '#FF4444', fontWeight: '700', backgroundColor: '#1A0000', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
})
