import { create } from "zustand"

interface UiState {
  sidebarOpen: boolean
  onboardingOpen: boolean
  setSidebarOpen: (open: boolean) => void
  setOnboardingOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useUi = create<UiState>((set) => ({
  sidebarOpen: false,
  onboardingOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setOnboardingOpen: (onboardingOpen) => set({ onboardingOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
