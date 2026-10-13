import React, { useState, useEffect } from 'react';
import {
  SUPPORTED_PROVIDERS,
  ByokProvider,
  ByokConfig,
  getByokConfig,
  setByokConfig,
  clearByokConfig,
  testByokConnection,
} from '../lib/byok';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Cpu,
  Trash2,
  Shield,
  Zap,
} from 'lucide-react';

export default function ByokSettings() {
  const current = getByokConfig();

  const [provider, setProvider] = useState<ByokProvider>(current?.provider || 'groq');
  const [model, setModel] = useState<string>(
    current?.model || SUPPORTED_PROVIDERS.find((p) => p.id === 'groq')?.defaultModel || ''
  );
  const [apiKey, setApiKey] = useState<string>(current?.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const activeProviderMeta = SUPPORTED_PROVIDERS.find((p) => p.id === provider) || SUPPORTED_PROVIDERS[0];

  useEffect(() => {
    // If provider changes and current model isn't in new provider's list, reset to default
    if (!activeProviderMeta.models.includes(model)) {
      setModel(activeProviderMeta.defaultModel);
    }
  }, [provider, activeProviderMeta, model]);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key before testing.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testByokConnection({
        provider,
        apiKey: apiKey.trim(),
        model,
      });
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      clearByokConfig();
      setSaveFeedback('BYOK cleared. Reverted to platform default orchestration.');
      setTimeout(() => setSaveFeedback(null), 3000);
      return;
    }

    setByokConfig({
      provider,
      apiKey: apiKey.trim(),
      model,
    });
    setSaveFeedback(`Saved ${activeProviderMeta.name} key in session memory!`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleClear = () => {
    clearByokConfig();
    setApiKey('');
    setTestResult(null);
    setSaveFeedback('BYOK removed. Reverted to platform default cascade.');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const isConfigured = Boolean(current?.apiKey);

  return (
    <div className="p-5 sm:p-7 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Key className="w-4 h-4 text-[var(--accent)]" />
            <span>AI Provider & Bring Your Own Key (BYOK)</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Use your personal Groq, NVIDIA NIM, or Google Gemini credentials with zero rate-limit sharing.
          </p>
        </div>

        {isConfigured ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>BYOK Active: {current?.provider}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-muted)] self-start sm:self-auto">
            <Cpu className="w-3 h-3 text-[var(--accent)]" />
            <span>Platform Default Cascade</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Provider Radio Tabs */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
            Select AI Provider
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SUPPORTED_PROVIDERS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProvider(p.id);
                    setModel(p.defaultModel);
                    setTestResult(null);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]/40 shadow-sm'
                      : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[var(--text-primary)]">{p.name}</span>
                    {active && <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-tight">{p.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
            Model Selection ({activeProviderMeta.name})
          </label>
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setTestResult(null);
            }}
            className="w-full px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          >
            {activeProviderMeta.models.map((m) => (
              <option key={m} value={m}>
                {m} {m === activeProviderMeta.defaultModel ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* API Key Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              API Key ({activeProviderMeta.name})
            </label>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              Transient session memory only
            </span>
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder={`Enter your ${activeProviderMeta.name} API key (${activeProviderMeta.placeholder})`}
              className="w-full pl-3.5 pr-20 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title={showKey ? 'Hide Key' : 'Show Key'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <span className="leading-snug">{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !apiKey.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--accent)] text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>

            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs transition-colors cursor-pointer"
                title="Remove personal API key"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Key</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm ml-auto"
          >
            <span>Save in Session</span>
          </button>
        </div>

        {saveFeedback && (
          <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
        )}
      </form>

      {/* Security & Privacy Notice */}
      <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[11px] text-[var(--text-muted)] space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--text-secondary)]">
          <Shield className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Security & Non-Persistent Credential Boundary</span>
        </div>
        <p className="leading-relaxed">
          Your API key is never stored in server databases or written to disk. It resides exclusively in active session memory, transmitted strictly over encrypted HTTPS to the backend proxy for your requests, and discarded. Unconfigured requests fall back to the platform default cascade or offline question bank.
        </p>
      </div>
    </div>
  );
}
