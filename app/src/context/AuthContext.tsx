import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AIMessage } from '../api';
import {
  User,
  UserData,
  loadUser,
  saveUser,
  clearUser,
  loadUserData,
  saveUserData,
} from '../storage';

export type AuthContextType = {
  user: User | null;
  data: UserData;
  login: (email: string) => void;
  signup: (name: string, email: string) => void;
  logout: () => void;
  setExamOverview: (exam: string, overview: string) => void;
  updateProgress: (correct: boolean) => void;
  saveChatHistory: (messages: AIMessage[]) => void;
  addRecentExam: (exam: string) => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserData>({
    exam: '',
    overview: '',
    progress: { total: 0, correct: 0 },
    chatHistory: [],
    notes: [],
    recentExams: [],
  });

  useEffect(() => {
    const existing = loadUser();
    if (existing) {
      setUser(existing);
      setData(loadUserData(existing.id));
    }
  }, []);

  const persistData = (next: UserData) => {
    if (!user) return;
    setData(next);
    saveUserData(user.id, next);
  };

  const login = (email: string) => {
    const existing = loadUser();
    if (existing && existing.email === email) {
      setUser(existing);
      setData(loadUserData(existing.id));
      return;
    }
    const fallback: User = {
      id: crypto.randomUUID(),
      name: 'Learner',
      email,
    };
    setUser(fallback);
    saveUser(fallback);
    setData(loadUserData(fallback.id));
  };

  const signup = (name: string, email: string) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Learner',
      email,
    };
    setUser(newUser);
    saveUser(newUser);
    setData(loadUserData(newUser.id));
  };

  const logout = () => {
    setUser(null);
    clearUser();
  };

  const setExamOverview = (exam: string, overview: string) => {
    const recent = [exam, ...data.recentExams.filter((e) => e !== exam)].slice(0, 5);
    const next = { ...data, exam, overview, recentExams: recent };
    persistData(next);
  };

  const updateProgress = (correct: boolean) => {
    const { total, correct: c } = data.progress;
    const next = {
      ...data,
      progress: {
        total: total + 1,
        correct: c + (correct ? 1 : 0),
      },
    };
    persistData(next);
  };

  const saveChatHistory = (messages: AIMessage[]) => {
    const trimmed = messages.slice(-20);
    const next = { ...data, chatHistory: trimmed };
    persistData(next);
  };

  const addRecentExam = (exam: string) => {
    if (!exam) return;
    const recent = [exam, ...data.recentExams.filter((e) => e !== exam)].slice(0, 5);
    const next = { ...data, recentExams: recent };
    persistData(next);
  };

  const value = useMemo(
    () => ({ user, data, login, signup, logout, setExamOverview, updateProgress, saveChatHistory, addRecentExam }),
    [user, data],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
