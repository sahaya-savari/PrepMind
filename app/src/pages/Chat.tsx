import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useExam } from '../context/ExamContext';
import {
  MessageSquare,
  Sparkles,
  Send,
  Square,
  RotateCcw,
  Download,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { askStream, ChatMessage } from '../api';

const STORAGE_KEY = 'prepmind_chat_v2';
const MAX_HISTORY = 15;

const STARTER_PROMPTS = [
  'Explain how the JavaScript event loop works with microtasks vs macrotasks',
  'What is the fundamental trade-off between optimistic and pessimistic concurrency?',
  'How does B-Tree indexing speed up relational database queries under the hood?',
  'Give me a 3-question conceptual drill on React rendering and reconciliation',
];

const renderMarkdownSafe = (text: string) => {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const lines = escape(text || '').split(/\r?\n/);
  let html = '';
  let listType = '';
  let inCode = false;

  const applyInline = (val: string) =>
    val
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  const closeList = () => {
    if (listType === 'ul') html += '</ul>';
    if (listType === 'ol') html += '</ol>';
    listType = '';
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith('```')) {
      if (inCode) {
        html += '</code></pre>';
        inCode = false;
      } else {
        closeList();
        inCode = true;
        html += '<pre><code>';
      }
      continue;
    }

    if (inCode) {
      html += `${raw}\n`;
      continue;
    }

    if (!line) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(6, heading[1].length);
      html += `<h${level}>${applyInline(heading[2])}</h${level}>`;
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (listType !== 'ul') {
        closeList();
        html += '<ul>';
        listType = 'ul';
      }
      html += `<li>${applyInline(bullet[1])}</li>`;
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      if (listType !== 'ol') {
        closeList();
        html += '<ol>';
        listType = 'ol';
      }
      html += `<li>${applyInline(numbered[1])}</li>`;
      continue;
    }

    closeList();
    html += `<p>${applyInline(line)}</p>`;
  }

  if (inCode) html += '</code></pre>';
  closeList();
  return html || '<p></p>';
};

