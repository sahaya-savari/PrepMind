import { createContext, useMemo, type ReactNode } from 'react';
import { AIMessage } from '../api';

export type AuthContextType = {
  updateProgress: (correct: boolean) => void;
  saveChatHistory: (messages: AIMessage[]) => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Minimal: only provide updateProgress and saveChatHistory
  const updateProgress = () => {};
  const saveChatHistory = () => {};
  const value = useMemo(() => ({ updateProgress, saveChatHistory }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
