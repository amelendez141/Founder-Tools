import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TrialMessage {
  role: "user" | "assistant";
  content: string;
}

interface TrialState {
  sessionToken: string | null;
  messages: TrialMessage[];
  remainingMessages: number;
  setSessionToken: (token: string) => void;
  addMessage: (message: TrialMessage) => void;
  setRemainingMessages: (count: number) => void;
  clearTrial: () => void;
}

export const useTrialStore = create<TrialState>()(
  persist(
    (set) => ({
      sessionToken: null,
      messages: [],
      remainingMessages: 3,
      setSessionToken: (token) => set({ sessionToken: token }),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setRemainingMessages: (count) => set({ remainingMessages: count }),
      clearTrial: () =>
        set({ sessionToken: null, messages: [], remainingMessages: 3 }),
    }),
    {
      name: "trial-storage",
    }
  )
);