function Chat() {
  const { exam } = useExam();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as ChatMessage[];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trimmed, setTrimmed] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');
  const cancelRef = useRef(false);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const trimHistory = (list: ChatMessage[]) => {
    if (list.length <= MAX_HISTORY) return list;
    setTrimmed(true);
    return list.slice(list.length - MAX_HISTORY);
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const handlePromptClick = (promptText: string) => {
    setInput(promptText);
    inputRef.current?.focus();
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    cancelRef.current = false;
    const userMsg: ChatMessage = { role: 'user', content };
    const next = trimHistory([...messages, userMsg]);
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');
    setLastPrompt(content);

    try {
      let acc = '';
      setMessages((prev) => trimHistory([...prev, { role: 'assistant', content: '...' }]));
      await askStream(content, 'chat', (chunk) => {
        if (cancelRef.current) return;
        acc += chunk;
        setMessages((prev) => {
          const merged = trimHistory([...prev]);
          const existing = merged[merged.length - 1];
          if (existing?.role === 'assistant') {
            merged[merged.length - 1] = { role: 'assistant', content: acc };
          } else {
            merged.push({ role: 'assistant', content: acc });
          }
          return merged;
        });
      });
    } catch (err: any) {
      setError(`AI service notice: ${err?.message || 'Failed to complete streaming response'}`);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.content === '...') {
          return prev.slice(0, prev.length - 1);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelStream = () => {
    cancelRef.current = true;
    setLoading(false);
    setError('Streaming stopped by user');
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
    setTrimmed(false);
  };

  const exportChat = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prepmind-study-chat.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const retryLast = () => {
    if (lastPrompt) {
      setInput(lastPrompt);
      setTimeout(() => {
        const form = document.getElementById('chat-form');
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }, 0);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-midnight-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-midnight-accentSoft border border-midnight-accent/30 text-midnight-accent">
              <Sparkles size={12} />
              <span>Socratic AI Study Tutor</span>
            </span>
            {exam && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-midnight-subtle text-ink-secondary border border-midnight-border">
                Target: {exam}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-ink-primary">
            Conceptual AI Tutor
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary">
            Multi-model study assistant powered by Groq, NVIDIA NIM, and Gemini cascade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportChat}
            disabled={!messages.length}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-midnight-subtle border border-midnight-border text-ink-secondary hover:text-ink-primary hover:bg-midnight-elevated transition-colors disabled:opacity-40"
            title="Export conversation as JSON"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={clearChat}
            disabled={loading || !messages.length}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-midnight-subtle border border-midnight-border text-ink-secondary hover:text-midnight-error hover:bg-midnight-elevated transition-colors disabled:opacity-40"
            title="Clear all messages"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="text-xs p-3 rounded-lg bg-midnight-warning/10 border border-midnight-warning/30 text-midnight-warning flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
          {lastPrompt && (
            <button
              onClick={retryLast}
              className="inline-flex items-center gap-1 underline font-semibold hover:text-ink-primary ml-2"
            >
              <RotateCcw size={12} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {trimmed && (
        <div className="text-xs text-midnight-warning bg-midnight-warning/10 border border-midnight-warning/20 p-2 rounded-lg">
          Conversation context optimized to the latest {MAX_HISTORY} messages for performance.
        </div>
      )}

      {/* Message History Container */}
      <div
        ref={chatRef}
        className="min-h-[420px] max-h-[62vh] overflow-y-auto p-4 sm:p-6 rounded-xl border border-midnight-border bg-midnight-surface shadow-card space-y-4"
      >
        {messages.length === 0 && (
          <div className="py-10 px-4 text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-xl bg-midnight-accentSoft border border-midnight-accent/30 flex items-center justify-center text-midnight-accent">
              <MessageSquare size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-semibold font-display text-ink-primary">
                What concept would you like to master today?
              </h2>
              <p className="text-xs sm:text-sm text-ink-secondary max-w-md mx-auto">
                Ask conceptual derivations, request step-by-step algorithmic proofs, or paste code to analyze.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 max-w-xl mx-auto pt-2 text-left">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptClick(prompt)}
                  className="p-3.5 rounded-lg border border-midnight-border bg-midnight-subtle hover:bg-midnight-elevated hover:border-midnight-accent/40 text-xs text-ink-secondary hover:text-ink-primary transition-all duration-150 text-left leading-relaxed flex items-center justify-between group outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent"
                >
                  <span className="line-clamp-2">{prompt}</span>
                  <span className="text-midnight-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1.5 font-bold">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[82%] px-4 py-3 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-midnight-accentSoft border-midnight-accent/35 text-ink-primary rounded-br-sm'
                    : 'bg-midnight-elevated border-midnight-border text-ink-primary rounded-bl-sm shadow-sm'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-midnight-border text-[11px] font-semibold text-midnight-accent">
                    <span className="w-1.5 h-1.5 rounded-full bg-midnight-positive" />
                    <span>PrepMind Tutor</span>
                  </div>
                )}

                {isUser ? (
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                ) : (
                  <div
                    className="markdown-safe prose-invert break-words"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(m.content) }}
                  />
                )}

                {idx === messages.length - 1 && !isUser && loading && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-midnight-accent animate-pulse align-middle" />
                )}
              </div>
            </motion.div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-midnight-subtle border border-midnight-border w-fit text-xs text-ink-secondary">
            <LoadingSpinner label="Formulating Socratic response" />
          </div>
        )}
      </div>

      {/* Input Composer */}
      <form
        id="chat-form"
        onSubmit={sendMessage}
        className="rounded-xl border border-midnight-border bg-midnight-surface p-4 shadow-card space-y-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              if (input.trim() && !loading) sendMessage(e as any);
            }
          }}
          className="w-full min-h-[88px] px-3.5 py-2.5 rounded-lg border border-midnight-border bg-midnight-subtle text-ink-primary placeholder:text-ink-muted focus:border-midnight-accent focus:outline-none focus:ring-1 focus:ring-midnight-accent text-xs sm:text-sm resize-none"
          placeholder="Ask a technical concept, syllabus topic, or derivation (Ctrl + Enter to send)..."
          aria-label="Ask study tutor"
          disabled={loading}
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-ink-muted hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-midnight-subtle border border-midnight-border font-mono text-[10px] text-ink-secondary">Ctrl + Enter</kbd> to send
          </span>
          <span className="text-[11px] text-ink-muted sm:hidden">
            Groq + NIM + Gemini
          </span>

          <div className="flex items-center gap-2">
            {loading && (
              <button
                type="button"
                onClick={cancelStream}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold bg-midnight-error/15 border border-midnight-error/30 text-midnight-error hover:bg-midnight-error/25 transition-colors"
              >
                <Square size={12} />
                <span>Stop</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold bg-ink-primary text-midnight-bg hover:bg-[#d1d4d9] transition-colors disabled:opacity-50"
            >
              <span>Send Message</span>
              <Send size={13} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Chat;
