import { QueryClient } from '@tanstack/react-query'

// Single QueryClient instance shared across the app.
// Stale time of 30s — most data doesn't need to be re-fetched on every focus.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
    },
  },
})
