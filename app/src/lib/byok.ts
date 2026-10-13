// PrepMind AI — Bring Your Own Key (BYOK) Client Store & Interceptor
// Manages transient in-memory and session-scoped AI provider credentials.
// Zero plain-text persistence on servers or database.

export type ByokProvider = 'groq' | 'nvidia' | 'gemini';

export interface ByokConfig {
  provider: ByokProvider;
  apiKey: string;
  model: string;
}

export interface ProviderOption {
  id: ByokProvider;
  name: string;
  description: string;
  models: string[];
  defaultModel: string;
  placeholder: string;
}

export const SUPPORTED_PROVIDERS: ProviderOption[] = [
  {
    id: 'groq',
    name: 'Groq Cloud',
    description: 'Ultra-fast LPU inference (~300ms) for high-speed drilling.',
    models: [
      'openai/gpt-oss-120b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ],
    defaultModel: 'openai/gpt-oss-120b',
    placeholder: 'gsk_...',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    description: 'High-performance accelerated AI inference (~700ms).',
    models: [
      'nvidia/nemotron-3.5-lightning-30b-a3b',
      'meta/llama-3.1-70b-instruct',
    ],
    defaultModel: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    placeholder: 'nvapi-...',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Multimodal reasoning and deep Socratic tutoring (~1.2s).',
    models: [
      'models/gemini-2.5-flash',
      'models/gemini-1.5-flash',
    ],
    defaultModel: 'models/gemini-2.5-flash',
    placeholder: 'AIzaSy...',
  },
];

const BYOK_SESSION_KEY = 'prepmind_byok_session_v1';

// Transient in-memory reference
let inMemoryConfig: ByokConfig | null = null;

// Initialize from sessionStorage if present in active browser tab
function initFromSession(): ByokConfig | null {
  if (inMemoryConfig) return inMemoryConfig;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(BYOK_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.apiKey && parsed?.provider) {
          inMemoryConfig = parsed;
          return inMemoryConfig;
        }
      }
    }
  } catch {
    // sessionStorage disabled or restricted
  }
  return null;
}

export function getByokConfig(): ByokConfig | null {
  return inMemoryConfig || initFromSession();
}

export function setByokConfig(config: ByokConfig | null): void {
  inMemoryConfig = config;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (config) {
        window.sessionStorage.setItem(BYOK_SESSION_KEY, JSON.stringify(config));
      } else {
        window.sessionStorage.removeItem(BYOK_SESSION_KEY);
      }
    }
  } catch {
    // quota or access restriction safeguard
  }
}

export function clearByokConfig(): void {
  setByokConfig(null);
}

export function hasByokConfig(): boolean {
  const cfg = getByokConfig();
  return Boolean(cfg?.apiKey && cfg.apiKey.trim().length > 0);
}

export function getByokHeaders(): Record<string, string> {
  const cfg = getByokConfig();
  if (!cfg || !cfg.apiKey) return {};
  return {
    'x-byok-provider': cfg.provider,
    'x-byok-api-key': cfg.apiKey.trim(),
    'x-byok-model': cfg.model || '',
  };
}

// Transparent fetch interceptor attaching BYOK headers to /api/ai and /api/rag calls
if (typeof window !== 'undefined' && window.fetch && !(window as any).__prepmind_byok_interceptor_installed) {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const urlStr = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    if (urlStr.includes('/api/ai') || urlStr.includes('/api/rag')) {
      const byokHeaders = getByokHeaders();
      if (Object.keys(byokHeaders).length > 0) {
        init = init || {};
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : {}));
        Object.entries(byokHeaders).forEach(([k, v]) => {
          if (!headers.has(k)) headers.set(k, v);
        });
        init.headers = headers;
      }
    }
    return originalFetch(input, init);
  };
  (window as any).__prepmind_byok_interceptor_installed = true;
}

export async function testByokConnection(config: ByokConfig): Promise<{ success: boolean; message: string }> {
  if (!config.apiKey || !config.apiKey.trim()) {
    return { success: false, message: 'Please enter a valid API key.' };
  }

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-byok-provider': config.provider,
        'x-byok-api-key': config.apiKey.trim(),
        'x-byok-model': config.model,
      },
      body: JSON.stringify({
        action: 'test_connection',
        byok: {
          provider: config.provider,
          apiKey: config.apiKey.trim(),
          model: config.model,
        },
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.status === 'ok') {
      return {
        success: true,
        message: data.message || `Connected successfully to ${config.provider} (${config.model})!`,
      };
    }

    return {
      success: false,
      message: data?.error || `Connection test failed with HTTP ${res.status}. Check key and permissions.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error while contacting AI proxy endpoint.',
    };
  }
}
