import Constants from 'expo-constants'

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string
}

// Lightweight fetch wrapper — keeps all API calls consistent.
// The token is the Clerk session JWT, passed in by each hook via useAuth().
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? `Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}
