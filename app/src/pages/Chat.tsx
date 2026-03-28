import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import { askStream, ChatMessage } from '../api';

const STORAGE_KEY = 'prepmind_chat_v2';

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
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    const userMsg: ChatMessage = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');

    try {
      let acc = '';
      await askStream(content, 'chat', (chunk) => {
        acc += chunk;
        setMessages((prev) => {
          const merged = [...next];
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

  const clearChat = () => {
    setMessages([]);
    setError('');
  };

  return (
    <section className="space-y-5 py-6 text-white">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-white">Chat</h2>
          <p className="text-sm text-gray-300">Streaming, saved locally.</p>
        </div>
        <button className="soft-button px-3 py-2" onClick={clearChat} disabled={loading}>Clear</button>
      </header>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div ref={chatRef} className="min-h-[420px] max-h-[520px] overflow-y-auto p-4 rounded-xl bg-slate-900 border border-gray-800 shadow-lg space-y-3">
        {messages.length === 0 && <div className="text-sm text-gray-300">Start chatting.</div>}
        {messages.map((m, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`${m.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-800 border border-gray-800 text-white'} px-4 py-3 rounded-xl max-w-[90%] whitespace-pre-wrap break-words shadow-lg`}>
              {m.content}
              {idx === messages.length - 1 && m.role === 'assistant' && loading && <span className="blink ml-1">|</span>}
            </div>
          </motion.div>
        ))}
        {loading && <LoadingSpinner label="Thinking" />}
      </div>

      <form onSubmit={sendMessage} className="flex flex-col gap-3 p-4 rounded-xl bg-slate-900 border border-gray-800 shadow-lg">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full min-h-[90px] px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
          placeholder="Ask anything..."
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-300">Streaming enabled</span>
          <button type="submit" className="soft-button px-4 py-2" disabled={loading}>Send</button>
        </div>
      </form>
    </section>
  );
}

export default Chat;
