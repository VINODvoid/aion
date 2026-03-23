import { create } from 'zustand'

type UserProfile = {
  id: string
  name: string
  email: string
  level: number
  totalXP: number
  timezone: string
}

type UserStore = {
  user: UserProfile | null
  setUser: (user: UserProfile) => void
  clearUser: () => void
}

// Zustand store for the authenticated user's profile.
// Populated after sign-in via the /api/users/me response.
// Cleared on sign-out.
export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
