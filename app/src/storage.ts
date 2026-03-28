import { AIMessage } from './api';

export type User = {
  id: string;
  name: string;
  email: string;
};

export type UserData = {
  exam: string;
  overview: string;
  progress: {
    total: number;
    correct: number;
  };
  chatHistory: AIMessage[];
  notes: string[];
  recentExams: string[];
};

const USER_KEY = 'user';
const dataKey = (userId: string) => `prepmind_${userId}`;

const defaultData: UserData = {
  exam: '',
  overview: '',
  progress: { total: 0, correct: 0 },
  chatHistory: [],
  notes: [],
  recentExams: [],
};

export function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function loadUserData(userId: string): UserData {
  try {
    const raw = localStorage.getItem(dataKey(userId));
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw) as UserData;
    return {
      ...defaultData,
      ...parsed,
      progress: parsed.progress || defaultData.progress,
      chatHistory: parsed.chatHistory || [],
      notes: parsed.notes || [],
      recentExams: parsed.recentExams || [],
    };
  } catch {
    return { ...defaultData };
  }
}

export function saveUserData(userId: string, data: UserData) {
  localStorage.setItem(dataKey(userId), JSON.stringify(data));
}
