import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

export default function PactsScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PACTS</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => router.push('/(app)/pacts/new')}>
          <Text style={styles.newButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>Pact list — coming soon</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  newButton: { backgroundColor: '#FF0000', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  newButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#555555', fontSize: 14 },
})
