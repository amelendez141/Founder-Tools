import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { User } from "@/lib/api/client";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
        }
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      skipHydration: true,
    }
  )
);

// Hook to wait for client-side hydration
export function useHasHydrated() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Manually trigger Zustand hydration on client
    useAuthStore.persist.rehydrate();
    setHasHydrated(true);
  }, []);

  return hasHydrated;
}
