import {
  createContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { AIMessage } from '../api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  setExamOverview: (exam: string, overview: string) => void;
  updateProgress: (correct: boolean) => void;
  saveChatHistory: (messages: AIMessage[]) => void;
  addRecentExam: (exam: string) => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

const defaultData: UserData = {
  exam: '',
  overview: '',
  progress: { total: 0, correct: 0 },
  chatHistory: [],
  notes: [],
  recentExams: [],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserData>(defaultData);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  // Load initial session: checks Supabase first if configured, then local storage
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        if (supabase?.auth?.getSession) {
          const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
          const supaUser = sessionData?.session?.user;

          if (supaUser && isMounted) {
            const mappedUser: User = {
              id: supaUser.id,
              name: supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'Scholar',
              email: supaUser.email || '',
              isGuest: false,
              createdAt: supaUser.created_at,
            };
            setUser(mappedUser);
            saveUser(mappedUser);
            setData(loadUserData(mappedUser.id));
            setLoading(false);
            return;
          }
        }

        // Fallback to local user
        const existing = loadUser();
        if (existing && isMounted) {
          setUser(existing);
          setData(loadUserData(existing.id));
        }
      } catch (err) {
        console.warn('[PrepMind] Auth initialization warning:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Subscribe to Supabase auth state changes if configured
    let subscription: { unsubscribe: () => void } | null = null;
    if (supabase?.auth?.onAuthStateChange) {
      try {
        const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
          if (!isMounted) return;
          const supaUser = session?.user;
          if (supaUser) {
            const mapped: User = {
              id: supaUser.id,
              name: supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'Scholar',
              email: supaUser.email || '',
              isGuest: false,
              createdAt: supaUser.created_at,
            };
            setUser(mapped);
            saveUser(mapped);
            setData(loadUserData(mapped.id));
          } else {
            // Do not clear local guest users when Supabase fires initial null
            if (user && !user.isGuest && !isConfigured) {
              setUser(null);
              clearUser();
            }
          }
        });
        subscription = sub?.subscription || null;
      } catch {
        // Ignore subscription errors
      }
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const persistData = useCallback((next: UserData) => {
    if (!user) return;
    setData(next);
    saveUserData(user.id, next);
  }, [user]);

  const login = useCallback(
    async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
      const cleanEmail = email.trim();
      if (!cleanEmail) return { success: false, error: 'Email is required.' };

      // 1. Try Supabase Auth if credentials provided & password supplied
      if (isConfigured && password && supabase?.auth?.signInWithPassword) {
        try {
          const { data: authResult, error: supaErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (supaErr) {
            return { success: false, error: supaErr.message };
          }

          if (authResult?.user) {
            const mappedUser: User = {
              id: authResult.user.id,
              name: authResult.user.user_metadata?.name || cleanEmail.split('@')[0] || 'Scholar',
              email: authResult.user.email || cleanEmail,
              isGuest: false,
              createdAt: authResult.user.created_at,
            };
            setUser(mappedUser);
            saveUser(mappedUser);
            setData(loadUserData(mappedUser.id));
            return { success: true };
          }
        } catch (err: any) {
          return { success: false, error: err?.message || 'Supabase authentication failed.' };
        }
      }

      // 2. Local authentication fallback (works without cloud connection or without password)
      const existing = loadUser();
      if (existing && existing.email.toLowerCase() === cleanEmail.toLowerCase()) {
        setUser(existing);
        setData(loadUserData(existing.id));
        return { success: true };
      }

      const localUser: User = {
        id: 'usr_' + Date.now().toString(36),
        name: cleanEmail.split('@')[0] || 'Learner',
        email: cleanEmail,
        isGuest: false,
        createdAt: new Date().toISOString(),
      };
      setUser(localUser);
      saveUser(localUser);
      setData(loadUserData(localUser.id));
      return { success: true };
    },
    [isConfigured]
  );

  const signup = useCallback(
    async (name: string, email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
      const cleanName = name.trim() || 'Learner';
      const cleanEmail = email.trim();
      if (!cleanEmail) return { success: false, error: 'Email is required.' };

      // 1. Try Supabase Auth if configured and password supplied
      if (isConfigured && password && supabase?.auth?.signUp) {
        try {
          const { data: authResult, error: supaErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { name: cleanName },
            },
          });

          if (supaErr) {
            return { success: false, error: supaErr.message };
          }

          if (authResult?.user) {
            const mappedUser: User = {
              id: authResult.user.id,
              name: cleanName,
              email: authResult.user.email || cleanEmail,
              isGuest: false,
              createdAt: authResult.user.created_at,
            };
            setUser(mappedUser);
            saveUser(mappedUser);
            setData(loadUserData(mappedUser.id));
            return { success: true };
          }
        } catch (err: any) {
          return { success: false, error: err?.message || 'Registration failed.' };
        }
      }

      // 2. Local registration fallback
      const newUser: User = {
        id: 'usr_' + Date.now().toString(36),
        name: cleanName,
        email: cleanEmail,
        isGuest: false,
        createdAt: new Date().toISOString(),
      };
      setUser(newUser);
      saveUser(newUser);
      setData(loadUserData(newUser.id));
      return { success: true };
    },
    [isConfigured]
  );

  const loginAsGuest = useCallback(() => {
    const guestUser: User = {
      id: 'guest_' + Date.now().toString(36),
      name: 'Guest Scholar',
      email: 'guest@prepmind.local',
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
    setUser(guestUser);
    saveUser(guestUser);
    setData(loadUserData(guestUser.id));
  }, []);

  const logout = useCallback(async () => {
    if (isConfigured && supabase?.auth?.signOut) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[PrepMind] Sign out error:', err);
      }
    }
    setUser(null);
    clearUser();
    setData(defaultData);
  }, [isConfigured]);

  const setExamOverview = useCallback(
    (exam: string, overview: string) => {
      const recent = [exam, ...data.recentExams.filter((e) => e !== exam)].slice(0, 5);
      const next = { ...data, exam, overview, recentExams: recent };
      persistData(next);
    },
    [data, persistData]
  );

  const updateProgress = useCallback(
    (correct: boolean) => {
      const { total, correct: c } = data.progress;
      const next = {
        ...data,
        progress: {
          total: total + 1,
          correct: c + (correct ? 1 : 0),
        },
      };
      persistData(next);
    },
    [data, persistData]
  );

  const saveChatHistory = useCallback(
    (messages: AIMessage[]) => {
      const trimmed = messages.slice(-20);
      const next = { ...data, chatHistory: trimmed };
      persistData(next);
    },
    [data, persistData]
  );

  const addRecentExam = useCallback(
    (exam: string) => {
      if (!exam) return;
      const recent = [exam, ...data.recentExams.filter((e) => e !== exam)].slice(0, 5);
      const next = { ...data, recentExams: recent };
      persistData(next);
    },
    [data, persistData]
  );

  const value = useMemo(
    () => ({
      user,
      data,
      loading,
      isConfigured,
      login,
      signup,
      loginAsGuest,
      logout,
      setExamOverview,
      updateProgress,
      saveChatHistory,
      addRecentExam,
    }),
    [
      user,
      data,
      loading,
      isConfigured,
      login,
      signup,
      loginAsGuest,
      logout,
      setExamOverview,
      updateProgress,
      saveChatHistory,
      addRecentExam,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
