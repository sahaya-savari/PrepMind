import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import { askStream, ChatMessage } from '../api';

const STORAGE_KEY = 'prepmind_chat_v2';
const MAX_HISTORY = 15;

const renderMarkdownSafe = (text: string) => {
  const escape = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const lines = escape(text || '').split(/\r?\n/);
  let html = '';
  let listType = '';
  let inCode = false;

  const applyInline = (val: string) => val
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

    if (!line) { closeList(); continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(6, heading[1].length);
      html += `<h${level}>${applyInline(heading[2])}</h${level}>`;
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
      html += `<li>${applyInline(bullet[1])}</li>`;
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
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
      setError(err?.message || 'Failed to send');
      setMessages((prev) => prev.filter((m) => m !== userMsg));
    } finally {
      setLoading(false);
    }
  };

  const cancelStream = () => {
    cancelRef.current = true;
    setLoading(false);
    setError('Cancelled (partial response kept)');
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
    a.download = 'chat.json';
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

  const renderAssistant = (text: string) => renderMarkdownSafe(text);

  return (
    <section className="space-y-5 py-6 text-white">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-white">Chat</h2>
          <p className="text-sm text-gray-300">Streaming, saved locally.</p>
        </div>
        <div className="flex gap-2">
          <button className="soft-button px-3 py-2" onClick={exportChat} disabled={!messages.length}>Export</button>
          <button className="soft-button px-3 py-2" onClick={clearChat} disabled={loading}>Clear</button>
        </div>
      </header>

      {error && <div className="text-sm text-red-400 flex items-center gap-3">{error} {lastPrompt && <button className="underline" onClick={retryLast}>Retry</button>}</div>}
      {trimmed && <div className="text-xs text-yellow-300">Context trimmed</div>}

      <div ref={chatRef} className="min-h-[420px] max-h-[60vh] overflow-y-auto p-4 rounded-xl bg-slate-900 border border-gray-800 shadow-lg space-y-3">
        {messages.length === 0 && <div className="text-sm text-gray-300">Ask anything to get started</div>}
        {messages.map((m, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`${m.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-800 border border-gray-800 text-white'} px-4 py-3 rounded-xl max-w-[90%] whitespace-pre-wrap break-words shadow-lg`}>
              {m.role === 'assistant'
                ? <div className="prose-invert markdown-safe" dangerouslySetInnerHTML={{ __html: renderAssistant(m.content) }} />
                : m.content}
              {idx === messages.length - 1 && m.role === 'assistant' && loading && <span className="blink ml-1">|</span>}
              {m.role === 'assistant' && <div className="text-[11px] text-gray-300 mt-2">General AI response</div>}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="space-y-2">
            <LoadingSpinner label="Thinking" />
            <div className="text-xs text-gray-300">Assistant is typing...</div>
          </div>
        )}
      </div>

      <form
        id="chat-form"
        onSubmit={sendMessage}
        className="flex flex-col gap-3 p-4 rounded-xl bg-slate-900 border border-gray-800 shadow-lg sticky bottom-20 md:static"
        autoComplete="off"
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
          className="w-full min-h-[90px] px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
          placeholder="Ask anything..."
          aria-label="Chat input"
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-300">Streaming enabled</span>
          <div className="flex items-center gap-2">
            {loading && <button type="button" className="soft-button px-3 py-2" onClick={cancelStream}>Cancel</button>}
            <button
              type="submit"
              className="soft-button px-4 py-2"
              disabled={loading || !input.trim()}
            >Send</button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default Chat;
